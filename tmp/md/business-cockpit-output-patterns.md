# Business Cockpit output patterns

大局観を掴むための発散アウトプット集。

## 前提

- 目的は「ビジネスで使える」感触を掴むこと。
- データ精度より、意思決定・営業・提携・CSにつながるインサイト価値を優先。
- マクロ分析とミクロ分析は必ず明確に分ける。
- 現状データ版では、既存の `MacroMetricsDemoData` / `MacroMetricsViewModel` から作れるものを優先。
- 理想版では、Sponge / Dexter などの決め打ちタグ、推定価値、確度、次アクションなどを自由に足す。

## 現状データで実現できる材料

Current source:

- `apps/frontend/lib/macro-metrics/demo.ts`
- `apps/frontend/lib/macro-metrics/metrics.ts`
- `apps/frontend/components/macro-metrics/MacroMetricsScreen.tsx`

使える軸:

- Wallet: address, label, segment
- Source: Claude Code, Cursor, n8n, API relay, curl
- Intermediary: Privy, Circle Wallets, Coinbase CDP, Safe, Direct
- Service: Northwind Price API, VectorMind, RouteZero, SignalPort, VaultLayer, StreamDelta, LedgerLake
- Endpoint category: pool_search, trending_pools, simple_price, token_price, token_detail
- Event: timestamp, spendAtomic, txCount, sessionId
- Recommendation: upsell, co-marketing, reprice, retention-lift

現状で作れるビジネスアウトプット:

- 高支出Walletリスト
- Repeat wallet segment
- Source別ランキング
- Intermediary別ランキング。ただし現コードは source ranking 中心なので追加集計が必要
- Other service candidates
- Endpoint co-usage / flow
- Growth recommendations
- Executive takeaways

理想版で足したいもの:

- Sponge / Dexter など商談で使う中間業者タグ
- Wallet owner / account / company名
- 営業担当、次アクション、期限
- 推定ARR、推定LTV、失注/離脱リスク
- CRM連携状態
- Partner opportunity score
- 市場サイズ、提携優先度、チャネルROI

---

# Pattern 1: Current Data Reality Dashboard

## 狙い

今あるデータだけで「これは実装できそう」と感じる現実路線。

## ページ構造

### Macro

- Executive takeaways
- Paid active wallets / total spend / paid tx
- Source / intermediary performance
- Other service candidates
- Endpoint flow

### Micro

- Top wallets by spend
- Repeat wallets
- Wallet × segment table
- Walletごとの利用サービス、最終利用、支出

## 価値

- 開発コストが低い
- 今のMacro Metricsを再編集して作れる
- ただし事業インパクトはやや弱い

## 弱点

- Sourceが Claude Code / Cursor / n8n なので、会議で出た Sponge / Dexter の文脈とはズレる
- 実営業に使うには account / owner / action が足りない

---

# Pattern 2: Ideal Agnostic Opportunity Platform

## 狙い

データ制約を外して、理想の「事業開発OS」を描く。

## ページ構造

### Macro

- Intermediary market map: Sponge / Dexter / Direct / Others
- Channel ROI
- Partner fit score
- Market whitespace map
- Service adjacency graph
- Segment growth and retention

### Micro

- Account / Wallet 360
- Next best action
- Estimated ARR / LTV
- Confidence and reason
- CRM action queue

## 価値

- 「これが欲しい」という方向性を掴みやすい
- 事業側に刺さりやすい
- データ定義の要求が明確になる

## 弱点

- 現状データからは作れない項目が多い
- デモでは割り切ってモックにする必要がある

---

# Pattern 3: Hybrid Business Cockpit

## 狙い

今あるデータをベースにしつつ、Sponge / Dexter などのデモ用タグとアクション項目だけ足す。

## ページ構造

### Top

- 3つの意思決定カード
  - Sponge: 高支出・低再訪
  - Dexter: 高継続・アップセル向き
  - Direct: 低単価・頻度高め

### Macro

- Intermediary performance
- Co-usage opportunity
- Segment insight

### Micro

- Target wallets
- Next best action
- Action flags

### Bottom

- 今週やること

## 価値

- デモとして一番バランスが良い
- 現状実装にも近い
- 「ビジネスで使える」感を最も出しやすい

## 弱点

- モック/決め打ちであることは明示すべき

---

# Pattern 4: Sales Action Queue

## 狙い

ダッシュボードではなく、営業担当が今日動くためのキュー。

## ページ構造

### Macro

- 全体のOpportunity pipeline
- Priority別件数
- Source別の営業機会

### Micro

- 1行1Wallet/Account
- Why now
- Suggested message
- Next action button
- Owner / due date

## 価値

- もっとも実務に直結
- 「使える/使えない」の判定が明確

## 弱点

- CRM的なデータがないと理想には届かない

---

# Pattern 5: Partner Strategy Map

## 狙い

Sponge / Dexter など中間業者との提携判断に振り切る。

## ページ構造

### Macro

- Intermediary portfolio matrix
  - Spend
  - Repeat rate
  - Growth
  - High-value wallet ratio
- Partner priority score
- Recommended partnership play

### Micro

- 各中間業者に属する代表Wallet
- その中間業者に効くユースケース
- 提携時に狙うService bundle

## 価値

- 会議キーワードとの整合性が高い
- BD/経営向けに強い

## 弱点

- Wallet営業より提携戦略寄りになる

---

# Pattern 6: Wallet Command Center

## 狙い

個別Walletを売上・継続・アップセル観点で深掘り。

## ページ構造

### Macro

- Wallet portfolio summary
- High value / dormant / growing / one-off segmentation

### Micro

- Selected wallet profile
- Usage timeline
- Co-used services
- Next best action
- Similar wallets

## 価値

- ミクロ分析の価値が最も伝わる
- 営業/CSが使いやすい

## 弱点

- マクロの大局観は弱くなる

---

# Pattern 7: Executive Board Memo

## 狙い

画面ではなく、経営向けの1枚メモとして見せる。

## ページ構造

- TL;DR 3 bullets
- What changed
- So what
- Recommended actions
- Proof metrics
- Risks / assumptions

## 価値

- データ精度が粗くても、示唆を届けやすい
- 会議資料として強い

## 弱点

- プロダクトUIとしては弱い

---

# Pattern 8: Opportunity Heatmap

## 狙い

「どこに機会が空いているか」を視覚的に示す。

## ページ構造

### Macro

- Segment × Service heatmap
- Intermediary × Service heatmap
- Co-usage lift heatmap

### Micro

- クリックしたセルのWallet一覧
- 推定機会額
- Recommended action

## 価値

- マクロ/ミクロの切替が自然
- クロスセルの説明に強い

## 弱点

- データが薄いと見た目倒れになる

---

# Pattern 9: Narrative Funnel

## 狙い

認知 → 利用 → 継続 → 拡張 というビジネスファネルで整理。

## ページ構造

### Macro

- Acquisition by source/intermediary
- Activation: first paid usage
- Retention: repeat usage
- Expansion: multi-service / upsell

### Micro

- 各段階で詰まっているWallet
- 次アクション

## 価値

- ビジネス理解がしやすい
- 「なぜこの指標を見るのか」が明確

## 弱点

- Funnel定義が必要

---

# Pattern 10: Three Lenses Page

## 狙い

同じデータを3つのレンズで見せる。

## Lenses

1. Channel lens: Sponge / Dexter / Direct
2. Service lens: Provider / Endpoint / Co-usage
3. Customer lens: Wallet / Segment / Action

## 価値

- 大局観を掴む探索に向く
- 会議で議論が広がりやすい

## 弱点

- 初回実装としては散らかりやすい

---

# Pattern 11: Demo Theater

## 狙い

精度ではなく「価値が伝わるストーリー」に全振り。

## 流れ

1. Spongeは高支出だが休眠化
2. Dexterは継続率が高い
3. Provider A×B併用層はService Cに反応しやすい
4. 今週の営業リストを生成
5. Next actionsを出す

## 価値

- デモで強い
- 投資判断を引き出しやすい

## 弱点

- 実データとの対応は後で詰める必要がある

---

# Pattern 12: Metrics Catalog Reframed as Insight Catalog

## 狙い

Full Metrics Catalogを捨てずに、見せ方を変える。

## カード構造

- Insight
- Business action
- Evidence metrics
- Data status
- Macro/Micro label

## 価値

- 既存実装の再利用性が高い
- 「指標一覧」から「意思決定カタログ」に変わる

## 弱点

- 1枚のキラー画面としては弱め

---

# 優先度案

1. Hybrid Business Cockpit
2. Sales Action Queue
3. Partner Strategy Map
4. Opportunity Heatmap
5. Insight Catalog reframing

最初に作るべきは Hybrid Business Cockpit。現状データと理想デモの間を取り、会議キーワードにも一番つながる。
