import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { episode_id } = await request.json();

    if (!episode_id) {
      return NextResponse.json(
        { error: "エピソードIDが必要です" },
        { status: 400 }
      );
    }

    // エピソード取得
    const { data: episode } = await supabase
      .from("episodes")
      .select("*")
      .eq("id", episode_id)
      .single();

    if (!episode) {
      return NextResponse.json(
        { error: "エピソードが見つかりません" },
        { status: 404 }
      );
    }

    // 無料エピソードの場合
    if (episode.is_free || episode.coin_price === 0) {
      // 視聴記録だけ追加
      await supabase
        .from("views")
        .upsert({ user_id: user.id, episode_id, coin_spent: 0 });

      const { data: profile } = await supabase
        .from("profiles")
        .select("coin_balance")
        .eq("id", user.id)
        .single();

      return NextResponse.json({ balance: profile?.coin_balance || 0 });
    }

    // コイン消費（DB関数で安全に処理）
    const { data: success, error } = await supabase.rpc("consume_coins", {
      p_user_id: user.id,
      p_episode_id: episode_id,
      p_amount: episode.coin_price,
    });

    if (error) {
      console.error("Consume coins error:", error);
      return NextResponse.json(
        { error: "コイン消費処理に失敗しました" },
        { status: 500 }
      );
    }

    if (!success) {
      return NextResponse.json(
        { error: "コインが不足しています" },
        { status: 400 }
      );
    }

    // 更新後の残高取得
    const { data: profile } = await supabase
      .from("profiles")
      .select("coin_balance")
      .eq("id", user.id)
      .single();

    return NextResponse.json({ balance: profile?.coin_balance || 0 });
  } catch (error) {
    console.error("Watch error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
