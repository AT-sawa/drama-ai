import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GENERATE_COST } from "@/lib/types";

function generateKlingJWT(): string {
  const accessKey = process.env.KLING_ACCESS_KEY || "";
  const secretKey = process.env.KLING_SECRET_KEY || "";

  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ iss: accessKey, exp: now + 1800, nbf: now - 5 })
  ).toString("base64url");

  const crypto = require("crypto");
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
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

    // Kling API で動画生成タスク作成
    let taskId: string | null = null;
    try {
      const token = generateKlingJWT();
      const klingRes = await fetch(
        "https://api-singapore.klingai.com/v1/videos/text2video",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            model_name: "kling-v2-6",
            prompt: prompt,
            negative_prompt: "blurry, low quality, text, watermark, distorted",
            cfg_scale: 0.5,
            mode: "std",
            aspect_ratio: "16:9",
            duration: "5",
          }),
        }
      );

      if (klingRes.ok) {
        const klingData = await klingRes.json();
        if (klingData.code === 0) {
          taskId = klingData.data?.task_id || null;
        } else {
          console.error("Kling API error:", klingData);
        }
      }
    } catch (err) {
      console.error("Kling API error:", err);
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
