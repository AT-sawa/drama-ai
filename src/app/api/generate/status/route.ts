import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const taskId = request.nextUrl.searchParams.get("task_id");
    const episodeId = request.nextUrl.searchParams.get("episode_id");

    if (!taskId || !episodeId) {
      return NextResponse.json(
        { error: "task_id と episode_id が必要です" },
        { status: 400 }
      );
    }

    // PiAPI でタスク状態を確認
    const piRes = await fetch(
      `https://api.piapi.ai/api/v1/task/${taskId}`,
      {
        headers: { "x-api-key": process.env.PIAPI_API_KEY || "" },
      }
    );

    if (!piRes.ok) {
      return NextResponse.json(
        { error: "PiAPIへの問い合わせに失敗しました" },
        { status: 502 }
      );
    }

    const piData = await piRes.json();
    const taskStatus = piData.data?.status?.toLowerCase();

    if (taskStatus === "completed") {
      // 動画URLを取得（PiAPIのレスポンス形式に対応）
      const videoUrl =
        piData.data?.output?.video ||
        piData.data?.output?.works?.[0]?.video?.resource_without_watermark ||
        null;

      if (videoUrl) {
        // Cloudflare Stream にアップロード（設定がある場合）
        let cloudflareVideoId: string | null = null;
        if (process.env.CLOUDFLARE_ACCOUNT_ID) {
          try {
            const cfRes = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/copy`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ url: videoUrl }),
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

        // エピソードを更新（動画URL設定 + 公開）
        await supabase
          .from("episodes")
          .update({
            video_url: videoUrl,
            cloudflare_video_id: cloudflareVideoId || undefined,
            is_published: true,
          })
          .eq("id", episodeId);
      }

      return NextResponse.json({
        status: "succeed",
        video_url: videoUrl,
      });
    }

    if (taskStatus === "failed") {
      return NextResponse.json({
        status: "failed",
        error: piData.data?.error?.message || "生成に失敗しました",
      });
    }

    // まだ処理中 (pending / processing)
    return NextResponse.json({
      status: taskStatus || "processing",
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
