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
        piData.data?.output?.works?.[0]?.video?.resource ||
        null;

      // 動画の実際のdurationを取得（PiAPIレスポンスに含まれる場合）
      const videoDuration =
        piData.data?.output?.works?.[0]?.video?.duration ||
        piData.data?.input?.duration ||
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
        // cloudflare_video_idは必ずnullにリセット（PiAPIタスクIDが入っているため）
        // Cloudflare Streamにアップロードした場合のみ実際のIDを設定
        const updateData: Record<string, unknown> = {
          video_url: videoUrl,
          is_published: true,
          cloudflare_video_id: cloudflareVideoId || null,
          piapi_task_id: taskId,
        };

        // durationの処理: PiAPIからの値が異常に大きい場合はミリ秒とみなす
        if (videoDuration) {
          let dur = Number(videoDuration);
          if (dur > 300) {
            // 300秒(5分)を超える場合はミリ秒の可能性が高い
            dur = dur / 1000;
          }
          updateData.duration = Math.round(dur);
        }

        await supabase
          .from("episodes")
          .update(updateData)
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
