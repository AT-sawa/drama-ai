import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー | DramaAI",
  description: "DramaAIのプライバシーポリシーです。",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gradient mb-2">
        プライバシーポリシー
      </h1>
      <p className="text-dark-muted text-sm mb-10">
        最終更新日: 2026年3月13日
      </p>

      <div className="space-y-10 text-dark-text leading-relaxed">
        {/* 第1条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第1条（基本方針）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>
              DramaAI（以下「当サービス」）は、ユーザーの個人情報の保護を重要な責務と認識し、
              個人情報の保護に関する法律（個人情報保護法）およびその他の関連法令を遵守します。
            </p>
            <p>
              本プライバシーポリシーは、当サービスが収集する個人情報の取扱いについて定めるものです。
            </p>
          </div>
        </section>

        {/* 第2条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第2条（収集する情報）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>当サービスは、以下の情報を収集する場合があります。</p>

            <h3 className="text-dark-text font-semibold mt-4 mb-2">
              (1) ユーザーが直接提供する情報
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>メールアドレス</li>
              <li>表示名（ユーザー名）</li>
              <li>パスワード（ハッシュ化して保存）</li>
            </ul>

            <h3 className="text-dark-text font-semibold mt-4 mb-2">
              (2) 自動的に収集される情報
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>IPアドレス</li>
              <li>ブラウザの種類・バージョン</li>
              <li>アクセス日時</li>
              <li>閲覧したページ</li>
              <li>サービスの利用履歴（視聴履歴、コイン取引履歴等）</li>
            </ul>

            <h3 className="text-dark-text font-semibold mt-4 mb-2">
              (3) 決済に関する情報
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                クレジットカード情報は当サービスでは保持しません。
                決済処理はStripe, Inc.が行い、カード情報はStripeが管理します。
              </li>
              <li>当サービスが保持するのは、取引ID、金額、購入日時等の取引記録のみです。</li>
            </ul>
          </div>
        </section>

        {/* 第3条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第3条（情報の利用目的）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>収集した情報は、以下の目的で利用します。</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>アカウントの作成・管理・認証</li>
              <li>サービスの提供・運営・維持</li>
              <li>コイン購入・コンテンツ視聴等の決済処理</li>
              <li>お問い合わせへの対応</li>
              <li>サービスの改善・新機能の開発</li>
              <li>利用状況の統計・分析（個人を特定しない形で）</li>
              <li>不正利用の検出・防止</li>
              <li>規約違反行為への対応</li>
            </ul>
          </div>
        </section>

        {/* 第4条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第4条（第三者への提供）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>
              当サービスは、以下の場合を除き、ユーザーの個人情報を第三者に提供しません。
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>
                人の生命・身体・財産の保護のために必要であり、
                本人の同意を得ることが困難な場合
              </li>
              <li>
                サービス提供に必要な範囲で業務委託先に提供する場合
                （適切な管理を義務付けます）
              </li>
            </ul>
          </div>
        </section>

        {/* 第5条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第5条（外部サービスの利用）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>当サービスは、以下の外部サービスを利用しています。</p>

            <div className="bg-dark-card border border-dark-border rounded-lg p-4 mt-3 space-y-3">
              <div>
                <h4 className="text-dark-text font-semibold">
                  Supabase（認証・データベース）
                </h4>
                <p className="text-sm">
                  アカウント管理、データ保存に使用しています。
                </p>
                <a
                  href="https://supabase.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent text-sm hover:underline"
                >
                  Supabase プライバシーポリシー
                </a>
              </div>
              <div>
                <h4 className="text-dark-text font-semibold">
                  Stripe（決済処理）
                </h4>
                <p className="text-sm">
                  コインの購入時にクレジットカード決済を処理しています。
                </p>
                <a
                  href="https://stripe.com/jp/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent text-sm hover:underline"
                >
                  Stripe プライバシーポリシー
                </a>
              </div>
              <div>
                <h4 className="text-dark-text font-semibold">
                  Vercel（ホスティング）
                </h4>
                <p className="text-sm">
                  サービスのホスティングに使用しています。
                </p>
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent text-sm hover:underline"
                >
                  Vercel プライバシーポリシー
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 第6条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第6条（Cookieの使用）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>
              当サービスは、認証状態の維持やサービスの利便性向上のためにCookieを使用しています。
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>セッション管理のための認証Cookie</li>
              <li>ユーザー設定の保存</li>
            </ul>
            <p>
              ブラウザの設定によりCookieを無効にすることができますが、
              その場合、当サービスの一部機能が利用できなくなる場合があります。
            </p>
          </div>
        </section>

        {/* 第7条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第7条（データの保持期間）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>
              ユーザーの個人情報は、利用目的の達成に必要な期間保持します。
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>アカウント情報：アカウント削除まで</li>
              <li>取引履歴：法令で定められた保存期間（最大7年）</li>
              <li>アクセスログ：最大1年</li>
            </ul>
            <p>
              アカウント削除後は、法令上の保存義務がある情報を除き、
              合理的な期間内に個人情報を削除します。
            </p>
          </div>
        </section>

        {/* 第8条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第8条（セキュリティ）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>
              当サービスは、個人情報の漏洩、滅失、毀損等を防止するため、
              以下のセキュリティ対策を実施しています。
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>通信の暗号化（SSL/TLS）</li>
              <li>パスワードのハッシュ化保存</li>
              <li>アクセス制御の実施</li>
              <li>定期的なセキュリティ対策の見直し</li>
            </ul>
          </div>
        </section>

        {/* 第9条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第9条（ユーザーの権利）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>ユーザーは、ご自身の個人情報について以下の権利を有します。</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>開示の請求</li>
              <li>訂正・追加・削除の請求</li>
              <li>利用停止・消去の請求</li>
              <li>第三者提供の停止の請求</li>
            </ul>
            <p>
              これらの請求を行う場合は、下記のお問い合わせ先までご連絡ください。
              本人確認のうえ、合理的な期間内に対応いたします。
            </p>
          </div>
        </section>

        {/* 第10条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第10条（未成年者の利用）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>
              18歳未満の方が当サービスを利用する場合は、保護者の同意が必要です。
              保護者の同意なくサービスを利用した場合、当サービスは一切の責任を負いません。
            </p>
          </div>
        </section>

        {/* 第11条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第11条（ポリシーの変更）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>
              当サービスは、本プライバシーポリシーを変更する場合があります。
              重要な変更がある場合は、サービス上で通知します。
              変更後にサービスを利用した場合、変更後のポリシーに同意したものとみなします。
            </p>
          </div>
        </section>

        {/* 第12条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第12条（お問い合わせ）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>
              個人情報の取扱いに関するお問い合わせは、以下までご連絡ください。
            </p>
            <div className="bg-dark-card border border-dark-border rounded-lg p-4 mt-3">
              <p className="text-dark-text font-semibold">DramaAI 運営</p>
              <p className="text-sm mt-1">
                メール:{" "}
                <a
                  href="mailto:support@drama-ai.com"
                  className="text-accent hover:underline"
                >
                  support@drama-ai.com
                </a>
              </p>
            </div>
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
