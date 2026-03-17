/**
 * 数値を半角カンマ区切り文字列に変換（全角数字を防止）
 * toLocaleString() はサーバー環境で全角数字を返す場合があるため、
 * 手動でフォーマットする
 */
export function formatNumber(n: number | string): string {
  const num = typeof n === "string" ? parseInt(n, 10) : n;
  if (isNaN(num)) return "0";
  // 手動カンマ区切り（全角文字が混入しない）
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function getSiteUrl(): string {
  // NEXT_PUBLIC_SITE_URL が設定されている場合はそれを優先
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  // VERCEL_URL はデプロイメントごとの一時URLを返すため、
  // OGP画像のURLとしては使えない。本番ドメインを固定で返す
  return "https://drama-ai.vercel.app";
}
