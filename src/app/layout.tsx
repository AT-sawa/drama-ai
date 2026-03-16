import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Header } from "@/components/Header";
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
        <Header />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        <footer className="border-t border-dark-border py-8 text-center text-sm text-dark-muted">
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-gradient font-bold text-lg mb-3">DramaAI</p>
            <div className="flex items-center justify-center gap-4 mb-3 flex-wrap">
              <Link
                href="/terms"
                className="hover:text-dark-text transition"
              >
                利用規約
              </Link>
              <span className="text-dark-border">|</span>
              <Link
                href="/privacy"
                className="hover:text-dark-text transition"
              >
                プライバシーポリシー
              </Link>
              <span className="text-dark-border">|</span>
              <Link
                href="/tokushoho"
                className="hover:text-dark-text transition"
              >
                特定商取引法に基づく表記
              </Link>
              <span className="text-dark-border">|</span>
              <Link
                href="/contact"
                className="hover:text-dark-text transition"
              >
                お問い合わせ
              </Link>
            </div>
            <p>&copy; 2026 DramaAI. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
