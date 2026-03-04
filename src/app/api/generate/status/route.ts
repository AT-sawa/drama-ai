import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

    // Kling API でタスク状態を確認
    const token = generateKlingJWT();
    const klingRes = await fetch(
      `https://api-singapore.klingai.com/v1/videos/text2video/${taskId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!klingRes.ok) {
      return NextResponse.json(
        { error: "Kling APIへの問い合わせに失敗しました" },
        { status: 502 }
      );
    }

    const klingData = await klingRes.json();
    const taskStatus = klingData.data?.task_status;

    if (taskStatus === "succeed") {
      const videoUrl =
        klingData.data?.task_result?.videos?.[0]?.url || null;

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
        video_url: klingData.data?.task_result?.videos?.[0]?.url || null,
      });
    }

    if (taskStatus === "failed") {
      return NextResponse.json({
        status: "failed",
        error: klingData.data?.task_status_msg || "生成に失敗しました",
      });
    }

    // まだ処理中
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
