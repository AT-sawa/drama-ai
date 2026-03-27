import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ===========================================
// レートリミッター（Upstash Redis + インメモリフォールバック）
// ===========================================

// Upstash Redis が設定されている場合はそちらを使用
// 未設定の場合はインメモリにフォールバック
const isUpstashConfigured =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

// Upstash ベースのレートリミッター
let upstashLimiters: Map<string, Ratelimit> | null = null;

function getUpstashLimiter(prefix: string, max: number, windowSec: number): Ratelimit {
  if (!upstashLimiters) {
    upstashLimiters = new Map();
  }
  const key = `${prefix}:${max}:${windowSec}`;
  let limiter = upstashLimiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(max, `${windowSec} s`),
      prefix: `ratelimit:${prefix}`,
      analytics: true,
    });
    upstashLimiters.set(key, limiter);
  }
  return limiter;
}

// インメモリフォールバック
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

// 古いエントリを定期的にクリーンアップ
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    memoryStore.forEach((entry, key) => {
      if (entry.resetAt < now) {
        memoryStore.delete(key);
      }
    });
  }, 60_000);
}

// ===========================================
// 統一インターフェース
// ===========================================

interface RateLimitOptions {
  /** ウィンドウ期間（ミリ秒） */
  windowMs?: number;
  /** ウィンドウ内の最大リクエスト数 */
  max?: number;
}

export async function rateLimitAsync(
  key: string,
  options: RateLimitOptions = {}
): Promise<{ success: boolean; remaining: number }> {
  const { windowMs = 60_000, max = 30 } = options;

  if (isUpstashConfigured) {
    try {
      const windowSec = Math.ceil(windowMs / 1000);
      const limiter = getUpstashLimiter(key.split(":")[0] || "default", max, windowSec);
      const result = await limiter.limit(key);
      return { success: result.success, remaining: result.remaining };
    } catch (error) {
      // Upstash障害時はインメモリにフォールバック
      console.error("Upstash rate limit error, falling back to memory:", error);
    }
  }

  // インメモリフォールバック
  return rateLimitMemory(key, options);
}

/** 同期版（middleware等で使用） */
export function rateLimit(
  key: string,
  options: RateLimitOptions = {}
): { success: boolean; remaining: number } {
  return rateLimitMemory(key, options);
}

function rateLimitMemory(
  key: string,
  options: RateLimitOptions = {}
): { success: boolean; remaining: number } {
  const { windowMs = 60_000, max = 30 } = options;
  const now = Date.now();

  let entry = memoryStore.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 1, resetAt: now + windowMs };
    memoryStore.set(key, entry);
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
