# Flovia PoC Frontend

x402 Co-usage Discovery のプロトタイプ UI。Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4 で実装しています。

## 動かし方

依存ツール: **Bun 1.3.13 以上**。このアプリは monorepo の `apps/frontend` workspace として動作し、データソースとして `apps/bff` が `http://localhost:3001` で起動している必要があります。

```bash
bun install
bun --filter frontend dev
```

[http://localhost:3000](http://localhost:3000) を開きます。初回アクセス時は localStorage が空なので、サイドバー用の3つの demo Provider が seed されます。Setup から自分の `pay_to` を追加することもできます。

### BFF への接続

各画面（Customers / Wallet 360° / Patterns）は Server Component から BFF を直接 fetch します。Server Component の接続先は `BFF_URL` で上書き可能です（既定: `http://localhost:3001`）。Browser 側から呼ぶ場合は `NEXT_PUBLIC_BFF_URL`（既定: `/api`）を使い、`next.config.ts` の rewrite 経由で BFF に転送します。

```bash
BFF_URL=http://localhost:3001 NEXT_PUBLIC_BFF_URL=/api bun --filter frontend dev
```

PoC の BFF は payer wallet 単位の customer projection のみを返し、provider 単位のスコープ分割は行いません。サイドバーの `providerId` は localStorage 上の表示識別子としてのみ機能し、画面に流れるデータは BFF 全体の集計です。

#### BFF の起動とデモデータ

BFF は同じ monorepo の `apps/bff` にあります。request path では live RPC / 外部 service を呼ばず、prepared fixture / projection を read-only product API として返します。

```bash
bun install
bun --filter bff start
```

Docker Compose で BFF と frontend をまとめて起動できます。

```bash
docker compose up --build
```

`3000` が使用中の場合は host port を変更できます。

```bash
FRONTEND_PORT=3002 docker compose up --build
```

その他のスクリプト:

| コマンド | 内容 |
| --- | --- |
| `bun --filter frontend build` | 本番ビルド (`.next/`) |
| `bun --filter frontend start` | 本番ビルドの起動 |
| `bun --filter frontend typecheck` | `tsc --noEmit` |
| `bun --filter frontend verify` | typecheck + test |

## ルーティング

| パス | 役割 |
| --- | --- |
| `/setup` | Provider (pay_to) の登録・管理。localStorage に保存 |
| `/providers/[providerId]/customers` | 当該 Provider の顧客ウォレット一覧 |
| `/providers/[providerId]/wallet/[address]` | Wallet 360°(主役画面)。Activity Timeline + Co-usage Map + Insight stack |
| `/providers/[providerId]/patterns` | 集約ビュー。Bubble Chart / Retention / Workflow Clusters |
| `/` | localStorage の最初の Provider の Customers にリダイレクト。なければ `/setup` へ |

## ディレクトリ構成

```
apps/frontend/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # フォントとコンテキストプロバイダ
│   ├── page.tsx                      # ルート (動的リダイレクト)
│   ├── globals.css                   # CSS 変数 + Tailwind v4 @theme + ユーティリティクラス
│   ├── providers.tsx                 # Provider context (localStorage hydration)
│   ├── setup/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── providers/[providerId]/
│       ├── layout.tsx                # Sidebar を含むシェル
│       ├── customers/page.tsx
│       ├── wallet/[address]/page.tsx
│       └── patterns/page.tsx
├── components/
│   ├── ui/                           # Icon, FreeTierBar
│   ├── shell/                        # Sidebar, TopBar
│   ├── setup/                        # SetupForm, SavedProviderList, Field
│   ├── customers/                    # CustomersTable, CustomersHeader, SummaryChip, Toolbar, UpsellPill, Select
│   ├── wallet/                       # WalletScreen, IdentityBar, ActivityTimeline, Insights, InsightCard, KPI, Stat
│   └── patterns/                     # PatternsScreen, BubbleChart
├── lib/
│   ├── api/
│   │   ├── client.ts                 # BFF への fetch ラッパ (no-store)
│   │   ├── adapters.ts               # canonical BFF response -> UI view model
│   │   └── types.ts                  # UI view model 型
│   ├── types.ts                      # StoredProvider 系 (localStorage 用)
│   ├── storage.ts                    # localStorage 読み書き (SSR-safe)
│   ├── providers.ts                  # slugify, seed, 表示用ヘルパ
│   └── format.ts                     # formatAtomic, formatRatioPct, formatGrowth, classNames, shortAddr
└── ...
```

## デザインの方針

色・余白・タイポグラフィは `app/globals.css` の `:root` で定義した CSS 変数で統一しています。Tailwind v4 の `@theme` でこれらを Tailwind トークン (`bg-mesh-blue`, `text-text-1`, ...) として再公開しているので、新規コードは Tailwind ユーティリティで書きつつ、既存の `style={{ color: "var(--mesh-blue)" }}` のような inline 指定もそのまま動作します。

色の意味:

| 役割 | 値 | Tailwind |
| --- | --- | --- |
| 主アクセント (青) | `--mesh-blue` `#2563EB` | `bg-mesh-blue` |
| 副アクセント (teal) | `--teal` `#0D9488` | `bg-teal` |
| 警告 | `--warn` `#B45309` | `bg-warn` |
| ベース面 | `--bg-shell` `#F6F7F9` | `bg-bg-shell` |
| 主要テキスト | `--text-1` `#0F172A` | `text-text-1` |

## localStorage

Setup で登録した Provider はキー `flovia:providers` の下に `StoredProvider[]` として保存されます。形は [`lib/types.ts`](lib/types.ts) を参照。初回訪問時は `flovia:initialized` センチネルが立っていないと、デモ用の3エントリが seed されます。手動で localStorage をクリアすれば再 seed されます。

## デプロイ

現時点の標準起動は monorepo の Docker Compose です。BFF と同じ contract / fixture に対して検証できるよう、frontend 単独デプロイより workspace 内での検証を優先します。
