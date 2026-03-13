import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Header } from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DramaAI - AI動画配信サービス",
  description:
    "AIが生成するオリジナルドラマを楽しもう。クリエイターとして自分だけの作品を作ることもできます。",
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
            <div className="flex items-center justify-center gap-4 mb-3">
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
            </div>
            <p>&copy; 2026 DramaAI. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
