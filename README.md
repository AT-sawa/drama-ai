# DramaAI - AI動画配信サービス

AIが生成するオリジナルドラマを配信・視聴できるプラットフォーム。

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **認証・DB**: Supabase
- **決済**: Stripe
- **AI動画生成**: Runway API
- **動画配信**: Cloudflare Stream

## セットアップ手順

### 1. 依存関係のインストール

```bash
cd drama-ai
npm install
```

### 2. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集して各サービスのキーを設定してください。

### 3. Supabase の設定

1. [Supabase](https://supabase.com/) でプロジェクトを作成
2. SQL Editor で `supabase/schema.sql` を実行
3. Authentication > URL Configuration で Redirect URLs に `http://localhost:3000/api/auth/callback` を追加
4. プロジェクトの URL と anon key を `.env.local` に設定

### 4. Stripe の設定

1. [Stripe](https://stripe.com/) でアカウントを作成
2. テスト用の API キーを `.env.local` に設定
3. Webhook を設定:
   - エンドポイント: `https://your-domain.com/api/stripe/webhook`
   - イベント: `checkout.session.completed`
4. Webhook Secret を `.env.local` に設定

### 5. Runway API の設定（オプション）

1. [Runway](https://runwayml.com/) でアカウントを作成
2. API キーを取得して `.env.local` に設定

### 6. Cloudflare Stream の設定（オプション）

1. [Cloudflare](https://cloudflare.com/) でアカウントを作成
2. Stream を有効化
3. Account ID と API Token を `.env.local` に設定

### 7. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアプリにアクセス。

## 機能一覧

| 機能 | 説明 |
|------|------|
| ログイン・新規登録 | Supabase Auth によるメール認証 |
| ドラマ一覧 | ジャンルフィルター付きの作品一覧 |
| ドラマ詳細 | エピソード一覧・視聴済みステータス |
| 動画視聴 | コイン消費で有料エピソードを視聴 |
| コイン購入 | Stripe Checkout でコインパッケージを購入 |
| AI動画生成 | Runway API でプロンプトから動画を生成 |
| クリエイターダッシュボード | 作品管理・統計表示 |

## 料金体系

| パッケージ | 価格 | コイン数 |
|-----------|------|---------|
| ベーシック | 500円 | 500コイン |
| スタンダード | 1,000円 | 1,200コイン (+200ボーナス) |
| プレミアム | 3,000円 | 4,200コイン (+1,200ボーナス) |

- エピソード視聴: 0〜100コイン
- AI動画生成: 500コイン
- クリエイター還元率: 70%

## プロジェクト構成

```
drama-ai/
├── src/
│   ├── app/
│   │   ├── page.tsx              # トップページ（ドラマ一覧）
│   │   ├── layout.tsx            # ルートレイアウト
│   │   ├── login/page.tsx        # ログイン
│   │   ├── register/page.tsx     # 新規登録
│   │   ├── drama/[id]/page.tsx   # ドラマ詳細
│   │   ├── watch/[episodeId]/    # 動画視聴
│   │   ├── coins/page.tsx        # コイン購入
│   │   ├── creator/
│   │   │   ├── page.tsx          # ダッシュボード
│   │   │   └── generate/page.tsx # AI動画生成
│   │   └── api/
│   │       ├── auth/callback/    # 認証コールバック
│   │       ├── coins/purchase/   # コイン購入API
│   │       ├── stripe/webhook/   # Stripe Webhook
│   │       ├── watch/            # 視聴API
│   │       ├── generate/         # 動画生成API
│   │       └── creator/stats/    # クリエイター統計API
│   ├── components/
│   │   ├── Header.tsx            # ヘッダー
│   │   ├── DramaCard.tsx         # ドラマカード
│   │   ├── EpisodeList.tsx       # エピソード一覧
│   │   ├── VideoPlayer.tsx       # 動画プレイヤー
│   │   ├── CoinBalance.tsx       # コイン残高表示
│   │   └── GenerateForm.tsx      # AI生成フォーム
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         # ブラウザ用クライアント
│   │   │   └── server.ts         # サーバー用クライアント
│   │   ├── stripe.ts             # Stripe クライアント
│   │   └── types.ts              # 型定義・定数
│   └── middleware.ts             # 認証ミドルウェア
├── supabase/
│   └── schema.sql                # データベーススキーマ
├── .env.local.example            # 環境変数テンプレート
└── package.json
```

## デプロイ

Vercel でのデプロイが推奨されます:

```bash
npm i -g vercel
vercel
```

環境変数を Vercel のプロジェクト設定で追加してください。
