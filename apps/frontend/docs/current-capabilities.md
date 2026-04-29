# Flovia PoC Frontend — 現状ケイパビリティ

最終更新: 2026-04-29

このドキュメントは、現在の poc-frontend が **何を見せられて何を見せられないか** を整理したものです。実装の現状と、PoC の射程内で意図的に切り落としている領域を明示します。

---

## 1. 全体アーキテクチャ

```
[Browser]
   │
   ▼
[Next.js 15 App Router (poc-frontend)]
   │  Server Component が fetch (cache: no-store)
   ▼
[Flovia BFF (apps/bff, Bun + bun:sqlite)]   ← localhost:3001
   │
   ▼
[demo.db (SQLite, seed-demo.ts で投入)]
```

- フロントエンドは **データを保持しない**。全画面が Server Component 内で BFF を叩いて DTO を取得し、そのままコンポーネントに流す。
- BFF は **読み取り専用**。書き込み・取り込み・スコアリングは行わない（README §「対象外」）。
- データは `apps/bff/scripts/seed-demo.ts` が `demo.db` に投入する固定セット（payer 5 / provider 4 / observation 29）。

### 起動

```bash
# BFF
cd ../poc/apps/bff
DATABASE_URL=./demo.db bun ./scripts/seed-demo.ts
DATABASE_URL=./demo.db bun src/server.ts          # http://localhost:3001

# Frontend
cd poc-frontend
NEXT_PUBLIC_BFF_URL=http://localhost:3001 pnpm dev # http://localhost:3000
```

---

## 2. 画面別: 何が見えるか

### 2.1 `/setup`

| 内容 | 状態 |
| --- | --- |
| プロバイダ名・mode（simple / advanced）・pay_to の登録フォーム | ✅ 動作 |
| simple モード: 単一 pay_to を保存 | ✅ |
| advanced モード: API path × pay_to 複数行を保存 | ✅ |
| バリデーション (pay_to 必須 / advanced は最低1行) | ✅ |
| localStorage への永続化 (`flovia:providers`) | ✅ |
| 初回訪問時の demo 3 プロバイダ seed (`acme-price` / `lumen-vec` / `halonet`) | ✅ |
| 保存済みプロバイダの一覧表示・削除 (確認ダイアログ付き) | ✅ |

**注意**: Setup で登録した `providerId` は **サイドバー上の表示識別子**にすぎず、BFF 側のデータスコープには影響しません。BFF はプロバイダ単位の絞り込み API を持ちません。

---

### 2.2 `/providers/[providerId]/customers` — Customers 一覧

[CustomersPage](../app/providers/%5BproviderId%5D/customers/page.tsx) が `GET /customers` を呼び、[`CustomerListItemDto[]`](../lib/api/types.ts) を [`CustomersTable`](../components/customers/CustomersTable.tsx) に渡します。

#### 表示できる列
| 列 | DTO フィールド | 備考 |
| --- | --- | --- |
| Wallet | `address` | payer wallet address |
| Spend (atomic) | `spendAtomic` | 6 decimals 仮定で `formatAtomic` 整形 |
| Observations | `observationCount` | 観測されたオンチェーン支払い件数 |
| Providers | `providerCount` | この payer が支払った recipient wallet の異なり数 |
| Activity growth | `activityGrowth` | 観測列の前半/後半比（BFF heuristic） |
| Last seen | `lastSeenAt` | unix sec → ISO 文字列 |
| Upsell | `upsellOpportunity` | `low` / `medium` / `high` を `UpsellPill` で表示 |

#### サマリーチップ
- Wallets 総数
- 累積 Spend (atomic)
- High-upsell 件数 (`upsellOpportunity = high`)

#### 制限
- **検索ボックス・Sort・Upsell フィルタは UI のみ（PoC: not wired）**。クリックしても効かない。
- 行クリックで Wallet 360° に遷移するナビゲーションは動作する。

---

### 2.3 `/providers/[providerId]/wallet/[address]` — Wallet 360°

[WalletPage](../app/providers/%5BproviderId%5D/wallet/%5Baddress%5D/page.tsx) が `GET /customers/:address/profile` を呼び、[`CustomerProfileDto`](../lib/api/types.ts) を [`WalletScreen`](../components/wallet/WalletScreen.tsx) に渡します。404 時は専用エラー画面を表示。

#### IdentityBar (上段)
- payer wallet address (mono フォントで全長表示) + コピー UI
- `customer.label` （現状の seed では常に `null` → "Payer wallet" 表示）
- `customer.role` / `customer.identityBasis`
- `customer.caveat`（"wallet-address based and do not claim verified human identity"）
- KPI: Total spend (atomic) / Activity growth (%) / Free tier progress (% + バー)
- Entry-point ratio: `metrics.entryPointRatio` を「観測のうち attribution candidate と一致した比率」として表示

#### ActivityTimeline (左)
- `profile.timeline[]` を時系列に列挙
- イベント種別: `payment` / `provider_usage` / `growth` / `upsell_signal` をバッジで色分け
- 各行: timestamp / 種別 / title + description / providerId / txHash / amount (atomic)

#### 右カラム
1. **UpsellCard** — `metrics.upsellOpportunity` をヘッドライン化。Heuristic 入力 (free-tier / activity growth / entry-point ratio / spend atomic) を一覧。「PoC-grade で production analytics ではない」旨の注記入り。
2. **ProviderUsageList** — `profile.providers[]` を表示（providerId / payTo 短縮 / tx 数 / 最終観測時刻 / spend atomic）。ソート順は BFF が tx 数降順 + 名前昇順。
3. **InsightsList** — `profile.insights[]` を `severity` 別 (info / opportunity / warning) に表示。

#### 制限
- 月次 / 7日窓のような **時間窓集計が無い**（BFF は累計のみ）。"Monthly spend" は廃止して "Total spend" 表示に。
- "API path"（`/v1/price/history` 等）の概念は無い（BFF は endpoint URL を提供しない）。
- agent 種別（"Claude Code" / "Cursor" 等）の概念は無い。

---

### 2.4 `/providers/[providerId]/patterns` — Co-usage Patterns

[PatternsPage](../app/providers/%5BproviderId%5D/patterns/page.tsx) が `GET /wallet-usage-graph` を呼び、[`WalletUsageGraphDto`](../lib/api/types.ts) を [`PatternsScreen`](../components/patterns/PatternsScreen.tsx) で散布図に変換します。

#### BubbleChart
- 各バブル = recipient wallet（provider）
- X軸: ユニーク payer wallet 数（最大値で正規化）
- Y軸: 平均 observation 数 / payer（最大値で正規化）
- 半径: payer wallet 数に比例
- 配色: 右上ほど teal（"partnership candidate"）、左下ほど slate
- バブルクリック → `/providers/[providerId]/customers?co-used=<payTo>` に遷移（クエリ自体は現状 UI に効かない）
- グラフ上部に `identityFieldsExcluded` 配列を表示（BFF が除外している identity-bearing field 一覧）

#### 制限（BFF が原理的に提供しない領域）
- ❌ "Workflow clusters" (Hourly trading loop 等の workflow 名+割合) — 観測列の時系列クラスタリングが BFF にない
- ❌ "Retention by agent" — agent type が BFF にない
- これらは UI から削除済み。

---

## 3. データセット (`seed-demo.ts`)

| Payer wallet | observation | provider | 性格 |
| --- | --- | --- | --- |
| `0xpayer...bot1` (Trading bot α) | 12 | 4 全部 | 加速、累計 spend 6.9M atomic |
| `0xpayer...claude` | 6 | price + vector | 安定 |
| `0xpayer...cursor` | 4 | price のみ | 単一プロバイダ |
| `0xpayer...n8nflow` (n8n workflow) | 5 | price + signal | 減衰、`activityGrowth = -0.33` |
| `0xpayer...curl1` | 2 | route のみ | 一発勝負 |

| Provider wallet | entityId | name |
| --- | --- | --- |
| `0xprovider...price` | acme-price | Acme Price API |
| `0xprovider...vector` | vectormind | VectorMind AI |
| `0xprovider...route` | routezero | RouteZero DEX |
| `0xprovider...signal` | signalport | SignalPort |

その他の集計テーブル（`daily_metrics` / `recipient_summaries` / `relayer_summaries` / `provider_endpoint_claims` / `attribution_candidates`）も seed が投入済み。

スクリプトは再実行可能（既存 `demo.db` / `-wal` / `-shm` を削除して再投入）。

---

## 4. BFF エンドポイントとフロントの利用状況

| Endpoint | フロントでの利用 | 備考 |
| --- | --- | --- |
| `GET /health` | 未使用 | 疎通確認用 |
| `GET /summary` | 未使用 | フロントに表示する場所がない |
| `GET /observations` | 未使用 | 全観測 raw data |
| `GET /attribution-candidates` | 未使用 | 候補生データ |
| `GET /metrics/daily` | 未使用 | 7日窓 sparkline 等を作るときに使える |
| `GET /wallets/payers` | 未使用 | `/customers` で代替 |
| `GET /wallets/recipients` | 未使用 | recipient 視点はまだ画面化なし |
| `GET /wallets/relayers` | 未使用 | relayer の概念が UI に無い |
| `GET /wallet-usage-graph` | ✅ Patterns | BubbleChart の入力 |
| `GET /customers` | ✅ Customers | テーブル + サマリー |
| `GET /customers/:address/profile` | ✅ Wallet 360° | 全カード |

---

## 5. 型・データ整合性

- BFF DTO のフロント側ミラーは [`lib/api/types.ts`](../lib/api/types.ts) に集約。BFF (`apps/bff/src/api/customer-dto.ts`) と一対一で対応。
- API 呼び出しは [`lib/api/client.ts`](../lib/api/client.ts) のみ。`fetch` は `cache: "no-store"` 固定、404 は profile のみ `null` を返し、それ以外は throw。
- `pnpm typecheck` / `pnpm lint` はクリーン。
- 通貨換算は行わない。すべて atomic unit string のまま `formatAtomic`（既定 6 decimals = USDC 相当）で表示。
- `localStorage` に保存しているのは Setup で登録した `StoredProvider[]` のみ。BFF データは保存しない。

---

## 6. 意図的に提供していないこと

PoC の射程外として **明示的に落としている**機能。BFF README と整合する。

| 機能 | 理由 |
| --- | --- |
| Agent 種別の表示・フィルタ | BFF は agent type / human user 推論を行わない |
| API path / endpoint URL の表示 | BFF は endpoint URL を将来の enrichment source 待ちとして提供しない |
| Workflow cluster (hourly loop 等) | 観測列のクラスタリング処理が BFF / CLI に無い |
| Retention by agent | 上記理由 |
| 通貨換算 (USD 表示) | BFF は atomic unit のまま返すと宣言 |
| 7日 / 月次の時間窓集計 | BFF が累計のみを返す |
| 検索 / Sort / Filter の実動作 | UI のみ。BFF にクエリ受付がない |
| プロバイダ単位の customer スコープ分割 | BFF は payer wallet 全体集計のみ |
| 書き込み系操作 (取り込み・スコアリング) | BFF が読み取り専用 |

---

## 7. 既知の留保

- **TopBar の "LIVE" / "Updated 2m ago" / "Last 30d" はダミー文言**。BFF に live 状態の概念がない。
- **Toolbar の Search / Sort / Upsell セレクタは PoC: not wired**。
- **Wallet 360° の "Free tier progress" は BFF heuristic** (`spend < 3M atomic` で線形)。production analytics ではない。
- **Entry-point ratio の意味が UI から分かりづらい**。"観測のうち attribution candidate と紐付いたものの比率" であり、"hourly loop の最初に登場する割合" ではない（BFF heuristic）。

---

## 8. 拡張余地

短期 (BFF を変更せず可能):
- ダッシュボードトップ画面で `/summary` を表示
- Wallet 360° に `/observations` 由来の txHash → エクスプローラリンクを追加
- `/metrics/daily` を使った日次 sparkline (Customers 列に再投入)

中期 (BFF 拡張が必要):
- 7日 / 月次の時間窓 metrics
- 観測列の workflow clustering
- `/customers` クエリパラメータ（filter / sort / search）

長期 (BFF の射程変更が必要):
- agent type 推論ソースの追加
- 通貨換算（rate provider との連携）
