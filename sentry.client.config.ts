import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1, // パフォーマンストレースは10%
    replaysSessionSampleRate: 0, // リプレイ無効（コスト節約）
    replaysOnErrorSampleRate: 0.5, // エラー時のみ50%リプレイ
    beforeSend(event) {
      // 429エラーは送らない（レートリミットのノイズ防止）
      if (event.exception?.values?.[0]?.value?.includes("429")) return null;
      return event;
    },
  });
}
