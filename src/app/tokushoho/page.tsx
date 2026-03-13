import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 | DramaAI",
  description: "DramaAIの特定商取引法に基づく表記です。",
};

export default function TokushohoPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gradient mb-2">
        特定商取引法に基づく表記
      </h1>
      <p className="text-dark-muted text-sm mb-10">
        最終更新日: 2026年3月13日
      </p>

      <div className="space-y-6 text-dark-text leading-relaxed">
        <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <Row label="販売事業者" value="DramaAI 運営" />
              <Row
                label="運営責任者"
                value="請求があった場合に遅滞なく開示します"
              />
              <Row
                label="所在地"
                value="請求があった場合に遅滞なく開示します"
              />
              <Row
                label="電話番号"
                value="請求があった場合に遅滞なく開示します"
              />
              <Row label="メールアドレス" value="support@drama-ai.com" />
              <Row
                label="販売URL"
                value="https://drama-ai.vercel.app/"
              />
              <Row
                label="販売価格"
                value="各コインパッケージの販売ページに表示された価格（税込）"
              />
              <Row
                label="商品代金以外の必要料金"
                value="インターネット接続に必要な通信料等はお客様のご負担となります"
              />
              <Row
                label="支払い方法"
                value="クレジットカード決済（Stripe経由）"
              />
              <Row
                label="支払い時期"
                value="ご注文確定時に即時決済されます"
              />
              <Row
                label="商品の引き渡し時期"
                value="決済完了後、直ちにコインがアカウントに付与されます"
              />
              <Row
                label="返品・キャンセル"
                value="デジタルコンテンツの性質上、購入後のコインの返品・返金・キャンセルはお受けできません。ただし、システム障害等によりコインが正常に付与されなかった場合は、お問い合わせください"
              />
              <Row
                label="動作環境"
                value="最新版のChrome、Safari、Firefox、Edgeブラウザを推奨。インターネット接続環境が必要です"
              />
              <Row
                label="販売数量の制限"
                value="特に制限はありません"
              />
              <Row
                label="特別条件"
                value="本サービスの利用には会員登録（無料）が必要です。利用規約およびプライバシーポリシーに同意いただく必要があります"
                isLast
              />
            </tbody>
          </table>
        </div>

        {/* 補足説明 */}
        <section className="bg-dark-card border border-dark-border rounded-xl p-6">
          <h2 className="text-lg font-bold mb-3">コインについて</h2>
          <div className="text-dark-muted space-y-2 text-sm">
            <p>
              当サービスで販売する「コイン」は、サービス内でのみ利用可能なポイントであり、
              法定通貨、暗号資産（仮想通貨）、電子マネーには該当しません。
            </p>
            <p>コインは以下の用途に使用できます。</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>有料エピソードの視聴</li>
              <li>AI動画の生成</li>
            </ul>
            <p>
              コインの有効期限はありませんが、アカウント削除時にすべてのコインは消滅します。
              コインを他のユーザーに譲渡・売買することはできません。
            </p>
          </div>
        </section>

        {/* フッターリンク */}
        <div className="pt-6 border-t border-dark-border flex items-center gap-4 text-sm">
          <Link
            href="/terms"
            className="text-accent hover:underline transition"
          >
            利用規約
          </Link>
          <Link
            href="/privacy"
            className="text-accent hover:underline transition"
          >
            プライバシーポリシー
          </Link>
          <Link
            href="/"
            className="text-dark-muted hover:text-dark-text transition"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <tr
      className={
        isLast ? "" : "border-b border-dark-border"
      }
    >
      <th className="text-left py-4 px-5 bg-dark-bg/50 text-dark-muted font-medium w-1/3 align-top whitespace-nowrap">
        {label}
      </th>
      <td className="py-4 px-5 text-dark-text">{value}</td>
    </tr>
  );
}
