---
name: PoC 画面構成
description: 画面一覧・レイアウト方針・ナビゲーション・遷移パターン・デモストーリー
type: project
---

# PoC 画面構成

> 最終更新: 2026-04-28

## ★ アクセスモデル (再掲)

**完全フラット** — すべての Provider ページが誰でも見える。認証なし。
ユーザーが入力した `pay_to` は **localStorage** に保存し、簡単に切替・削除できる。

## ★ 画面一覧

| # | 画面名 | パス (案) | 役割 |
|---|---|---|---|
| 0 | **Setup / Onboarding** | `/setup` | 初回。`pay_to` アドレス登録 |
| 1 | **My Customers** | `/providers/[providerId]/customers` | 当該 Provider の顧客ウォレット一覧 |
| 2 | **Wallet 360°** | `/providers/[providerId]/wallet/[address]` | 個別ウォレット詳細 (主役画面) |
| 3 | **Co-usage Patterns** | `/providers/[providerId]/patterns` | 集約ビュー (戦略示唆) |
| - | (Provider 一覧) | `/providers` | 公開ディレクトリ (オプション) |

## ★ ナビゲーション構造

### サイドバー (固定表示)

```
┌─────────────────┐
│  [Flovia logo]  │
├─────────────────┤
│ 📊 Customers    │
│ 🔀 Patterns     │
│ ⚙️  Setup        │
├─────────────────┤
│ Currently       │
│ viewing:        │
│ 🟢 Acme Image   │
│    API   [▼]    │ ← 登録済 pay_to から切替
└─────────────────┘
```

### Provider セレクター (サイドバー下部 + ヘッダー)

- localStorage に保存した `pay_to` 一覧から選択
- セレクター内の各エントリに **削除ボタン (×)** を表示
- 「+ Add new pay_to」 → Setup 画面へ

## ★ 画面遷移パターン

| 起点 | アクション | 遷移先 |
|---|---|---|
| Customers の行 | クリック | Wallet 360° (同 Provider 内) |
| Wallet 360° の併用 Provider タグ | クリック | **他社 Provider の My Customers** |
| Wallet 360° の Co-usage Map ノード | クリック | **該当 Provider の My Customers** |
| Insight カードの Provider 言及 | クリック | 該当 Provider の My Customers |
| Provider セレクター | 選択 | 同じ画面種別を選択 Provider で開き直す |

「他社 Provider のページ」も特別扱いせず、同じ URL 構造で開く (= フラット)。

---

## ★ 画面0: Setup / Onboarding

### 初回フロー

```
┌──────────────────────────────────────────────┐
│  Welcome to Flovia                            │
│                                               │
│  あなたの API の pay_to アドレスを登録すると、  │
│  x402 経由の顧客ウォレットを可視化できます       │
│                                               │
│  ┌──────────────────────────────────────┐    │
│  │ Provider Name (任意)                  │    │
│  │ [Acme Image API                    ]  │    │
│  │                                       │    │
│  │ Mode:                                 │    │
│  │ (●) Simple — pay_to 1 つだけ          │    │
│  │ ( ) Advanced — API パスごとに pay_to  │    │
│  │                                       │    │
│  │ pay_to address                        │    │
│  │ [0x...                              ] │    │
│  │                                       │    │
│  │ [Save & Continue]                     │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

### 詳細仕様

- **Simple モード**: `pay_to` 1 つだけ入力。Provider 全体で 1 アドレスの顧客向け
- **Advanced モード**: API パス + `pay_to` のペアを複数登録。パスごとに別アドレスを使う顧客向け
  ```
  API path: /v1/generate     → pay_to: 0xabc...
  API path: /v1/upload       → pay_to: 0xdef...
  [+ Add another path]
  ```
- 登録後は localStorage に保存 → サイドバーの Provider セレクターに表示
- 「Save & Continue」で My Customers (`/providers/[providerId]/customers`) に遷移
- **データ準備中状態**: 登録直後はモック上 "集計中..." のスケルトンを 1〜2 秒見せてからデータ表示 (リッチ感演出)

### 設定画面 (登録後の管理)

`/setup` を再度開くと管理モードになる:

- 登録済み `pay_to` の一覧
- 各エントリの編集 / 削除ボタン
- 新規追加 (別 Provider として複数登録可)

---

## ★ 画面1: My Customers

自社 (or 任意 Provider) の API を叩いているウォレット一覧。エントリ画面。

### 構成要素

```
┌────────────────────────────────────────────────────────────────────┐
│ Acme Image API — Customers                       [期間: 30d ▼]    │
├────────────────────────────────────────────────────────────────────┤
│ Filter: [Agent ▼] [Endpoint ▼] [Sort: Revenue ▼]                  │
├────────────────────────────────────────────────────────────────────┤
│ Wallet              Agent      Revenue    Used Endpoints           │
│                                                       Co-used with │
├────────────────────────────────────────────────────────────────────┤
│ 0x1234...abcd  🟢  Claude Code  $1,240   /v1/generate, /v1/upload │
│                                                  [Storage A][Notify B][Auth C] │
│                                                  ⭐ Loyal           │
├────────────────────────────────────────────────────────────────────┤
│ 0x5678...efgh  🟢  Cursor       $820     /v1/generate              │
│                                                  [Storage A][Data D] │
│                                                  📈 Growth Potential│
├────────────────────────────────────────────────────────────────────┤
│ ...                                                                │
└────────────────────────────────────────────────────────────────────┘
```

### カラム

- **Wallet** (masking: `0x1234...abcd`)
- **Agent** (Claude Code / Cursor / 自作 bot 等)
- **Revenue** (当該 Provider での売上 USD)
- **Used Endpoints** (上位 3 個)
- **Co-used with** (併用 Provider TOP3 をミニタグ)
- **Status バッジ** (Loyal / Growth Potential / Cohort maturing 等)

### 遷移

- 行クリック → Wallet 360°
- 併用タグクリック → 該当 Provider の My Customers
- Sort: Revenue / Co-usage 度 / Retention / 直近活動

---

## ★ 画面2: Wallet 360° (デモの主役)

個別ウォレットの全体像。**Activity Timeline を主役で固定** (Co-usage Map は補強役)。
詳細: [10_design_review.md](10_design_review.md) / 主役判断は D14 で確定。

### 要素の優先順位 (デモ脚本に基づく)

| 優先度 | 要素 |
|---|---|
| 1 | **Identity bar** の business summary (Monthly spend / 7d growth / Free tier progress / **Entry-point Badge**) |
| 2 | **Activity Timeline** (主役) + Workflow Summary Strip |
| 3 | **Upsell Opportunity Card** (Insight stack 内) |
| 4 | Co-usage Map (証拠補強) |
| 5 | その他 Insight cards |

### クリティカル UI 要素 (デモ脚本必須)

1. **Free Tier Progress Bar** — Identity bar に配置。80% 超で発光
2. **7d Volume Sparkline** — `7d growth` 数値の横、急増を一目で
3. **Upsell Opportunity Card** — `Recommended plan` / `Why now` / `Projected monthly expansion`
4. **Workflow Summary Strip** — Timeline 上部に `Price API → LLM → DEX → Discord` を 1 行で
5. **Entry-point Badge** — `Your API is step 1 in 87% of observed loops`

### レイアウト

```
┌──────────────────────────────────────────────────────────────┐
│ Wallet  0x1234...abcd  🟢 Claude Code                         │
│ Total spent: $3,420   Active: 28d   First seen: 2026-03-30   │
├──────────────────────────────────────────────────────────────┤
│ ★ Activity Timeline (主役)                                    │
│ ─────────────────────────────────────────────────────────    │
│ 2026-04-27 14:23  [Acme Image API]   /v1/generate    $0.05  │
│ 2026-04-27 14:24  [Storage A]        /upload         $0.01  │
│ 2026-04-27 14:25  [Notify B]         /send           $0.002 │
│ 2026-04-27 14:50  [Acme Image API]   /v1/generate    $0.05  │
│ 2026-04-27 14:51  [Storage A]        /upload         $0.01  │
│ ...                                                          │
│ [Load more] [Filter by Provider ▼]                           │
├──────────────────────────────┬───────────────────────────────┤
│ Co-usage Map (ネットワーク図) │ Insight Cards                  │
│                              │ ────────────                   │
│   [Acme]                     │ • Storage A と併用率 82%        │
│    │  ╲                      │ • Notify B との連続実行多数      │
│    │   ╲                     │ • 平日昼間に活動集中             │
│   [Storage A]──[Notify B]    │ • 直近 7 日で利用増加傾向         │
│                              │                                │
└──────────────────────────────┴───────────────────────────────┘
```

### 上部: ウォレットサマリ

- アドレス (masking)
- 総 x402 支出
- アクティブ期間 (first_seen 〜 last_seen)
- エージェント種別

### 主役: Activity Timeline

- **時系列に各 x402 リクエストを並べる**
- 各行: 時刻 / Provider / API パス / 金額
- 自社 Provider 行はハイライト (色違い or 太字)
- フィルタ: Provider 別、期間別
- 意図解釈はしない (「どの順番で・どの x402 リクエストをいつ使ったか」を素直に見せる)

### 中央左: Co-usage Map (補助)

- Force-directed ネットワーク図
- 中心 = 当該 Provider, 周辺 = 併用先
- 線の太さ = 併用頻度
- ノードクリック → 該当 Provider の My Customers へ遷移

### 中央右: Insight Cards

- 自動生成風の固定文言で OK (PoC はテンプレ)
- フェードインアニメーション
- 例: 「Storage A と併用率 82%」「平日昼間に活動集中」

### 削除した要素

- **Sankey は削除** (時系列タイムラインで代替できる)

### Activity Timeline の視覚補助 (脚本要件)

- 同一ワークフローの 4 行 (Price → LLM → DEX → Discord) を **薄い縦ガイドで束ねる** (Workflow Grouping)
- 自社行のみ Teal hairline で強調
- これにより a (理解の獲得) の理解速度が決まる

---

## ★ 画面3: Co-usage Patterns (集約ビュー)

全顧客ウォレットを集約した、戦略示唆ボード。

### 構成要素

```
┌──────────────────────────────────────────────────────────────┐
│ Co-usage Patterns — Acme Image API                           │
├──────────────────────────────────────────────────────────────┤
│ ★ Bubble Chart                                                │
│  リテンション率                                                 │
│   高 │       ●Storage A                                       │
│      │    ●Notify B                                           │
│      │  ●Auth C       ●Random D                               │
│   低 └────────────────────────────                            │
│      低     併用頻度    高                                     │
│                                                              │
│  → 右上 = 戦略的に重要な併用先 (パートナー候補)                 │
├──────────────────────────────────────────────────────────────┤
│ Workflow Clusters                                            │
│ • Cluster 1: Image gen → Storage → Notify  (52% of wallets)  │
│ • Cluster 2: Image gen → Auth → Storage    (28%)             │
│ • Cluster 3: Image gen → Data API          (15%)             │
├──────────────────────────────────────────────────────────────┤
│ Retention by Agent (サブナラティブ)                           │
│  Claude Code  ████████████ 86%                               │
│  Cursor       ████████ 59%                                   │
│  curl         ██ 14%                                         │
└──────────────────────────────────────────────────────────────┘
```

---

## ★ デモストーリー (3 分)

1. **Setup** で `pay_to` 入力 (デモ用に事前登録済みでもOK)
2. **My Customers** を開く
   - 「ロイヤルなウォレットを 1 つピック」
   - 併用 Provider タグで「あ、このウォレット他社でも色々使ってる」と気付く
3. **Wallet 360°** にドリル
   - **Activity Timeline** を見せる → 「画像生成 → 保存 → 通知の順で叩いてる」と時系列で分かる
   - Co-usage Map で構造的に確認
   - Insight カードで補強
4. **Co-usage Patterns** で全体像
   - バブルで「Storage A は提携優先度トップ」
   - Workflow Clusters で「3 種類のワークフローパターン」
   - Retention で「健全な顧客基盤」

---

## ★ リッチ感の演出

| 要素 | 演出 |
|---|---|
| 画面開いた瞬間 | サマリ数値のカウントアップアニメーション |
| Co-usage Map | フェードイン → ノードがフォースで配置される |
| Insight カード | 順番にフェードイン (stagger) |
| ローディング | スケルトンスクリーン (リッチ感) |
| 初回 Setup 後 | "集計中..." 表示 1〜2 秒 → データ表示 |

ライブ感 (リアルタイム決済フィード等) は PoC では入れない。

---

## ★ 状態 (空 / ローディング / エラー)

| 状態 | 表現 |
|---|---|
| ローディング (通常) | スケルトンスクリーン |
| データ準備中 (初回 Setup 直後) | "集計中..." メッセージ + プログレス風表示 |
| 空 (該当データなし) | 「まだ x402 リクエストがありません」+ Setup へのリンク |
| エラー | (PoC ではモックなので最小限。"データ取得に失敗しました" 表示のみ) |