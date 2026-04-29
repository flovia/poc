# Phase B: real transaction + mock endpoint attribution plan

## 目的

Phase B demo では、CoinGecko の `payTo` に紐づく **real onchain transaction** を使いながら、オンチェーンだけでは判定できない endpoint path / workflow を **mock attribution** として補う。

これにより、完全な手書き demo data ではなく、次の構成に近づける。

```text
real onchain tx facts
  + mock endpoint attribution
  -> Phase B demo projection
  -> BFF read-only API
```

## 背景

CoinGecko には demo 上で扱いたい endpoint が複数ある。

```text
CoinGecko endpoint A
CoinGecko endpoint B
CoinGecko endpoint C
CoinGecko endpoint D
CoinGecko endpoint E
```

しかし、それらの endpoint に対する payment が同じ `payTo` に集約される場合、public/onchain data だけでは、どの transaction がどの endpoint request に対応したかを判定できない。

```text
endpoint A ┐
endpoint B ┤
endpoint C ├── same payTo
endpoint D ┤
endpoint E ┘
```

そのため、現時点では `txHash -> endpointPath` の対応を mock として持つ必要がある。

## 基本方針

Phase B では次の方針を採用する。

1. CoinGecko の `payTo` から real transaction を逆引きする。
2. real transaction 由来の値は `onchain_fact` として扱う。
3. endpoint path / workflow / request context は mock attribution として外付けする。
4. mock attribution 由来の値は `demo_label` または `future_sdk_field` として扱う。
5. derived insight は、根拠に mock attribution が含まれる場合、実データとして扱わない。

## データフロー

```text
CoinGecko payTo
  │
  ▼
Bitquery / RPC / explorer source
  │
  ▼
real onchain tx list
  - txHash
  - payerWallet
  - payTo
  - amount
  - asset
  - network
  - timestamp
  │
  │ join by txHash
  ▼
mock endpoint attribution
  - txHash
  - endpointPath
  - endpointName
  - workflowLabel
  - requestMethod
  - mock reason
  │
  ▼
Phase B projection
  - customer list
  - customer profile
  - wallet usage graph
  │
  ▼
BFF read-only API
  - GET /customers
  - GET /customers/:address/profile
  - GET /wallet-usage-graph
```

## レイヤー分離

### 1. Onchain fact layer

オンチェーンから取得できる実データ。

```text
provenance: onchain_fact
```

対象例:

- `txHash`
- `payerWallet`
- `payTo`
- `amount`
- `asset`
- `network`
- `timestamp`
- `paymentFrequency`
- `providerLevelSpend`

### 2. Mock attribution layer

オンチェーンだけでは分からないため、demo 用に付与する値。

```text
provenance: demo_label | future_sdk_field
```

対象例:

- `endpointPath`
- `endpointName`
- `workflowLabel`
- `requestMethod`
- `requestSequence`
- `endpointUsageFrequency`
- `paymentIntentId`
- `correlationId`

### 3. Derived insight layer

onchain fact と mock attribution から作る仮説。

```text
provenance: derived_insight
```

対象例:

- retention hypothesis
- upsell candidate
- partnership opportunity
- co-usage story
- power user label

## Mock attribution fixture

最初は JSON fixture として管理する。

候補パス:

```text
apps/bff/fixtures/phase-b/mock-attribution.json
```

例:

```json
{
  "providerId": "coingecko",
  "version": "phase-b-demo-v1",
  "generatedAt": "2026-04-29T00:00:00.000Z",
  "items": [
    {
      "txHash": "0xabc...",
      "endpointPath": "/api/v3/simple/price",
      "endpointName": "Simple Price",
      "workflowLabel": "price lookup",
      "requestMethod": "GET",
      "provenanceByField": {
        "txHash": "onchain_fact",
        "endpointPath": "demo_label",
        "endpointName": "demo_label",
        "workflowLabel": "demo_label",
        "requestMethod": "future_sdk_field"
      },
      "reasons": [
        {
          "provenance": "demo_label",
          "label": "manual demo attribution",
          "description": "Endpoint attribution is mocked because public onchain data cannot distinguish CoinGecko endpoints sharing the same payTo."
        }
      ]
    }
  ]
}
```

## 重要な制約

- mock attribution fixture 側で `payerWallet`、`payTo`、`amount`、`timestamp` を作らない。
- それらは real onchain tx fact から取得する。
- mock attribution fixture の join key は原則 `txHash` にする。
- `endpointPath` を onchain fact として扱わない。
- BFF response では、field 単位で provenance を保持する。
- request path で live CDP / Bitquery / RPC を呼ばない。
- BFF は生成済み projection / fixture を read-only に返す。

## 将来の SDK 置き換え

最終的には mock attribution layer を SDK middleware telemetry に置き換える。

SDK が取得する想定値:

- `requestId`
- `providerId`
- `endpointPath`
- `method`
- `requestTimestamp`
- `wallet / customer context`
- `paymentIntentId`
- `txHash`
- `correlationId`
- `requestMetadata`

置き換え後の理想フロー:

```text
SDK request event
  + onchain tx fact
  -> real endpoint attribution
  -> product analytics projection
  -> BFF/API
```

## 実装ステップ案

### Step 1: real tx の取得

CoinGecko の `payTo` から関連 transaction を取得する。

出力候補:

```text
fixtures/phase-a/coingecko-transactions.json
```

保持する値:

- `txHash`
- `payerWallet`
- `payTo`
- `amount`
- `asset`
- `network`
- `timestamp`

### Step 2: mock attribution fixture の作成

real tx の `txHash` に対して、demo 用 endpoint path を割り当てる。

出力候補:

```text
apps/bff/fixtures/phase-b/mock-attribution.json
```

### Step 3: projection builder の作成

onchain tx fact と mock attribution を `txHash` で join し、Phase B の canonical response を生成する。

出力候補:

```text
apps/bff/fixtures/phase-b/customer-list.json
apps/bff/fixtures/phase-b/customer-profiles.json
apps/bff/fixtures/phase-b/wallet-usage-graph.json
```

### Step 4: BFF の読み込み先を切り替える

現在の in-file deterministic read model から、生成済み projection fixture を読む構成に移行する。

### Step 5: provenance test を追加する

少なくとも次をテストする。

- `txHash` は `onchain_fact`
- `endpointPath` は `demo_label` または `future_sdk_field`
- `derived_insight` は `reasons` を持つ
- BFF response が contract schema に通る

## 成功条件

- BFF の demo response が real tx hash を含む。
- endpoint attribution が mock であることが response 上で分かる。
- BFF runtime は live source を呼ばない。
- Phase A fact と Phase B mock attribution の境界が fixture / projection 上で分離されている。
- 将来 SDK telemetry へ置き換える場所が明確になっている。

## 非目標

- SDK middleware の本実装
- request path での live RPC / Bitquery call
- endpoint attribution のオンチェーン推定
- CoinGecko endpoint usage の実データ主張
- 認証、課金、本番 multi tenant 化
