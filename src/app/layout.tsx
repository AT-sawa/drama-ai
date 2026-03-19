import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Header } from "@/components/Header";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { CookieConsent } from "@/components/CookieConsent";
import { getSiteUrl } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DramaAI - AI動画配信サービス",
    template: "%s | DramaAI",
  },
  description:
    "AIが生成するオリジナルドラマを楽しもう。クリエイターとして自分だけの作品を作ることもできます。",
  openGraph: {
    type: "website",
    siteName: "DramaAI",
    title: "DramaAI - AI動画配信サービス",
    description:
      "AIが生成するオリジナルドラマを楽しもう。クリエイターとして自分だけの作品を作ることもできます。",
    url: siteUrl,
    images: [
      {
        url: "/api/og?title=DramaAI&description=AI%E3%81%8C%E7%B4%A1%E3%81%90%E6%96%B0%E3%81%97%E3%81%84%E7%89%A9%E8%AA%9E",
        width: 1200,
        height: 630,
        alt: "DramaAI - AI動画配信サービス",
      },
    ],
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "DramaAI - AI動画配信サービス",
    description:
      "AIが生成するオリジナルドラマを楽しもう。クリエイターとして自分だけの作品を作ることもできます。",
    images: ["/api/og?title=DramaAI&description=AI%E3%81%8C%E7%B4%A1%E3%81%90%E6%96%B0%E3%81%97%E3%81%84%E7%89%A9%E8%AA%9E"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <GoogleAnalytics />
        <Header />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        <footer className="border-t border-dark-border bg-dark-card/30 pt-10 pb-6 text-sm text-dark-muted">
          <div className="max-w-7xl mx-auto px-4">
            {/* フッターグリッド */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
              {/* ブランド */}
              <div className="col-span-2 md:col-span-1">
                <p className="text-gradient font-bold text-xl mb-2">DramaAI</p>
                <p className="text-dark-muted/80 text-xs leading-relaxed">
                  AIが生成するオリジナルドラマを楽しもう。クリエイターとして自分だけの作品を作ることもできます。
                </p>
              </div>

              {/* サービス */}
              <div>
                <h3 className="text-dark-text font-semibold mb-3 text-xs uppercase tracking-wider">サービス</h3>
                <ul className="space-y-2">
                  <li><Link href="/" className="hover:text-dark-text transition">作品を探す</Link></li>
                  <li><Link href="/creator" className="hover:text-dark-text transition">クリエイター</Link></li>
                  <li><Link href="/coins" className="hover:text-dark-text transition">コイン購入</Link></li>
                </ul>
              </div>

              {/* アカウント */}
              <div>
                <h3 className="text-dark-text font-semibold mb-3 text-xs uppercase tracking-wider">アカウント</h3>
                <ul className="space-y-2">
                  <li><Link href="/login" className="hover:text-dark-text transition">ログイン</Link></li>
                  <li><Link href="/register" className="hover:text-dark-text transition">新規登録</Link></li>
                  <li><Link href="/profile" className="hover:text-dark-text transition">プロフィール</Link></li>
                </ul>
              </div>

              {/* 法的情報 */}
              <div>
                <h3 className="text-dark-text font-semibold mb-3 text-xs uppercase tracking-wider">法的情報</h3>
                <ul className="space-y-2">
                  <li><Link href="/terms" className="hover:text-dark-text transition">利用規約</Link></li>
                  <li><Link href="/privacy" className="hover:text-dark-text transition">プライバシーポリシー</Link></li>
                  <li><Link href="/tokushoho" className="hover:text-dark-text transition"><span className="md:hidden">特商法表記</span><span className="hidden md:inline">特定商取引法に基づく表記</span></Link></li>
                  <li><Link href="/contact" className="hover:text-dark-text transition">お問い合わせ</Link></li>
                </ul>
              </div>
            </div>

            {/* コピーライト */}
            <div className="border-t border-dark-border pt-5 text-center text-xs text-dark-muted/60">
              <p>&copy; 2026 DramaAI. All rights reserved.</p>
            </div>
          </div>
        </footer>
        <CookieConsent />
      </body>
    </html>
  );
}
