import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

// コメント一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  // コメント数取得
  const { count } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("drama_id", params.id);

  // コメント取得（プロフィール情報付き）
  const { data: comments, error } = await supabase
    .from("comments")
    .select("*, user:profiles(id, display_name, avatar_url)")
    .eq("drama_id", params.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    comments: comments || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

// コメント投稿
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  // レートリミット: 1分あたり10回まで
  const rl = rateLimit(getRateLimitKey(request, "comment", user.id), { windowMs: 60_000, max: 10 });
  if (!rl.success) {
    return NextResponse.json({ error: "コメント投稿が多すぎます。しばらくお待ちください。" }, { status: 429 });
  }

  const body = await request.json();
  const { content, rating } = body;

  // バリデーション
  if (!content || content.trim().length === 0) {
    return NextResponse.json({ error: "コメントを入力してください" }, { status: 400 });
  }
  if (content.trim().length > 500) {
    return NextResponse.json({ error: "コメントは500文字以内で入力してください" }, { status: 400 });
  }
  if (rating !== undefined && rating !== null && (rating < 1 || rating > 5)) {
    return NextResponse.json({ error: "評価は1〜5の間で入力してください" }, { status: 400 });
  }

  // ドラマ存在確認
  const { data: drama } = await supabase
    .from("dramas")
    .select("id, title, creator_id")
    .eq("id", params.id)
    .eq("is_published", true)
    .single();

  if (!drama) {
    return NextResponse.json({ error: "作品が見つかりません" }, { status: 404 });
  }

  // コメント投稿
  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      user_id: user.id,
      drama_id: params.id,
      content: content.trim(),
      rating: rating || null,
    })
    .select("*, user:profiles(id, display_name, avatar_url)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 作者に通知（自分自身へのコメントは通知しない）
  if (drama.creator_id && drama.creator_id !== user.id) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();
      const serviceClient = createServiceRoleClient();
      await serviceClient.from("notifications").insert({
        user_id: drama.creator_id,
        type: "comment",
        title: "コメントが投稿されました",
        message: `${profile?.display_name || "ユーザー"}さんが「${drama.title}」にコメントしました`,
        link: `/drama/${params.id}`,
      });
    } catch {
      // 通知失敗してもコメント自体は成功扱い
    }
  }

  return NextResponse.json({ comment }, { status: 201 });
}

// コメント削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const commentId = searchParams.get("commentId");
  if (!commentId) {
    return NextResponse.json({ error: "コメントIDが必要です" }, { status: 400 });
  }

  // 自分のコメントのみ削除可能
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
