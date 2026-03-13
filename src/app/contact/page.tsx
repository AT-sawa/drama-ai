import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "お問い合わせ | DramaAI",
  description: "DramaAIへのお問い合わせページです。",
};

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gradient mb-2">お問い合わせ</h1>
      <p className="text-dark-muted text-sm mb-10">
        ご質問・ご要望・不具合のご報告など、お気軽にお問い合わせください。
      </p>

      <div className="bg-dark-card border border-dark-border rounded-xl p-6 space-y-6">
        {/* メール */}
        <div>
          <h2 className="text-lg font-semibold mb-2">メールでのお問い合わせ</h2>
          <p className="text-dark-muted text-sm mb-3">
            以下のメールアドレス宛にお問い合わせください。通常2〜3営業日以内にご返信いたします。
          </p>
          <a
            href="mailto:support@drama-ai.com"
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-semibold px-5 py-2.5 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            support@drama-ai.com
          </a>
        </div>

        <hr className="border-dark-border" />

        {/* お問い合わせ内容の例 */}
        <div>
          <h2 className="text-lg font-semibold mb-3">お問い合わせ内容の例</h2>
          <ul className="space-y-2 text-dark-muted text-sm">
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">&#9679;</span>
              サービスの利用方法に関するご質問
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">&#9679;</span>
              不具合やエラーのご報告
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">&#9679;</span>
              コイン購入・決済に関するお問い合わせ
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">&#9679;</span>
              アカウントの削除・退会のご依頼
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">&#9679;</span>
              機能改善のご要望・ご提案
            </li>
          </ul>
        </div>

        <hr className="border-dark-border" />

        {/* 注意事項 */}
        <div className="bg-dark-bg border border-dark-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-2">ご注意</h3>
          <ul className="space-y-1 text-dark-muted text-xs">
            <li>・ 返信はメールにて行います。受信設定をご確認ください。</li>
            <li>・ 内容によっては回答にお時間をいただく場合があります。</li>
            <li>・ お問い合わせの際は、ご登録のメールアドレスからご連絡いただくとスムーズです。</li>
          </ul>
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="text-dark-muted hover:text-dark-text text-sm transition">
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
