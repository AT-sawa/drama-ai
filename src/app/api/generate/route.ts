import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GENERATE_COST } from "@/lib/types";

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

    const { drama_id, episode_number, title, prompt } = await request.json();

    if (!drama_id || !episode_number || !title || !prompt) {
      return NextResponse.json(
        { error: "必須項目が不足しています" },
        { status: 400 }
      );
    }

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
            prompt: prompt,
            negative_prompt: "blurry, low quality, text, watermark, distorted",
            cfg_scale: 0.5,
            duration: 5,
            aspect_ratio: "16:9",
            version: "2.6",
            mode: "std",
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
        console.error("PiAPI HTTP error:", piRes.status);
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
      description: `AI動画生成: ${title}`,
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
        duration: 5,
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
