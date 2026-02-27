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

    // Runway API で動画生成
    let videoUrl: string | null = null;
    try {
      const runwayRes = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
        },
        body: JSON.stringify({
          promptText: prompt,
          model: "gen3a_turbo",
          duration: 10,
          ratio: "16:9",
        }),
      });

      if (runwayRes.ok) {
        const runwayData = await runwayRes.json();
        videoUrl = runwayData.output?.[0] || null;
      }
    } catch (err) {
      console.error("Runway API error:", err);
      // API エラーでもエピソード作成は続行（動画なしで）
    }

    // Cloudflare Stream にアップロード（動画URLがある場合）
    let cloudflareVideoId: string | null = null;
    if (videoUrl && process.env.CLOUDFLARE_ACCOUNT_ID) {
      try {
        const cfRes = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/copy`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: videoUrl,
              meta: { name: `${title} - EP.${episode_number}` },
            }),
          }
        );

        if (cfRes.ok) {
          const cfData = await cfRes.json();
          cloudflareVideoId = cfData.result?.uid || null;
        }
      } catch (err) {
        console.error("Cloudflare Stream error:", err);
      }
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

    // エピソード作成
    const { data: episode, error: epError } = await supabase
      .from("episodes")
      .insert({
        drama_id,
        episode_number,
        title,
        description: prompt,
        video_url: videoUrl,
        cloudflare_video_id: cloudflareVideoId,
        duration: 10,
        coin_price: 50,
        is_published: true,
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
