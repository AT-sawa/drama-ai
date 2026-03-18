import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 振込申請一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未認証" }, { status: 401 });
    }

    const admin = createServiceRoleClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    let query = admin
      .from("payout_requests")
      .select("*, user:profiles(id, display_name, email)");

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data: payouts } = await query
      .order("created_at", { ascending: false });

    return NextResponse.json({ payouts: payouts || [] });
  } catch (error) {
    console.error("Admin payouts error:", error);
    return NextResponse.json({ error: "振込申請取得に失敗しました" }, { status: 500 });
  }
}

// 振込申請ステータス更新
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未認証" }, { status: 401 });
    }

    const admin = createServiceRoleClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const body = await request.json();
    const { payoutId, status, adminNote } = body;

    if (!payoutId || !status) {
      return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });
    }

    const validStatuses = ["approved", "completed", "rejected"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "無効なステータス" }, { status: 400 });
    }

    const updateData: Record<string, any> = {
      status,
      processed_at: new Date().toISOString(),
    };
    if (adminNote) updateData.admin_note = adminNote;

    const { error } = await admin
      .from("payout_requests")
      .update(updateData)
      .eq("id", payoutId);

    if (error) throw error;

    // 通知を送信
    const { data: payout } = await admin
      .from("payout_requests")
      .select("user_id, amount")
      .eq("id", payoutId)
      .single();

    if (payout) {
      const statusLabels: Record<string, string> = {
        approved: "承認",
        completed: "振込完了",
        rejected: "却下",
      };
      await admin.from("notifications").insert({
        user_id: payout.user_id,
        type: "system",
        title: `振込申請が${statusLabels[status]}されました`,
        message: `${payout.amount.toLocaleString("en-US")}コインの振込申請が${statusLabels[status]}されました。${adminNote ? `\n管理者メモ: ${adminNote}` : ""}`,
        link: "/creator/payout",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin payout update error:", error);
    return NextResponse.json({ error: "振込申請更新に失敗しました" }, { status: 500 });
  }
}
