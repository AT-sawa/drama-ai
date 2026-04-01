import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// シンプルなインメモリレートリミッター
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(
  ip: string,
  path: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const key = `${ip}:${path}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

// 定期的に古いエントリを削除（メモリリーク防止）
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((entry, key) => {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  });
}, 60000);

// API パスごとのレート制限設定
const API_RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/api/auth": { max: 10, windowMs: 60000 },            // 認証: 1分10回（ブルートフォース防止）
  "/api/generate": { max: 5, windowMs: 60000 },         // 動画生成: 1分5回
  "/api/report": { max: 10, windowMs: 60000 },          // 通報: 1分10回
  "/api/creator/apply": { max: 3, windowMs: 300000 },   // クリエイター申請: 5分3回
  "/api/coins/purchase": { max: 10, windowMs: 60000 },  // コイン購入: 1分10回
  "/api/episodes/create": { max: 10, windowMs: 60000 }, // 動画アップロード: 1分10回
  "/api/drama": { max: 30, windowMs: 60000 },           // コメント等: 1分30回
};

// ログイン/登録ページのレートリミット
const PAGE_RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/login": { max: 20, windowMs: 60000 },               // ログインページ: 1分20回
  "/register": { max: 10, windowMs: 60000 },            // 登録ページ: 1分10回
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // APIリクエストのレートリミット
  if (pathname.startsWith("/api/")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // パスに一致するレート制限を検索
    const matchedLimit = Object.entries(API_RATE_LIMITS).find(([path]) =>
      pathname.startsWith(path)
    );

    if (matchedLimit) {
      const [, { max, windowMs }] = matchedLimit;
      if (!checkRateLimit(ip, matchedLimit[0], max, windowMs)) {
        return NextResponse.json(
          { error: "リクエストが多すぎます。しばらくしてから再度お試しください。" },
          {
            status: 429,
            headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) },
          }
        );
      }
    }
  }

  // ログイン/登録ページのレートリミット
  const pageLimit = Object.entries(PAGE_RATE_LIMITS).find(([path]) =>
    pathname === path
  );
  if (pageLimit) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const [, { max, windowMs }] = pageLimit;
    if (!checkRateLimit(ip, pageLimit[0], max, windowMs)) {
      return NextResponse.json(
        { error: "アクセスが集中しています。しばらくしてから再度お試しください。" },
        { status: 429 }
      );
    }
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key",
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // セッション更新
  await supabase.auth.getUser();

  // 保護されたルート
  const protectedPaths = ["/creator", "/coins", "/profile", "/favorites", "/history", "/admin"];
  const isProtected = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  if (isProtected) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|icons/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
