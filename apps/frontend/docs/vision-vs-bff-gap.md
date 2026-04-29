# 当初ビジョン ↔ BFF 提供データの乖離分析

最終更新: 2026-04-29

このドキュメントは、[`vision/`](vision/) にコピーした **PoC 開発前に固めた前提・脚本** と、現在の BFF (`apps/bff`) が提供するデータの乖離を整理し、**今の BFF で現実的に表現できる範囲** を明示するためのものです。

参照元:
- [00_overview.md](vision/00_overview.md) — ナラティブ / 利用者 / スコープ
- [01_screens.md](vision/01_screens.md) — 4画面の構成
- [02_visualization.md](vision/02_visualization.md) — 3つの可視化（Timeline / Network / Bubble）
- [03_data_model.md](vision/03_data_model.md) — 想定エンティティ
- [08_demo_script.md](vision/08_demo_script.md) — 3分間デモ脚本
- [09_protagonist_wallet.md](vision/09_protagonist_wallet.md) — 主役ウォレット仕様
- [10_design_review.md](vision/10_design_review.md) — クリティカル UI 5要素

現状側:
- [current-capabilities.md](current-capabilities.md) — BFF/フロントの実装現況
- BFF README: `../poc/apps/bff/README.md`

---

## 1. 当初ビジョンの要点（再確認）

### 1.1 ナラティブ
- **メイン**: Co-usage Discovery — 「自社 API を使うウォレットが他にどんな API と組み合わせているか」
- **サブ**: Retention — D14 で残ったエージェントの率
- **視点**: 競合分析ではなく **併用パターン分析**

### 1.2 想定利用者
**API Provider の PM / Growth / DevRel** が、自社のユーザー（= ウォレット）の行動を理解するためのツール。

### 1.3 想定エンティティ（[03_data_model.md](vision/03_data_model.md) より）

| エンティティ | 想定属性 |
| --- | --- |
| Provider | provider_id, name, **category**, pay_to addresses[], **API paths[]** |
| Wallet | address, **agent_type** (Claude Code / Cursor 等), first_seen_at |
| Payment | tx_hash, wallet, provider_id, **api_path**, **amount_usd**, timestamp |
| Co-usage Edge | wallet, provider_a, provider_b, **frequency**, **time_proximity** |
| Workflow Pattern | pattern_id, **sequence[provider_id, ...]**, wallet_count |

### 1.4 デモ脚本のクライマックス（[08_demo_script.md](vision/08_demo_script.md)）

| クライマックス | タイミング | 必要な情報 |
| --- | --- | --- |
| **a. 理解の獲得** | 1:32-1:48 | 「価格 API → LLM → DEX → Discord の毎時ループ」が時系列で見える |
| **b. 売上機会の発見** | 2:24-2:42 | 「Free tier 92%・7d +184% → Pro Trading 250M を提案」のパッケージ |

### 1.5 主役ウォレットの想定スペック（[09_protagonist_wallet.md](vision/09_protagonist_wallet.md)）

| 項目 | 値 |
| --- | --- |
| ウォレット | `0x7A91...C4E8` |
| 推定エージェント種別 | `Self-hosted DeFi Trading Bot` |
| 月支出 | `$3,840` |
| 7d 成長 | `+184%` |
| Free tier 進捗 | `92%` |
| 利用パターン | 毎時 00-03 分に Price → LLM → DEX → Discord |
| Activity Timeline | 12 行（Provider × API path × USD 金額） |

---

## 2. 現状の BFF が提供するもの

| 提供 | 内容 |
| --- | --- |
| ✅ payer wallet | アドレス、観測数、累計 atomic spend、関わった recipient 数、最終観測時刻 |
| ✅ recipient wallet (= provider 候補) | 上記の recipient 視点版 |
| ✅ payment observation | tx_hash, block_timestamp, amount_atomic, payer/recipient/relayer wallet |
| ✅ attribution candidate | observation × `provider_endpoint_claim` のマッチ結果（confidence + reasons） |
| ✅ provider_endpoint_claim | 名前、サービス名、pay_to、network、asset、roles |
| ✅ daily_metrics | 日次の観測数・unique payers/recipients/relayers・累計金額 |
| ✅ wallet usage graph | provider wallet × payer wallet の関係（observations + 他サービス候補） |
| ✅ heuristic | freeTierProgress (PoC 線形)、activityGrowth (前後半比)、entryPointRatio (candidate と紐付いた比率)、upsellOpportunity (low/medium/high) |

**BFF README が明示的に提供しないと宣言しているもの**:

- ❌ `tx.from` を **人間ユーザー / agent_type** として断定
- ❌ endpoint URL / resource URL / referrer / HTTP semantics
- ❌ agent type 推論
- ❌ upsell 関連の "プラン名" や "推定 MRR"
- ❌ 通貨換算（USD / 法定通貨）
- ❌ 取り込み・スコアリング・再集計などの書き込み

---

## 3. 乖離マップ（ドメイン要素別）

凡例: ✅ 取れる / ⚠️ 部分的に近似可能 / ❌ BFF 射程外

### 3.1 ナラティブを支える要素

| 当初ビジョン | BFF で取れるか | 補足 |
| --- | --- | --- |
| Co-usage Discovery（"併用してるか"の発見） | ✅ | `/wallet-usage-graph` の providerWallets × payerWallets 構造で表現可。同一 payer が叩いた他 recipient = 併用先。 |
| 併用パターンの **時系列順序**（"Price → LLM → DEX → Discord"） | ⚠️ | observation の block_timestamp で順序付けは可能だが、**workflow としてのグルーピング（同一サイクルか別サイクルか）は heuristic 必要**。BFF は提供しない。 |
| Retention（D14 残存率） | ❌ | "初回 paid から D14" のコホート分析は BFF にない。`first_seen_at` / `last_seen_at` の差分から自前計算は可能だが、UI 表示には未対応。 |
| 競合 ≠ 併用の視点 | ✅ | データ構造上、同一 payer の異 recipient はそのまま併用関係として読める。 |

### 3.2 想定エンティティ別

| 当初想定の属性 | BFF で取れるか | 補足 |
| --- | --- | --- |
| Provider.name | ✅ | `provider_endpoint_claim.provider_name`。seed-demo では Acme Price API / VectorMind AI / RouteZero DEX / SignalPort |
| Provider.**category** | ⚠️ | claim に `service_name` (Market Data / LLM / DEX Aggregator / Notifications) として近似値あり。BFF DTO には現状未含。 |
| Provider.pay_to addresses[] | ✅ | `pay_to_wallet` |
| Provider.**API paths[]** | ❌ | BFF README で明示的に提供しないと宣言。 |
| Wallet.address | ✅ | payer_wallet |
| Wallet.**agent_type** | ❌ | BFF README で明示的に提供しないと宣言。 |
| Wallet.first_seen_at | ✅ | `first_seen_at` |
| Payment.tx_hash | ✅ | `tx_hash` |
| Payment.wallet | ✅ | `payer_wallet` |
| Payment.provider_id | ✅ | attribution candidate 経由で `entity_id` に紐づく |
| Payment.**api_path** | ❌ | BFF 非提供 |
| Payment.**amount_usd** | ❌ | atomic string のみ。換算は BFF 射程外 |
| Payment.timestamp | ✅ | `block_timestamp` |
| Co-usage Edge.frequency | ✅ | `/wallet-usage-graph` で payer 別の observation 配列が取れるので算出可 |
| Co-usage Edge.**time_proximity** | ⚠️ | `block_timestamp` の差で近似可能。閾値（5分以内? 1時間以内?）は UI 側で決める |
| Workflow Pattern.**sequence** | ⚠️ | 同一 payer の連続する observation を順序付けるところまでは可。クラスタリング（"hourly trading loop" のような名前付け）は BFF 非提供。 |
| Workflow Pattern.wallet_count | ⚠️ | 上記クラスタリングが完成している前提なら算出可 |

### 3.3 Wallet 360° の "クリティカル UI 5要素"（[10_design_review.md](vision/10_design_review.md)）

| 要素 | BFF で取れるか | 補足 |
| --- | --- | --- |
| 1. Free Tier Progress Bar | ✅ | `metrics.freeTierProgress` (0..1)。BFF heuristic は `spend < 3M atomic` で線形。本物の "プラン上限" は BFF にない |
| 2. 7d Volume Sparkline | ⚠️ | `/metrics/daily` から日次の observation 数を取って sparkline 化は可能。フロントで集計が必要 |
| 3. Upsell Opportunity Card | ⚠️ | `metrics.upsellOpportunity` (low/medium/high) はあるが、**"Pro Trading 250M" のようなプラン名や "Projected $890 MRR" は BFF 非提供**。汎用カード（heuristic 入力の表示）に置き換え |
| 4. Workflow Summary Strip ("Price → LLM → DEX → Discord") | ⚠️ | provider 名の並びだけなら observations の順序から組める。**ただし "毎時の loop" として名前を付ける部分は heuristic が必要** |
| 5. Entry-point Badge ("step 1 in 87% of observed loops") | ❌ | "loop の何 % で起点になっているか" は BFF にない。`metrics.entryPointRatio` は別の意味（observation のうち attribution candidate と紐付いた比率）なので置き換え不可 |

### 3.4 デモ脚本の各シーン

| Scene | 内容 | 成立可否 | 代替表現 |
| --- | --- | --- | --- |
| 1. 導入 (`/setup`) | 既登録 pay_to からスタート | ✅ | localStorage seed 3件で動く |
| 2. My Customers から主役選択 | 「24時間動く DeFi bot, 7d +184%, Free tier 92%」 | ⚠️ | `/customers` は payer 5件出せる。"DeFi bot" 文言は出せない（agent type なし）。"7d +184%" は activityGrowth で代替可（意味は前後半比）。Free tier 92% は freeTierProgress で出せる |
| 3. Identity bar で要約 | Monthly spend / 7d growth / Free tier / Entry-point Badge | ⚠️ | Monthly spend → 累計 spend に置換。Entry-point Badge は意味置換が必要 |
| 4. Activity Timeline (クライマックス a) | "Price → LLM → DEX → Discord" を毎時ループとして見せる | ⚠️ | observation 列を時系列で見せることは可。**"毎時 loop" としてグルーピングして見せるには workflow 検出 heuristic が必要**。今のフロントは単純な時系列リスト |
| 5. Co-usage Map で構造補強 | 中心 = 自社 / 周辺 = 併用先のネットワーク | ⚠️ | `/wallet-usage-graph` の payer × recipient で構造は組める。**ただし当初想定の Force-directed Network は未実装**（今は Patterns で散布図 BubbleChart のみ） |
| 6. Upsell Insight (クライマックス b) | "Pro Trading 250M / $890 MRR / Why now 3行" | ❌ | **プラン名・MRR 推定は BFF 非提供**。Heuristic 入力（free-tier / growth / entry-point ratio）の表示にとどめる |
| 7. Patterns で全体像 | Bubble Chart で右上 = 提携優先 | ✅ | `/wallet-usage-graph` を散布図に変換済み。"提携優先" の語彙は UI 側で乗せる |

### 3.5 想定可視化（[02_visualization.md](vision/02_visualization.md)）

| 可視化 | 配置 | 当初の主張 | BFF で取れるか |
| --- | --- | --- | --- |
| Activity Timeline | 画面2 主役 | "どの順番で・いつ・どの API を叩いたか" | ⚠️ Provider と timestamp は取れるが **API path は不可**。 "loop" としての構造化も不可 |
| Force-directed Network 図 | 画面2 補助 | エコシステム構造 | ⚠️ データはあるが **未実装**（今のフロントは散布図のみ） |
| Bubble Chart | 画面3 メイン | 戦略的重要度（X=併用頻度 / Y=リテンション） | ⚠️ X軸（unique payer 数）は出せるが、**Y軸の Retention は BFF 非提供**。今は "平均 observation 数 / payer" で代替 |
| Workflow Clusters | 画面3 サブ | "Cluster 1: Image gen → Storage → Notify (52%)" | ❌ クラスタリング処理が BFF/CLI にない |
| Retention by Agent | 画面3 サブ | "Claude Code 86%, Cursor 59%, curl 14%" | ❌ agent type が無いので集計不能 |

---

## 4. 当初ビジョンの中で BFF だけで成立するもの

ここまでの整理を踏まえ、**今の BFF が出せるデータだけで素直に表現できる**範囲を再構成します。

### 4.1 そのまま表現できるストーリー

> 「あなたの API（pay_to）に支払いをした **payer wallet 群** がいる。同じウォレットは他の pay_to にも支払いをしている。つまり、これらの API は **同じウォレットに併用されている**。」

これは BFF の `/customers` × `/customers/:address/profile` × `/wallet-usage-graph` だけで完結します。`payer wallet × recipient wallet × observation` の3要素が揃っているので、**「併用関係の発見」**そのものは成立します。

### 4.2 そのまま表現できる画面（再構成案）

#### Setup（変更なし）
- 既登録 pay_to から始められる
- localStorage で複数 Provider 切替

#### My Customers
- payer wallet 一覧
- 累計 spend (atomic)、observation 数、関わった recipient 数（= 併用先 provider 数）、最終観測、活動の前後半比 (`activityGrowth`)、upsell 度
- "次にクリックすべき1行" として **`upsellOpportunity = high` の wallet を強調**

#### Wallet 360°
- Identity bar: address / role / identity caveat / 累計 spend / `activityGrowth` / `freeTierProgress`
- Activity Timeline: observation を時系列に表示（**API path は出さない**、provider 名と amount_atomic と timestamp と txHash のみ）
- Provider Usage List（新設済）: この payer が支払った recipient wallet 一覧、tx 数と最終観測
- Insights: BFF が返す `insights[]` をそのまま表示

#### Co-usage Patterns
- BubbleChart: recipient wallet 別に「unique payer 数 × 平均 observation 数 / payer」を散布図
- 右上 = 「ユニーク payer が多く、かつ反復利用が深い recipient」

### 4.3 BFF だけで（heuristic を UI 側で足せば）成立するもの

| 当初ビジョン | UI 側で必要な処理 |
| --- | --- |
| 7d Volume Sparkline | `/metrics/daily` を取り、直近7日で日次 observation 数を bar/line に |
| Workflow Summary Strip（provider の並び） | 同一 payer の observation を block_timestamp 順で並べ、time_proximity 閾値（仮に 5 分）で1サイクルに束ねる。**サイクル名は付けない**、provider 名の並びだけ表示 |
| 簡易 Co-usage Network 図 | `/wallet-usage-graph` から payer-recipient エッジを抽出し、Force-directed で配置。当初想定の「中心=自社 / 周辺=併用先」は、フォーカス対象 wallet を中心ノードにすれば成立 |
| 簡易 Retention 指標 | payer 別に `last_seen_at - first_seen_at >= 14 日` の割合を集計。**agent 別ではなく payer 全体の集計**にとどめる |
| 簡易 Workflow Cluster | サイクル束（上記）を `provider 並びの文字列` でハッシュ化して頻出パターンを集計。**人間にとって意味のある名前は付けない**、配列で見せるだけ |

### 4.4 当初ビジョンに対して "別の意味"で代替するもの

| 当初の意味 | BFF heuristic での代替 |
| --- | --- |
| Free tier 92%（自社プランの上限） | `freeTierProgress` (BFF 線形 heuristic、3M atomic 上限の進捗) |
| 7d growth +184% | `activityGrowth` (前後半の観測数比) |
| Entry-point Badge "step 1 in 87% of loops" | `entryPointRatio` (observation のうち attribution candidate と紐付いた比率)。**意味が違うので UI のコピーを書き換える必要あり** |
| Upsell "Pro Trading 250M" | `upsellOpportunity` (low/medium/high) と heuristic 入力の表示。**プラン名や MRR 推定は乗せない** |

### 4.5 当初ビジョンとして表現できないもの

これらは BFF README 上で「提供しない」と明示されているため、ビジョンを諦めるか、BFF の射程変更（= PoC スコープ拡張）が必要です。

| 諦める要素 | 影響する画面・UI |
| --- | --- |
| Agent 種別（Claude Code / Cursor / curl 等） | My Customers の Agent 列、Patterns の Retention by Agent、Wallet 360° の "Self-hosted Trading Bot" 表示 |
| API path（`/v1/price/history` 等） | Activity Timeline の各行の path 表示、My Customers の "Used Endpoints" 列 |
| 通貨換算（USD 表示） | 全画面の "$1,240" "$3,840" 等の数値 |
| Workflow の固有名（"Hourly trading loop"） | Patterns の Workflow Clusters セクション、Wallet 360° の Workflow Summary Strip の "毎時ループ" 文言 |
| プラン名・MRR 推定 | Upsell Opportunity Card の "Pro Trading 250M / $890 MRR" 部分 |
| デモ脚本の Scene 4 / Scene 6 のクライマックス文言 | "API の利用ログが顧客ワークフローの理解に変わる瞬間" は path がないと弱い。"誰に何をなぜ今売るべきか" はプラン名がないと弱い |

---

## 5. PoC ナラティブとしての再定式化

当初の「**Co-usage Discovery + Retention**」は、BFF の提供範囲では以下のように再定式化できます。

> **「あなたの pay_to に支払いをしている payer wallet 群が、他にどんな pay_to に支払いをしているか。**
> **その併用関係から、attention に値する wallet（高 spend / 多 provider 利用 / 直近で活動増 / heuristic 上 upsell 候補）を浮かび上がらせる。」**

この再定式化では：

- **強い**: payer wallet × recipient wallet × observation の構造自体は完全に揃っている
- **弱い**: 「**何の API を**叩いているか」「**どんな agent が**叩いているか」「**いくら相当の USD か**」が言えない

つまり、**「誰が誰と併用しているか」までは言えるが、「何を・どんな workflow で」は言えない**。当初ビジョンの本質である **"agent の workflow 全体を可視化"** は、現状の BFF 単独では成立しません。

---

## 6. 推奨の進め方（次のステップ案）

### 短期（BFF を変更せずに UI 強化）

1. **`/metrics/daily` を使った日次 sparkline** を Customers / Wallet 360° に投入
2. **Force-directed Network 図** を Patterns に追加（現在は散布図のみ）
3. **Wallet 360° の Workflow Summary Strip** を、observation の time_proximity ベースで自動生成（**サイクル名は付けない**、provider 名の並びだけ）
4. **payer-level Retention 指標** を Patterns に追加（agent 別ではなく全体）

これらは現在のフロントに足すだけで実装できます。当初ビジョンの **再定式化された範囲** を埋める作業です。

### 中期（BFF 拡張が必要 / PoC スコープ判断）

5. **Workflow Cluster 検出** を BFF か CLI 側に追加（同一 payer の連続 observation を time_proximity で束ね、頻出パターンを集計）。クラスタ名の自動命名はしない
6. **時間窓集計**（直近 7d / 30d）を BFF DTO に追加。今の累計のみから差分集計に拡張
7. **provider category** を `provider_endpoint_claim.service_name` から DTO に露出

### 長期（PoC 射程変更）

8. **Agent type 推論ソース**（HTTP UA / SDK 利用パターン等）の追加 → BFF README が現状「将来の enrichment source 待ち」としている領域
9. **API path / endpoint URL** の取り込み → 同上
10. **通貨換算**（rate provider との連携）

---

## 7. 結論

当初ビジョンの **3分間デモ脚本** をそのまま現在の BFF で再現することはできません。特にクライマックス a（"API パスから workflow が見える"）と b（"プラン名 + MRR まで踏み込んだ upsell"）は、BFF が原理的に提供しない情報に依存しています。

ただし、当初ビジョンの **核（=「自社 API と他 API の併用関係を payer wallet 単位で可視化する」）は BFF だけで成立** します。`payer × recipient × observation` の3要素が揃っているためです。

現在の poc-frontend は既に **再定式化されたナラティブ** に沿って実装済み（[current-capabilities.md](current-capabilities.md) 参照）。次の一歩は **§6 の短期項目** を実装することで、当初ビジョンに最も近い体験を BFF 不変で実現することです。
