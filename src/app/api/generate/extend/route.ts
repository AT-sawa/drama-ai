import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const EXTEND_COST_AI = 300;     // AI生成動画の延長コスト
const EXTEND_COST_UPLOAD = 0;   // アップロード動画の延長コスト（テスト中は無料）

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    if (!process.env.PIAPI_API_KEY) {
      return NextResponse.json(
        { error: "動画延長サービスが設定されていません" },
        { status: 503 }
      );
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

    // ソースに応じてコスト決定
    const isUpload = episode.source === "upload";
    const extendCost = isUpload ? EXTEND_COST_UPLOAD : EXTEND_COST_AI;

    // AI生成動画はpiapi_task_idが必要、アップロード動画はvideo_urlが必要
    if (!isUpload && !episode.piapi_task_id) {
      return NextResponse.json(
        { error: "このエピソードにはPiAPIタスクIDがありません。延長できません。" },
        { status: 400 }
      );
    }

    if (isUpload && !episode.video_url) {
      return NextResponse.json(
        { error: "動画URLが見つかりません。" },
        { status: 400 }
      );
    }

    // コイン残高確認（コストが0の場合はスキップ）
    const { data: profile } = await supabase
      .from("profiles")
      .select("coin_balance")
      .eq("id", user.id)
      .single();

    if (extendCost > 0) {
      if (!profile || profile.coin_balance < extendCost) {
        return NextResponse.json(
          { error: `コインが不足しています（必要: ${extendCost}コイン、残高: ${profile?.coin_balance || 0}コイン）` },
          { status: 400 }
        );
      }
    }

    // PiAPI Extend API呼び出し
    const extendPrompt = prompt || episode.description || "Continue the scene naturally.";

    let taskId: string | null = null;
    let piApiError: string | null = null;

    try {
      // リクエストボディをソースに応じて構築
      let requestBody: Record<string, unknown>;

      if (isUpload) {
        // アップロード動画: video_urlを使ってimage-to-video的に延長
        requestBody = {
          model: "kling",
          task_type: "video_extend",
          input: {
            video_url: episode.video_url,
            prompt: extendPrompt,
            cfg_scale: 0.5,
          },
        };
      } else {
        // AI生成動画: task_idを使って延長
        requestBody = {
          model: "kling",
          task_type: "video_extend",
          input: {
            task_id: episode.piapi_task_id,
            prompt: extendPrompt,
            cfg_scale: 0.5,
          },
        };
      }

      const piRes = await fetch("https://api.piapi.ai/api/v1/task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.PIAPI_API_KEY ?? "",
        },
        body: JSON.stringify(requestBody),
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

    // コイン消費（コストが0より大きい場合のみ）
    let newBalance = profile?.coin_balance || 0;
    if (extendCost > 0) {
      newBalance = (profile?.coin_balance || 0) - extendCost;
      await supabase
        .from("profiles")
        .update({ coin_balance: newBalance })
        .eq("id", user.id);

      await supabase.from("transactions").insert({
        user_id: user.id,
        type: "generate",
        amount: -extendCost,
        balance_after: newBalance,
        reference_id: episode.drama_id,
        description: `動画延長: ${episode.title}`,
      });
    }

    // 延長タスクIDをエピソードに保存（ステータスポーリング用）
    await supabase
      .from("episodes")
      .update({ piapi_task_id: taskId })
      .eq("id", episode.id);

    return NextResponse.json({
      task_id: taskId,
      episode_id: episode.id,
      balance: newBalance,
      cost: extendCost,
    });
  } catch (error) {
    console.error("Extend error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
