import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 通報API
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const { target_type, target_id, reason, detail } = await request.json();

    // バリデーション
    if (!target_type || !target_id || !reason) {
      return NextResponse.json(
        { error: "必須項目が不足しています" },
        { status: 400 }
      );
    }

    const validTypes = ["drama", "episode", "comment", "user"];
    const validReasons = [
      "inappropriate",
      "copyright",
      "spam",
      "harassment",
      "misinformation",
      "other",
    ];

    if (!validTypes.includes(target_type)) {
      return NextResponse.json({ error: "無効な通報対象です" }, { status: 400 });
    }
    if (!validReasons.includes(reason)) {
      return NextResponse.json({ error: "無効な通報理由です" }, { status: 400 });
    }

    // 重複通報チェック
    const { data: existing } = await supabase
      .from("reports")
      .select("id")
      .eq("reporter_id", user.id)
      .eq("target_type", target_type)
      .eq("target_id", target_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "この対象は既に通報済みです" },
        { status: 409 }
      );
    }

    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type,
      target_id,
      reason,
      detail: (detail || "").slice(0, 500),
    });

    if (error) {
      console.error("Report error:", error);
      return NextResponse.json(
        { error: "通報の送信に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "通報を受け付けました" });
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json(
      { error: "通報の送信に失敗しました" },
      { status: 500 }
    );
  }
}
