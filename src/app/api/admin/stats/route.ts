import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未認証" }, { status: 401 });
    }

    const admin = createServiceRoleClient();

    // 管理者チェック
    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    // 各種統計を並行取得
    const [
      usersResult,
      dramasResult,
      episodesResult,
      viewsResult,
      purchasesResult,
      payoutsResult,
      recentUsersResult,
    ] = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("dramas").select("id", { count: "exact", head: true }),
      admin.from("episodes").select("id", { count: "exact", head: true }),
      admin.from("views").select("id", { count: "exact", head: true }),
      admin.from("transactions").select("amount").eq("type", "purchase"),
      admin.from("payout_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("profiles").select("id, email, display_name, is_creator, created_at").order("created_at", { ascending: false }).limit(5),
    ]);

    // 総売上計算
    const totalRevenue = (purchasesResult.data || []).reduce((sum, t) => sum + t.amount, 0);

    return NextResponse.json({
      totalUsers: usersResult.count || 0,
      totalDramas: dramasResult.count || 0,
      totalEpisodes: episodesResult.count || 0,
      totalViews: viewsResult.count || 0,
      totalRevenue,
      pendingPayouts: payoutsResult.count || 0,
      recentUsers: recentUsersResult.data || [],
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "統計取得に失敗しました" }, { status: 500 });
  }
}
