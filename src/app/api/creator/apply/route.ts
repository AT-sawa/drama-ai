import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// クリエイター申請API
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    // 既にクリエイターか確認
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_creator, creator_status")
      .eq("id", user.id)
      .single();

    if (profile?.is_creator) {
      return NextResponse.json({ error: "既にクリエイターです" }, { status: 400 });
    }

    if (profile?.creator_status === "pending") {
      return NextResponse.json({ error: "申請は審査中です" }, { status: 400 });
    }

    const { motivation } = await request.json();

    if (!motivation || motivation.trim().length < 10) {
      return NextResponse.json(
        { error: "申請理由を10文字以上で入力してください" },
        { status: 400 }
      );
    }

    // 申請ステータスを更新
    const { error } = await supabase
      .from("profiles")
      .update({
        creator_status: "pending",
        creator_motivation: motivation.slice(0, 500),
      })
      .eq("id", user.id);

    if (error) {
      console.error("Creator apply error:", error);
      return NextResponse.json(
        { error: "申請の送信に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "クリエイター申請を受け付けました" });
  } catch (error) {
    console.error("Creator apply error:", error);
    return NextResponse.json(
      { error: "申請の送信に失敗しました" },
      { status: 500 }
    );
  }
}
