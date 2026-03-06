import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GENERATE_COST } from "@/lib/types";

/**
 * プロンプトを強化して、Kling AIがより正確に動画を生成できるようにする
 * - カメラワーク、照明、スタイル指示を補足
 * - 日本語でも英語でも対応
 */
function enhancePrompt(userPrompt: string): string {
  // ユーザーのプロンプトにカメラワークや映像スタイルの指示がない場合は補足
  const hasCamera = /カメラ|camera|tracking|pan|zoom|dolly|close.?up|wide.?shot/i.test(userPrompt);
  const hasStyle = /cinematic|映画|リアル|realistic|4k|高品質|high.?quality|photorealistic/i.test(userPrompt);
  const hasLighting = /照明|光|lighting|sunset|sunrise|夕暮れ|朝日|ネオン|neon/i.test(userPrompt);

  let enhanced = userPrompt;

  // 映像品質の指示を追加
  const qualitySuffix: string[] = [];
  if (!hasStyle) {
    qualitySuffix.push("cinematic, high quality, photorealistic");
  }
  if (!hasCamera) {
    qualitySuffix.push("smooth camera movement");
  }
  if (!hasLighting) {
    qualitySuffix.push("natural lighting");
  }

  if (qualitySuffix.length > 0) {
    enhanced = `${enhanced}. ${qualitySuffix.join(", ")}`;
  }

  return enhanced;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // クリエイター確認
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile?.is_creator) {
      return NextResponse.json(
        { error: "クリエイター権限が必要です" },
        { status: 403 }
      );
    }

    if (profile.coin_balance < GENERATE_COST) {
      return NextResponse.json(
        { error: `コインが不足しています（必要: ${GENERATE_COST}コイン）` },
        { status: 400 }
      );
    }

    const {
      drama_id,
      episode_number,
      title,
      prompt,
      duration = 10,
      mode = "pro",
    } = await request.json();

    if (!drama_id || !episode_number || !title || !prompt) {
      return NextResponse.json(
        { error: "必須項目が不足しています" },
        { status: 400 }
      );
    }

    // duration と mode のバリデーション
    const validDuration = duration === 5 ? 5 : 10;
    const validMode = mode === "std" ? "std" : "pro";

    // ドラマ所有者確認
    const { data: drama } = await supabase
      .from("dramas")
      .select("id")
      .eq("id", drama_id)
      .eq("creator_id", user.id)
      .single();

    if (!drama) {
      return NextResponse.json(
        { error: "ドラマが見つかりません" },
        { status: 404 }
      );
    }

    // プロンプトを強化
    const enhancedPrompt = enhancePrompt(prompt);

    // PiAPI経由でKling動画生成タスク作成
    let taskId: string | null = null;
    try {
      const piRes = await fetch("https://api.piapi.ai/api/v1/task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.PIAPI_API_KEY || "",
        },
        body: JSON.stringify({
          model: "kling",
          task_type: "video_generation",
          input: {
            prompt: enhancedPrompt,
            negative_prompt:
              "blurry, low quality, text, watermark, distorted, deformed, ugly, bad anatomy, bad proportions, extra limbs, disfigured, out of focus, noise, grainy, oversaturated, static image",
            cfg_scale: 0.5,
            duration: validDuration,
            aspect_ratio: "16:9",
            version: "2.0",
            mode: validMode,
          },
        }),
      });

      if (piRes.ok) {
        const piData = await piRes.json();
        if (piData.code === 200 && piData.data?.task_id) {
          taskId = piData.data.task_id;
        } else {
          console.error("PiAPI error:", piData);
        }
      } else {
        const errorText = await piRes.text();
        console.error("PiAPI HTTP error:", piRes.status, errorText);
      }
    } catch (err) {
      console.error("PiAPI request error:", err);
    }

    // コイン消費
    const newBalance = profile.coin_balance - GENERATE_COST;
    await supabase
      .from("profiles")
      .update({ coin_balance: newBalance })
      .eq("id", user.id);

    // 取引履歴
    await supabase.from("transactions").insert({
      user_id: user.id,
      type: "generate",
      amount: -GENERATE_COST,
      balance_after: newBalance,
      reference_id: drama_id,
      description: `AI動画生成 (${validMode === "pro" ? "Pro" : "Std"}, ${validDuration}秒): ${title}`,
    });

    // エピソード作成（動画は後からポーリングで更新）
    const { data: episode, error: epError } = await supabase
      .from("episodes")
      .insert({
        drama_id,
        episode_number,
        title,
        description: prompt,
        video_url: null,
        cloudflare_video_id: taskId,
        duration: validDuration,
        coin_price: 50,
        is_published: false,
      })
      .select()
      .single();

    if (epError) {
      console.error("Episode creation error:", epError);
      return NextResponse.json(
        { error: "エピソードの作成に失敗しました" },
        { status: 500 }
      );
    }

    // ドラマのエピソード数更新
    await supabase
      .from("dramas")
      .update({ total_episodes: episode_number })
      .eq("id", drama_id);

    return NextResponse.json({
      episode,
      task_id: taskId,
      balance: newBalance,
    });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
