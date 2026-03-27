import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // 予期されるエラーは除外
      const message = event.exception?.values?.[0]?.value || "";
      if (message.includes("DYNAMIC_SERVER_USAGE")) return null;
      if (message.includes("429")) return null;
      return event;
    },
  });
}
