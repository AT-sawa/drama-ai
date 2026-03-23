// シンプルなインメモリレートリミッター
// 本番環境ではRedis等の外部ストアを推奨

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// 古いエントリを定期的にクリーンアップ
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  });
}, 60_000);

interface RateLimitOptions {
  /** ウィンドウ期間（ミリ秒） */
  windowMs?: number;
  /** ウィンドウ内の最大リクエスト数 */
  max?: number;
}

export function rateLimit(
  key: string,
  options: RateLimitOptions = {}
): { success: boolean; remaining: number } {
  const { windowMs = 60_000, max = 30 } = options;
  const now = Date.now();

  let entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { success: true, remaining: max - 1 };
  }

  entry.count++;

  if (entry.count > max) {
    return { success: false, remaining: 0 };
  }

  return { success: true, remaining: max - entry.count };
}

/** IPアドレスまたはユーザーIDでレートリミットキーを生成 */
export function getRateLimitKey(
  request: Request,
  prefix: string,
  userId?: string
): string {
  if (userId) return `${prefix}:${userId}`;

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `${prefix}:${ip}`;
}
