import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 外部動画をプロキシして CORS ヘッダーを付与
 * VideoFrameCapture で Canvas キャプチャを可能にする
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  // 許可するドメインを制限
  const allowed = [
    "storage.theapi.app",
    "cdn.piapi.ai",
    "kling",
    "supabase.co",
  ];
  try {
    const parsed = new URL(url);
    if (!allowed.some((d) => parsed.hostname.includes(d))) {
      return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        // Range リクエストを転送（ブラウザが部分リクエストする場合）
        ...(request.headers.get("range")
          ? { Range: request.headers.get("range")! }
          : {}),
      },
    });

    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json(
        { error: "Failed to fetch video" },
        { status: upstream.status }
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("Content-Type") || "video/mp4");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Cache-Control", "public, max-age=3600");

    if (upstream.headers.get("Content-Length")) {
      headers.set("Content-Length", upstream.headers.get("Content-Length")!);
    }
    if (upstream.headers.get("Content-Range")) {
      headers.set("Content-Range", upstream.headers.get("Content-Range")!);
    }
    if (upstream.headers.get("Accept-Ranges")) {
      headers.set("Accept-Ranges", upstream.headers.get("Accept-Ranges")!);
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch {
    return NextResponse.json(
      { error: "Proxy error" },
      { status: 502 }
    );
  }
}
