export function getSiteUrl(): string {
  // NEXT_PUBLIC_SITE_URL が設定されている場合はそれを優先
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  // VERCEL_URL はデプロイメントごとの一時URLを返すため、
  // OGP画像のURLとしては使えない。本番ドメインを固定で返す
  return "https://drama-ai.vercel.app";
}
