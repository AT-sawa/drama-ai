import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// 振込申請一覧取得
export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  // 収益残高の計算
  // revenue（クリエイター収益）の合計 - 申請済み合計
  const { data: revenues } = await supabase
    .from("transactions")
    .select("amount")
    .eq("user_id", user.id)
    .eq("type", "revenue");

  const totalRevenue =
    revenues?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;

  // 振込申請済み合計（pendingとapprovedのもの）
  const { data: payouts } = await supabase
    .from("payout_requests")
    .select("amount, status")
    .eq("user_id", user.id)
    .in("status", ["pending", "approved", "completed"]);

  const totalPaidOut =
    payouts?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  const availableBalance = totalRevenue - totalPaidOut;

  // 申請履歴取得
  const { data: requests } = await supabase
    .from("payout_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    totalRevenue,
    totalPaidOut,
    availableBalance,
    requests: requests || [],
  });
}

// 振込申請作成
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const body = await request.json();
  const { amount, bank_name, branch_name, account_type, account_number, account_holder } = body;

  // バリデーション
  if (!amount || amount < 1000) {
    return NextResponse.json(
      { error: "振込申請は1,000コイン以上から可能です" },
      { status: 400 }
    );
  }

  if (!bank_name || !branch_name || !account_type || !account_number || !account_holder) {
    return NextResponse.json(
      { error: "振込先情報をすべて入力してください" },
      { status: 400 }
    );
  }

  // 残高確認
  const { data: revenues } = await supabase
    .from("transactions")
    .select("amount")
    .eq("user_id", user.id)
    .eq("type", "revenue");

  const totalRevenue =
    revenues?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;

  const { data: payouts } = await supabase
    .from("payout_requests")
    .select("amount")
    .eq("user_id", user.id)
    .in("status", ["pending", "approved", "completed"]);

  const totalPaidOut =
    payouts?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  const availableBalance = totalRevenue - totalPaidOut;

  if (amount > availableBalance) {
    return NextResponse.json(
      { error: "残高が不足しています" },
      { status: 400 }
    );
  }

  // pending状態の申請がないか確認
  const { data: pendingRequest } = await supabase
    .from("payout_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .single();

  if (pendingRequest) {
    return NextResponse.json(
      { error: "処理中の振込申請があります。完了後に再度お申し込みください" },
      { status: 400 }
    );
  }

  // 振込申請作成
  const { data: newRequest, error } = await supabase
    .from("payout_requests")
    .insert({
      user_id: user.id,
      amount,
      bank_name,
      branch_name,
      account_type,
      account_number,
      account_holder,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    // ユニーク制約違反 = 既にpending申請がある
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "処理中の振込申請があります。完了後に再度お申し込みください" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ request: newRequest }, { status: 201 });
}
