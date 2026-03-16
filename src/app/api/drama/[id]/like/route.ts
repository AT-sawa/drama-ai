import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const dramaId = params.id;

    // いいね数を取得
    const { count } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("drama_id", dramaId);

    // ログインユーザーのいいね状態を確認
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let isLiked = false;
    if (user) {
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("drama_id", dramaId)
        .single();
      isLiked = !!data;
    }

    return NextResponse.json({
      likes_count: count || 0,
      is_liked: isLiked,
    });
  } catch (error) {
    console.error("Get likes error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const dramaId = params.id;

    // ドラマが存在するか確認
    const { data: drama } = await supabase
      .from("dramas")
      .select("id")
      .eq("id", dramaId)
      .eq("is_published", true)
      .single();

    if (!drama) {
      return NextResponse.json(
        { error: "ドラマが見つかりません" },
        { status: 404 }
      );
    }

    // 既存のいいねを確認
    const { data: existingLike } = await supabase
      .from("likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("drama_id", dramaId)
      .single();

    if (existingLike) {
      // いいね解除
      await supabase.from("likes").delete().eq("id", existingLike.id);

      // likes_count をデクリメント
      await supabase.rpc("decrement_likes_count", { p_drama_id: dramaId });

      const { count } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("drama_id", dramaId);

      return NextResponse.json({
        is_liked: false,
        likes_count: count || 0,
      });
    } else {
      // いいね追加
      await supabase
        .from("likes")
        .insert({ user_id: user.id, drama_id: dramaId });

      // likes_count をインクリメント
      await supabase.rpc("increment_likes_count", { p_drama_id: dramaId });

      const { count } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("drama_id", dramaId);

      return NextResponse.json({
        is_liked: true,
        likes_count: count || 0,
      });
    }
  } catch (error) {
    console.error("Toggle like error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
