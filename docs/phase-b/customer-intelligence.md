# Phase B Customer Intelligence 方針

## 目的

顧客ウォレットについて、次の問いに答えられる状態を目指す。

> この customer は、自社 x402 API 以外にどんなサービスを使っているか？

この PoC では **wallet = customer** として扱う。そのため、endpoint 名は wallet ではなく customer を主体にし、将来追加する場合は次を第一候補にする。

```text
GET /customers/:address/intelligence
```

`profile` は Wallet 360° の基本表示、`intelligence` は外部サービス利用・x402 横断 activity・portfolio / DeFi context・insight を返す分析 endpoint として分ける。

現時点では `GET /customers/:address/intelligence` は **計画中の未実装 endpoint** であり、既存の canonical Demo Read API には含めない。

## 現状

| 領域　　　　　　　　　　　　　　　　　　　 | 対応状況　　| 備考　　　　　　　　　　　　　　　　　　　　 |
| --------------------------------------------| -------------| ----------------------------------------------|
| 顧客一覧　　　　　　　　　　　　　　　　　 | 実装済み　　| `GET /customers`　　　　　　　　　　　　　　 |
| 顧客 profile　　　　　　　　　　　　　　　 | 実装済み　　| `GET /customers/:address/profile`　　　　　　|
| co-usage / wallet usage graph　　　　　　　| 実装済み　　| `GET /wallet-usage-graph`　　　　　　　　　　|
| payer wallet / amount / timestamp / txHash | 実データ　　| Bitquery 由来の onchain fact fixture　　　　 |
| endpoint / workflow / service label　　　　| demo / mock | `txHash -> endpointPath` の mock attribution |
| 他 x402 provider / 他 payTo 探索　　　　　 | 未実装　　　| customer address 起点の横断探索はない　　　　|
| DeFi / portfolio / 資産状況　　　　　　　　| 未実装　　　| MCP / Zerion 連携なし　　　　　　　　　　　　|
| browser / E2E での demo flow 検証　　　　　| 未整備　　　| typecheck / unit test / route test 中心　　　|

## `profile` と `intelligence` の責務

### `GET /customers/:address/profile`

Wallet 360° の基本表示に必要な profile projection を返す。

- identity
- usage metrics
- providers
- timeline
- insights

現状の `profile` は、CoinGecko x402 `payTo` 周辺の transaction fact と mock attribution から作られる。wallet address / amount / tx count / timestamp / payTo は onchain fact だが、endpoint 名・workflow・一部 provider/service label は demo / mock。

### `GET /customers/:address/intelligence`

未実装。追加する場合は、customer を起点にした分析結果を返す。

- 他 x402 service candidates
- payTo activity
- cross-provider affinity
- portfolio summary
- DeFi positions
- DeFi active / inactive 判定
- upsell / retention / partnership insights
- evidence / provenance

`profile` に intelligence を全部詰め込むのではなく、重い探索・外部 API 由来・更新頻度が違う情報は `intelligence` に分離する。

`profile.insights` は現在の Wallet 360° 表示に必要な短い利用仮説に限定する。`intelligence.insights` は、外部 x402 service、portfolio / DeFi context、cross-provider affinity など、複数 source を組み合わせた分析結果を扱う。

## 今分かること

現在の Phase B で実データとして扱えるのは、主に次の onchain fact。

- payer wallet
- recipient / `payTo`
- transaction hash
- amount
- asset
- network
- timestamp
- provider-level spend
- payment activity / frequency

これらは `apps/bff/fixtures/phase-a/coingecko-transactions.json` に保存され、BFF の projection builder で customer list / profile / wallet usage graph に変換される。

## 今分からないこと

オンチェーン transaction だけでは、次は確定できない。

- どの endpoint を叩いたか
- どの request がどの transaction に対応するか
- endpoint-level usage frequency
- workflow / use case
- request sequence
- agent type
- provider-side funnel
- customer が他に使っている x402 service の確定名称
- DeFi protocol 利用状況
- token / NFT / LP / lending position などの資産状況

現状の `otherServiceCandidates` や endpoint / workflow label は、実データではなく demo / future telemetry placeholder として扱う。

## 理想形

理想的には、customer address を起点に次の intelligence pipeline を構成する。

```text
customer address
  ├─ Bitquery
  │    └─ outgoing transfer / x402 payment / payTo activity を取得
  ├─ CDP Discovery
  │    └─ payTo -> provider / service / x402 payment option を解決
  ├─ MCP or Zerion
  │    └─ portfolio / token balance / DeFi positions を取得
  └─ SDK telemetry（将来）
       └─ endpoint request / tx hash / correlation id を紐づけ
```

これにより、次の問いに答えられる。

- customer A は自社 provider 以外のどの x402 provider に支払っているか
- customer A はどの `payTo` と頻繁に関係しているか
- 支払い先 `payTo` は CDP 上でどの service / payment option と対応するか
- customer A は DeFi active user か
- customer A の資産規模や protocol 利用傾向はどうか
- 自社 API 利用と外部 service / DeFi 行動に相関があるか

## 実行形態

Phase B / PoC では、customer intelligence の live 探索は **CLI / offline capture ベース**で行う。

BFF request path では、CDP、Bitquery、Zerion、MCP、RPC を直接呼ばない。BFF は保存済み read model を read-only に返す。

```text
apps/cli
  customer:intelligence capture
    -> packages/sources で外部データ取得
    -> packages/intelligence で集計・スコアリング
    -> packages/contracts で projection validation
    -> fixture / read model JSON 出力

apps/bff
  GET /customers/:address/intelligence
    -> 保存済み read model を読む
    -> packages/contracts で validation
    -> read-only response を返す
```

この分離により、外部 API の rate limit、retry、認証、live 検証を通常の `bun run verify` から切り離せる。

想定 command 例:

```sh
bun --cwd apps/cli customer:intelligence -- \
  --address 0x... \
  --network base \
  --asset USDC \
  --from 2026-01-01T00:00:00Z \
  --to 2026-04-29T23:59:59Z \
  --out apps/bff/fixtures/phase-b/customer-intelligence/0x....json
```

command 名と出力先は実装時に contract-first で確定する。

## package 分割方針

customer intelligence は、CLI にロジックを閉じ込めず、次の責務に分ける。

```text
packages/contracts
  - CustomerIntelligenceResponse schema
  - CustomerIntelligenceFixture schema
  - X402ServiceCandidate schema
  - PayToActivity schema
  - PortfolioSummary schema
  - DeFiPosition schema
  - provenance / evidence 型

packages/sources
  - Bitquery outgoing transfers by customer
  - CDP Discovery payment option lookup
  - Zerion / MCP portfolio adapter
  - 外部 API response parse / 正規化

packages/intelligence
  - x402 service candidate 抽出
  - payTo activity aggregation
  - CDP payment option join
  - confidence scoring
  - DeFi activity classification
  - customer intelligence projection builder

apps/cli
  - 引数 parse
  - capture orchestration
  - fixture / read model 書き込み
  - live command と offline verify の分離

apps/bff
  - read model 読み込み
  - contracts validation
  - GET /customers/:address/intelligence の read-only 配信
```

依存方向は次を維持する。

```text
apps/cli
  -> packages/sources        # 外部 fact を取得する
  -> packages/intelligence   # 取得済み fact を集計・スコアリングする
  -> packages/contracts      # projection / fixture を validate する

apps/bff
  -> packages/contracts
  -> read model json

packages/intelligence
  -> packages/contracts

packages/sources
  -> packages/contracts

packages/contracts
  -> external deps only
```

`packages/sources` は `packages/intelligence` に依存しない。`apps/cli` が両者を呼び出して orchestration する。

切り出すもの:

- `packages/sources`
  - `fetchOutgoingTransfersByCustomer()`
  - `fetchCdpPaymentOptions()` または既存 CDP Discovery adapter の再利用
  - `fetchCustomerPortfolio()`（Zerion / MCP adapter）
- `packages/intelligence`
  - `buildCustomerIntelligence()`
  - `aggregatePayToActivities()`
  - `matchPayToToPaymentOptions()`
  - `scoreServiceCandidates()`
  - `classifyDefiActivity()`
- `packages/contracts`
  - response / fixture / projection schema
  - provenance / evidence contract

切り出さないもの:

- CLI の引数処理
- fixture 書き込み
- BFF route 実装
- frontend DTO adapter
- demo 固有の mock labels

## 推奨データ分類

### `onchain_fact`

オンチェーンまたは外部 indexer から直接説明できる値。

- customer address
- payTo address
- tx hash
- transfer amount
- asset / network
- block timestamp
- provider-level payment count / spend
- Zerion / MCP が返す token balance や position の raw fact

将来的に Zerion / MCP / SDK telemetry の事実値が増え、`onchain_fact` だけでは source の違いを表しづらくなった場合は、`external_source_fact` や `sdk_telemetry_fact` のような provenance 追加を検討する。Phase B の現時点では既存の provenance set を維持し、source の詳細は `reasons` / `evidence` / `provenanceByField` で補足する。

### `derived_insight`

複数 source を join / score して作る仮説。

- other service candidate
- co-usage score
- customer segment
- DeFi active / inactive 判定
- partnership / upsell opportunity
- cross-provider affinity

### `demo_label`

Phase B demo の表示体験のために補っている値。

- endpoint name
- workflow label
- service label
- campaign / source / medium label

### `future_sdk_field`

SDK telemetry または provider-side instrumentation が必要な値。

- endpoint attribution
- request sequence
- request path
- correlation id
- agent behavior
- endpoint-level retention

## API 設計候補

現行 Phase B では新 endpoint は未実装。追加する場合は contract-first で進める。

### 第一候補: customer intelligence

```text
GET /customers/:address/intelligence
```

用途:

- customer の外部 service 利用候補
- x402 provider / payTo 横断 activity
- portfolio / DeFi summary
- derived insight と evidence

想定 response 要素:

- `customerAddress`
- `x402Services[]`
- `payToActivities[]`
- `portfolioSummary`
- `defiPositions[]`
- `insights[]`
- `provenanceByField`
- `reasons`

read model の選択条件は、少なくとも次を明示する。

- `address`: lowercase EVM address に正規化する。
- `network`: 初期値は `base`。multi-chain 化する場合は scope または query で明示する。
- `asset`: 初期値は `USDC`。multi-asset 化する場合は scope または query で明示する。
- `timeWindow`: CLI capture 時の `from` / `to` を metadata として保持する。
- 未取得 address: まずは `404` または空の valid response のどちらにするかを contract-first で固定する。
- partial source: Bitquery / CDP / Zerion / MCP の一部が未取得の場合は、section ごとに `sourceCoverage` や `unavailableReason` を持てる形を検討する。

### 代替候補: services / portfolio 分割

必要になった場合だけ、より小さい endpoint に分ける。

```text
GET /customers/:address/services
GET /customers/:address/portfolio
```

- `services`: 「他にどんなサービスを使っているか」に絞り、Bitquery + CDP Discovery join の結果を返す。
- `portfolio`: Zerion / MCP 由来の資産状況、token balance、DeFi position、protocol exposure を返す。

まずは `intelligence` にまとめ、payload が肥大化したり更新頻度が分かれたりした時点で分割する。

## 実装ステップ案

### Step 1: customer 起点の x402 service candidate

CLI / offline capture として実装する。

1. `apps/cli` で customer address、network、asset、time window、出力先を受け取る。
2. `packages/sources` で Bitquery から outgoing transfer を取得する。
3. `packages/intelligence` で x402 payment と見なせる transfer を抽出する。
4. `packages/intelligence` で recipient / `payTo` を集計する。
5. `packages/sources` の CDP Discovery adapter で payment option / service metadata を取得する。
6. `packages/intelligence` で payTo activity と CDP payment option を join する。
7. `packages/intelligence` で service candidate と confidence を算出する。
8. `packages/contracts` で projection を validate する。
9. `apps/cli` が fixture / read model JSON を出力する。

この段階では endpoint-level attribution は行わない。

### Step 2: BFF read model 化

1. live query を BFF request path に入れない。
2. CLI capture / job で fixture または projection を生成する。
3. BFF は保存済み read model を返す。
4. `provenance` と `reasons` を必須化する。

### Step 3: portfolio / DeFi intelligence

1. Zerion または MCP source adapter を追加する。
2. customer address から portfolio / positions を取得する。
3. raw fact と derived segment を分ける。
4. `GET /customers/:address/intelligence` に接続する。

### Step 4: SDK telemetry 置き換え

1. provider endpoint request と payment transaction を correlation id で紐づける。
2. mock endpoint attribution を実 telemetry に置き換える。
3. endpoint-level usage / workflow / retention insight を `future_sdk_field` から実データへ昇格する。

## 現時点の結論

Phase B の現状は、**CoinGecko x402 payTo 周辺の実 onchain fact を使った demo projection** まで。

「customer が他にどんなサービスを使っているか」を本当に知るには、次の追加が必要。

1. customer 起点の outgoing payment 探索
2. CDP Discovery による `payTo -> provider/service` 解決
3. Bitquery capture の多 provider / 多 payTo 対応
4. MCP または Zerion による portfolio / DeFi intelligence
5. 将来 SDK telemetry による endpoint attribution

短期的には、`GET /wallet-usage-graph` の `otherServiceCandidates` を拡張するよりも、まずは `GET /customers/:address/intelligence` の独立 contract を作り、x402 service candidate と portfolio / DeFi 情報を分離して扱うのが安全。
