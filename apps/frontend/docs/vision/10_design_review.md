---
name: 設計レビュー (デモ脚本との整合)
description: 脚本に合わせた既存設計の再評価と修正方針
type: project
---

# 設計レビュー (デモ脚本との整合)

> 最終更新: 2026-04-28
> 出典: [Codex 提案](/tmp/flovia-codex-review/demo_script.md)
> 目的: [08_demo_script.md](08_demo_script.md) を最大限活かすため、既存設計 (01-07) を再評価

## ★ 総評 (Codex)

> 現在の PoC 設計はかなり良い。`Customers → Wallet 360° → Patterns` の導線は、3 分デモに必要な起承転結を持っている。
>
> ただし、今回の脚本を最大化するには **`Wallet 360°` の上部要約と Insight の営業寄り表現を強化し、逆に Setup と Patterns はさらに脇役化する** のが正しい。

---

## ★ 重要決定: Wallet 360° の主役は Timeline で固定

[01_screens.md](01_screens.md) と [07_moodboard_per_screen.md](07_moodboard_per_screen.md) で揺れていた「Timeline 主役 vs Co-usage Map 主役」の論点を、**Timeline 主役で固定** とする。

### 理由

> 売るべき価値は「ネットワークが綺麗」ではなく、
> 1. **自社 API が顧客の何の仕事に組み込まれているか分かる** (a)
> 2. **誰に何を売るべきか分かる** (b)
>
> の 2 点。クライマックス a は **タイムラインでしか成立しない**。Map は補強役。

### 序列 (Wallet 360°)

| 優先度 | 要素 |
|---|---|
| 1 | Identity bar の **business summary** (Monthly spend / 7d growth / Free tier progress) |
| 2 | **Activity Timeline** (主役) |
| 3 | **Upsell insight** card |
| 4 | Co-usage Map (証拠補強) |
| 5 | その他 Insight cards |

---

## ★ 追加すべきクリティカル UI 要素 (5 つ)

脚本のクライマックスを成立させるために **新規追加** が必要な要素。

### 1. Free Tier Progress Bar
- 場所: Wallet 360° の Identity bar
- 表示例: `Free tier: 92%`
- 80% 超から subtle な強調 (バーの該当部分が静かに発光)
- **クライマックス b (Scene 6) に必須**

### 2. 7d Volume Sparkline
- 場所: Identity bar の `7d growth` 数値の横
- 細い sparkline で「急増」を数字より速く伝える
- 数字 (`+184%`) のみだと弱い

### 3. Upsell Opportunity Card
- 場所: Wallet 360° の Insight stack 内
- 単なる分析結果ではなく、以下を含める:
  - `Recommended plan` (例: `Pro Trading 250M`)
  - `Why now` (= 急増理由 + 無料枠到達)
  - `Projected monthly expansion` (推定アップセル金額)
- **クライマックス b の中核**

### 4. Workflow Summary Strip
- 場所: Activity Timeline の上部
- 表示例: `Price API → LLM → DEX → Discord`
- タイムラインを読まなくても **一撃でワークフローが分かる** 補助
- a の理解速度を決める

### 5. Entry-point Badge
- 場所: Identity bar or Insight 最上段
- 表示例: `Your API is step 1 in 87% of observed loops`
- 事業者が一番反応するポイント。**かなり強い契約動機**

---

## ★ Activity Timeline に追加すべき視覚補助

### Workflow Grouping
- 同一ワークフローの 4 行 (Price → LLM → DEX → Discord) を **薄い縦ガイドで束ねる**
- 自社行のみ Teal hairline で強調
- a の理解速度を決定する

### "Your API is the entry point" 表現
- Insight card の最上段に短く配置
- 「うちが起点になっている」事実を即時に伝える

---

## ★ 削れる要素 (デモでは見せない / 弱める)

### Setup
- **Provider Name 入力** → デモでは不要 (`pay_to` のみで十分)
- **Advanced モード説明の厚み** → 視覚的に弱める (存在は OK)

### My Customers
- **過剰なフィルタ** → `Agent / Sort / Status` 程度に絞る (多いとデモの焦点が散る)
- 「一覧」ではなく **「次にクリックすべき 1 行を気持ちよく見つける画面」** に寄せる

### Co-usage Patterns
- **補助チャート全般** → サブ扱いなので Bubble Chart 以外はかなり抑える
- 「全体でも再現する」で十分、説明しすぎない

---

## ★ 各画面の優先順位 (デモ脚本ベースで再提案)

### `/setup`
1. 既登録 `pay_to`
2. `Continue to Customers`
3. 新規追加
4. Advanced モード

→ デモでは「もう登録済み」が前提。**入力体験よりも "すぐ始められる" 印象を優先**

### `/providers/[id]/customers`
1. **主役ウォレット行**
2. `Status` (Growth Potential 等)
3. `Free tier progress`
4. `7d growth`
5. `Co-used with`

→ **次にクリックすべき 1 行を気持ちよく見つける画面**

### `/providers/[id]/wallet/[addr]` ★ 最重要
1. **Identity bar の business summary**
2. **Activity Timeline**
3. **Upsell insight**
4. Co-usage Map
5. その他 Insight

→ **Timeline 主役、Map は補強、Insight は営業アクション化**

### `/providers/[id]/patterns`
1. Bubble Chart
2. 高頻度 bot クラスタのラベル
3. そのクラスタの共通ワークフロー短文
4. 補助比較

→ サブ扱い、説明過多にしない

---

## ★ 既存ドキュメントへの反映

このレビュー結果に基づき、以下のドキュメントを更新が必要:

| ドキュメント | 更新内容 |
|---|---|
| [01_screens.md](01_screens.md) | Wallet 360° に追加 UI (Upsell Card / Free Tier Bar / Sparkline / Workflow Strip / Entry-point Badge) を反映、Timeline 主役で確定 |
| [07_moodboard_per_screen.md](07_moodboard_per_screen.md) | Wallet 360° の主役論点を解決済みに更新 |
| [05_decisions_log.md](05_decisions_log.md) | D14 として「Wallet 360° は Timeline 主役で確定」を追記 |
| [03_data_model.md](03_data_model.md) | 主役ウォレットのモックデータを Activity Timeline サンプルに合わせる旨追記 |
