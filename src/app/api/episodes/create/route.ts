import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function createStorageClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 動画アップロードによるエピソード作成
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    // クリエイター確認
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_creator")
      .eq("id", user.id)
      .single();

    if (!profile?.is_creator) {
      return NextResponse.json(
        { error: "クリエイター権限が必要です" },
        { status: 403 }
      );
    }

    const { drama_id, title, description, coin_price, video_path } =
      await request.json();

    // バリデーション
    if (!drama_id || !title || !video_path) {
      return NextResponse.json(
        { error: "ドラマID、タイトル、動画パスが必要です" },
        { status: 400 }
      );
    }

    if (coin_price !== undefined && (coin_price < 0 || coin_price > 10000)) {
      return NextResponse.json(
        { error: "視聴価格は0〜10,000コインの範囲で設定してください" },
        { status: 400 }
      );
    }

    // ドラマ所有者確認
    const { data: drama } = await supabase
      .from("dramas")
      .select("id, creator_id")
      .eq("id", drama_id)
      .eq("creator_id", user.id)
      .single();

    if (!drama) {
      return NextResponse.json(
        { error: "ドラマが見つかりません" },
        { status: 404 }
      );
    }

    // 次のエピソード番号を計算
    const { count } = await supabase
      .from("episodes")
      .select("id", { count: "exact", head: true })
      .eq("drama_id", drama_id);

    const episodeNumber = (count || 0) + 1;

    // 動画の公開URL取得
    const storageClient = createStorageClient();
    const { data: urlData } = storageClient.storage
      .from("videos")
      .getPublicUrl(video_path);

    // エピソード作成
    const { data: episode, error: epError } = await supabase
      .from("episodes")
      .insert({
        drama_id,
        episode_number: episodeNumber,
        title,
        description: description || "",
        video_url: urlData.publicUrl,
        coin_price: coin_price ?? 100,
        is_free: (coin_price ?? 100) === 0,
        is_published: true,
        source: "upload",
      })
      .select()
      .single();

    if (epError) {
      console.error("Episode creation error:", epError);
      return NextResponse.json(
        { error: "エピソードの作成に失敗しました" },
        { status: 500 }
      );
    }

    // ドラマのエピソード数を更新
    const { count: epCount } = await supabase
      .from("episodes")
      .select("id", { count: "exact", head: true })
      .eq("drama_id", drama_id)
      .eq("is_published", true);

    await supabase
      .from("dramas")
      .update({ total_episodes: epCount || 0 })
      .eq("id", drama_id);

    return NextResponse.json({ episode });
  } catch (error) {
    console.error("Episode create error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
