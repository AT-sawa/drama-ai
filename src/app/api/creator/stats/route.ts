import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // クリエイターの全ドラマの総視聴数
    const { data: dramas } = await supabase
      .from("dramas")
      .select("total_views")
      .eq("creator_id", user.id);

    const totalViews =
      dramas?.reduce((sum, d) => sum + (d.total_views || 0), 0) || 0;

    // 収益合計（revenueタイプの取引合計）
    const { data: revenues } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("type", "revenue");

    const totalRevenue =
      revenues?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;

    return NextResponse.json({ totalViews, totalRevenue });
  } catch (error) {
    console.error("Creator stats error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
