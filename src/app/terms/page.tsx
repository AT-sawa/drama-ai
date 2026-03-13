import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "利用規約 | DramaAI",
  description: "DramaAIの利用規約です。",
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gradient mb-2">利用規約</h1>
      <p className="text-dark-muted text-sm mb-10">最終更新日: 2026年3月13日</p>

      <div className="space-y-10 text-dark-text leading-relaxed">
        {/* 第1条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第1条（適用）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>
              本利用規約（以下「本規約」）は、DramaAI（以下「当サービス」）の利用に関する条件を定めるものです。
              ユーザーの皆さま（以下「ユーザー」）は、本規約に同意のうえ、当サービスをご利用ください。
            </p>
            <p>
              当サービスに会員登録した時点で、本規約に同意したものとみなします。
            </p>
          </div>
        </section>

        {/* 第2条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第2条（サービス内容）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>当サービスは、以下の機能を提供します。</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>AIが生成したオリジナルドラマ動画の視聴</li>
              <li>クリエイターによるAI動画の生成・配信</li>
              <li>コイン（仮想通貨ではないサービス内ポイント）の購入・利用</li>
            </ul>
            <p>
              当サービスの内容は、予告なく変更・追加・停止する場合があります。
            </p>
          </div>
        </section>

        {/* 第3条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第3条（会員登録）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>
              当サービスの利用にはアカウント登録が必要です。
              登録時には正確な情報を提供してください。
            </p>
            <p>
              以下の場合、登録を拒否またはアカウントを停止することがあります。
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>虚偽の情報を登録した場合</li>
              <li>過去に本規約に違反してアカウント停止を受けた者である場合</li>
              <li>その他、当サービスが不適切と判断した場合</li>
            </ul>
          </div>
        </section>

        {/* 第4条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第4条（コインおよび決済）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>
              当サービスでは、有料コンテンツの視聴やAI動画の生成にコイン（サービス内ポイント）を使用します。
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>コインはクレジットカード等によるオンライン決済で購入できます</li>
              <li>決済処理はStripe, Inc.を通じて行われます</li>
              <li>購入したコインの返金は原則として行いません</li>
              <li>コインを他のユーザーに譲渡・売買することはできません</li>
              <li>コインは法定通貨や仮想通貨ではなく、サービス内でのみ使用可能なポイントです</li>
            </ul>
          </div>
        </section>

        {/* 第5条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第5条（禁止事項）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>ユーザーは以下の行為を行ってはなりません。</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>法令または公序良俗に反する行為</li>
              <li>当サービスの運営を妨害する行為</li>
              <li>他のユーザーまたは第三者の権利を侵害する行為</li>
              <li>不正アクセスやシステムへの攻撃行為</li>
              <li>コンテンツの無断転載、複製、再配布</li>
              <li>自動化ツール等による大量アクセスやスクレイピング</li>
              <li>AIが生成したコンテンツを自身のオリジナルとして第三者に販売する行為</li>
              <li>その他、当サービスが不適切と判断する行為</li>
            </ul>
          </div>
        </section>

        {/* 第6条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第6条（コンテンツの権利）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>
              当サービス上のAI生成コンテンツに関する権利は以下のとおりです。
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>クリエイターがAI機能を利用して生成したコンテンツの利用権はクリエイターに帰属します</li>
              <li>当サービスは、サービスの運営・改善・宣伝のために、コンテンツを利用する権利を有します</li>
              <li>AI生成コンテンツの著作権の帰属については、各国の法律に準じます</li>
            </ul>
          </div>
        </section>

        {/* 第7条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第7条（免責事項）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>当サービスは、以下について保証しません。</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>サービスが中断なく利用可能であること</li>
              <li>AI生成コンテンツの正確性、品質、完全性</li>
              <li>サービスの利用によるユーザーの期待する成果の達成</li>
            </ul>
            <p>
              当サービスの利用により生じた損害について、当サービスに故意または重大な過失がある場合を除き、
              一切の責任を負いません。
            </p>
          </div>
        </section>

        {/* 第8条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第8条（サービスの変更・停止）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>
              当サービスは、以下の場合にサービスの全部または一部を変更・停止・中断できるものとします。
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>システムの保守・点検・更新を行う場合</li>
              <li>天災、障害等の不可抗力によりサービスの提供が困難な場合</li>
              <li>その他、運営上の理由により必要と判断した場合</li>
            </ul>
          </div>
        </section>

        {/* 第9条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第9条（退会）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>
              ユーザーは、所定の手続きにより退会できます。
              退会した場合、保有するコインは全て消滅し、返金は行いません。
              退会後も、ユーザーが過去に投稿したコンテンツは当サービス上に残る場合があります。
            </p>
          </div>
        </section>

        {/* 第10条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第10条（規約の変更）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>
              当サービスは、本規約を変更する場合があります。
              重要な変更がある場合は、サービス上で通知します。
              変更後にサービスを利用した場合、変更後の規約に同意したものとみなします。
            </p>
          </div>
        </section>

        {/* 第11条 */}
        <section>
          <h2 className="text-xl font-bold mb-3 border-l-4 border-accent pl-3">
            第11条（準拠法・管轄）
          </h2>
          <div className="text-dark-muted space-y-2">
            <p>
              本規約は日本法に準拠し、日本法に従って解釈されるものとします。
              本規約に関連して紛争が生じた場合は、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
            </p>
          </div>
        </section>

        {/* フッターリンク */}
        <div className="pt-6 border-t border-dark-border flex items-center gap-4 text-sm">
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
