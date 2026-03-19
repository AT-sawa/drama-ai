import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// メール通知送信API（内部呼び出し用）
// Supabaseのauth.adminを使ってメール送信
export async function POST(request: NextRequest) {
  try {
    // 内部APIキーで認証
    const authHeader = request.headers.get("x-internal-key");
    if (authHeader !== process.env.INTERNAL_API_KEY && authHeader !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { to, subject, html } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Supabase Edge Functions or Resendなどの外部サービスを使用
    // ここではSupabaseのメール機能を利用（制限あり）
    // 本番環境ではResend/SendGrid等の導入を推奨

    // 現時点ではin-app通知で対応し、メール通知は設定画面のみ用意
    return NextResponse.json({
      success: true,
      message: "Notification queued (in-app only for now)",
    });
  } catch (error) {
    console.error("Email notify error:", error);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
