import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const EXTEND_COST = 300; // 延長のコイン消費量

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const { episode_id, prompt } = await request.json();

    if (!episode_id) {
      return NextResponse.json(
        { error: "episode_id が必要です" },
        { status: 400 }
      );
    }

    // エピソード取得＋所有者確認
    const { data: episode } = await supabase
      .from("episodes")
      .select("*, drama:dramas(id, creator_id)")
      .eq("id", episode_id)
      .single();

    if (!episode) {
      return NextResponse.json(
        { error: "エピソードが見つかりません" },
        { status: 404 }
      );
    }

    if (episode.drama?.creator_id !== user.id) {
      return NextResponse.json(
        { error: "このエピソードの所有者ではありません" },
        { status: 403 }
      );
    }

    if (!episode.piapi_task_id) {
      return NextResponse.json(
        { error: "このエピソードにはPiAPIタスクIDがありません。延長には元の動画生成タスクIDが必要です。" },
        { status: 400 }
      );
    }

    // コイン残高確認
    const { data: profile } = await supabase
      .from("profiles")
      .select("coin_balance")
      .eq("id", user.id)
      .single();

    if (!profile || profile.coin_balance < EXTEND_COST) {
      return NextResponse.json(
        { error: `コインが不足しています（必要: ${EXTEND_COST}コイン、残高: ${profile?.coin_balance || 0}コイン）` },
        { status: 400 }
      );
    }

    // PiAPI Extend API呼び出し
    const extendPrompt = prompt || episode.description || "Continue the scene naturally.";

    let taskId: string | null = null;
    let piApiError: string | null = null;

    try {
      const piRes = await fetch("https://api.piapi.ai/api/v1/task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.PIAPI_API_KEY || "",
        },
        body: JSON.stringify({
          model: "kling",
          task_type: "video_extend",
          input: {
            task_id: episode.piapi_task_id,
            prompt: extendPrompt,
            cfg_scale: 0.5,
          },
        }),
      });

      const piData = await piRes.json();

      if (piData.code === 200 && piData.data?.task_id) {
        taskId = piData.data.task_id;
      } else {
        const rawMsg = piData.data?.error?.raw_message || piData.message || "";
        if (rawMsg.includes("not enough")) {
          piApiError = "PiAPIのクレジットが不足しています。";
        } else {
          piApiError = `動画延長サービスでエラーが発生しました: ${piData.message || "不明なエラー"}`;
        }
        console.error("PiAPI extend error:", piData);
      }
    } catch (err) {
      console.error("PiAPI extend request error:", err);
      piApiError = "動画延長サービスに接続できませんでした。";
    }

    if (!taskId) {
      return NextResponse.json(
        { error: piApiError || "動画延長タスクの作成に失敗しました" },
        { status: 502 }
      );
    }

    // コイン消費
    const newBalance = profile.coin_balance - EXTEND_COST;
    await supabase
      .from("profiles")
      .update({ coin_balance: newBalance })
      .eq("id", user.id);

    // 取引履歴
    await supabase.from("transactions").insert({
      user_id: user.id,
      type: "generate",
      amount: -EXTEND_COST,
      balance_after: newBalance,
      reference_id: episode.drama_id,
      description: `動画延長: ${episode.title}`,
    });

    return NextResponse.json({
      task_id: taskId,
      episode_id: episode.id,
      balance: newBalance,
    });
  } catch (error) {
    console.error("Extend error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
