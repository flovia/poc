## Context

Phase B の BFF は `GET /customers`、`GET /customers/:address/profile`、`GET /wallet-usage-graph` を read-only に提供している。現在の response は `apps/bff/src/data/phase-b-demo.ts` の deterministic demo read model から返しており、request path で CDP / Bitquery / RPC / SDK collector は呼ばない。

一方で、demo 上で扱う CoinGecko の endpoint attribution には構造的な制約がある。複数 endpoint が同じ `payTo` に支払われる場合、public/onchain data だけでは `txHash -> endpointPath` を判定できない。そのため、real transaction facts と mock endpoint attribution を分離したうえで join し、Phase B projection を生成する。

現時点で repo 内の `apps/cli/reports/x402-market-snapshot.json` と `apps/cli/reports/x402-market-summary.md` から確認できている CoinGecko x402 data は次の通り。

```text
providerId: coingecko
resource: https://pro-api.coingecko.com/api/v3/x402/onchain/search/pools
network: base
asset: USDC
amountAtomic: 10000
payTo: 0x110cdbba7fe6434ec4ce3464cc523942ad6fb784
transactionCount: 628
uniqueSenderCount: 75
latestTxHash: 0x6248880ec36541e6783ab756afdb427939f6209551b751cec5a2c97f71176d94
latestSender: 0xac5a07c44a4f971667b3df4b6551fb6991b2142d
latestBlockTimestamp: 2026-04-29T04:11:53Z
```

初期 capture policy は次の通り。

```text
requestedLimit: 1000
maxLimit: 1000
timeWindow: snapshot generation と同等の window から開始する
goal: selected time window 内の observed transfers を可能な限り全件取得する
```

現在の observed `transactionCount` は 628 なので、1000 件上限で現時点の window 内 transfer は概ね収まる想定。ただし、source 側の pagination / availability により取得件数が 1000 未満でも generation error にはしない。fixture metadata に `requestedLimit`、`capturedCount`、`timeWindow`、`source` を記録する。

公式 docs で確認した CoinGecko x402 supported endpoints は次の 5 つ。

```text
GET /api/v3/x402/onchain/simple/networks/{id}/token_price/{address}
GET /api/v3/x402/onchain/search/pools
GET /api/v3/x402/onchain/networks/{id}/trending_pools
GET /api/v3/x402/onchain/networks/{id}/tokens/{address}
GET /api/v3/x402/simple/price
```

公式 docs 上の価格は `$0.01 USDC / request`。ただし、公式 docs には `payTo` address は明記されていないため、`payTo` は CDP Discovery snapshot 由来の observed data として扱う。

## Goals / Non-Goals

**Goals:**

- `packages/sources` で CoinGecko `payTo` から real onchain transfer list を取得し、その transaction facts を Phase B demo projection の入力にする。
- `txHash` を join key として mock endpoint attribution を外付けする。
- `onchain_fact` と `demo_label` / `future_sdk_field` / `derived_insight` を field 単位で保持する。
- BFF runtime は生成済み projection を read-only に返し、live source を呼ばない。
- 将来 SDK telemetry によって mock attribution を置き換えられる構造にする。

**Non-Goals:**

- SDK middleware の本実装。
- request path での live CDP / Bitquery / RPC call。
- endpoint attribution をオンチェーン情報だけで推定すること。
- CoinGecko endpoint usage を実測値として主張すること。
- 認証、課金、本番 multi tenant 化。

## Decisions

### Decision 1: real transaction facts と mock attribution を別 fixture にする

Phase A 相当の onchain transaction facts と、Phase B demo 用の endpoint attribution は別ファイル / 別レイヤーとして管理する。

候補:

```text
fixtures/phase-a/coingecko-transactions.json
apps/bff/fixtures/phase-b/mock-attribution.json
```

理由:

- `txHash`、`payerWallet`、`payTo`、`amount`、`timestamp` は real fact として扱える。
- `endpointPath`、`workflowLabel`、`requestSequence` は現時点では real fact ではない。
- 同じ fixture に混ぜると「オンチェーンだけで endpoint が分かる」と誤解される。

代替案:

- すべてを BFF の hand-written data に含める: 実装は速いが、Phase A との接続が不明瞭になる。
- live source を BFF request path で呼ぶ: demo の安定性と offline verification 方針に反する。

### Decision 2: real transfer list capture は `packages/sources` に寄せる

CoinGecko `payTo` から real transaction facts を取得する責務は `packages/sources` に置く。既存の Bitquery adapter は `network + asset + payTo` の aggregate と latest transfer を扱っているため、同じ境界に transfer list 取得を追加する。

想定 API:

```text
fetchPaymentTransfersByPayTo({ network, asset, payTo, from, limit })
```

返す値:

```text
txHash
sender / payerWallet
recipient / payTo
amountAtomic
asset
network
blockNumber
blockTimestamp
```

初期実装では `limit` の default / max を 1000 とし、Bitquery 側の上限に応じて pagination する。取得結果が 1000 件未満の場合も有効な capture とし、fixture metadata の `capturedCount` で実取得件数を明示する。

理由:

- external source integration は `packages/sources` に集約する。
- `apps/cli` / scripts は source adapter を呼んで fixture / projection を生成する orchestration に集中できる。
- `apps/bff` は `packages/sources` に依存せず、生成済み projection だけを読む。

代替案:

- `apps/cli` に Bitquery GraphQL を直接書く: 速いが source boundary が分散する。
- `apps/bff` で取得する: read-only/offline 方針に反するため採用しない。

### Decision 3: join key は `txHash` にする

Projection builder は real transaction facts と mock attribution を `txHash` で join する。

理由:

- `payerWallet + timestamp` のような曖昧な join を避けられる。
- demo attribution の根拠を transaction 単位で明確に追跡できる。
- 将来 SDK telemetry も `txHash` / `paymentIntentId` / `correlationId` による対応へ自然に移行できる。

代替案:

- `payerWallet + amount + near timestamp` で join: 実データ欠損時の補助には使えるが、Phase B demo の主 join key としては曖昧。

### Decision 4: BFF は generated projection を読む

BFF は real tx fixture と mock attribution fixture を request ごとに処理せず、生成済み projection を読み込んで返す。

候補:

```text
apps/bff/fixtures/phase-b/customer-list.json
apps/bff/fixtures/phase-b/customer-profiles.json
apps/bff/fixtures/phase-b/wallet-usage-graph.json
```

理由:

- BFF は read-only product API boundary に集中できる。
- verification を offline で安定させられる。
- projection generation と HTTP serving の関心を分離できる。

代替案:

- BFF 起動時に projection を生成する: 小規模では可能だが、fixture validation と projection build の責務が BFF に寄りすぎる。

### Decision 5: provenance は contract validation の対象として残す

Projection output は既存 Phase B canonical contract に従い、`provenance`、`provenanceByField`、`reasons` を保持する。

理由:

- real fact と mock attribution の境界が API response 上でも失われない。
- frontend が demo label / future SDK field / derived insight を区別できる。
- 将来 SDK telemetry に置き換える場所を明示できる。

## Risks / Trade-offs

- Real transaction が少ない、または偏る → 初期 capture は最大 1000 件を要求し、demo に必要な wallet / workflow coverage を満たすため、transaction selection criteria と mock attribution coverage を明示する。
- Mock attribution が実測に見える → `provenanceByField` と `reasons` を必須化し、docs / tests で固定する。
- Fixture が古くなる → generation metadata と version を持たせ、再生成可能な script / command を用意する。
- Projection builder が BFF schema と乖離する → builder output を `packages/contracts` validator で検証する。
- Live source 取得が通常 verify に混ざる → `packages/sources` の live transfer list capture は明示的な別 command 経由で使い、`bun run verify` は保存済み fixture で offline のまま維持する。

## Migration Plan

1. `packages/sources` に `payTo` 宛 transfer list 取得 API を追加する。
2. Real transaction facts fixture と mock attribution fixture の schema を定義する。
3. CoinGecko `payTo` 由来の transaction facts fixture を用意する。
4. `txHash` に対して mock endpoint attribution fixture を用意する。
5. Projection builder で customer list / profile / wallet usage graph を生成し、contract validator を通す。
6. BFF の読み込み元を generated projection fixture に切り替える。
7. Existing route tests を維持し、provenance separation の tests を追加する。

Rollback は、BFF の読み込み元を現行の deterministic in-file read model に戻すことで行う。

## Open Questions

- CoinGecko `payTo` の対象 network / asset / time window をどこまで固定するか。
- Real transaction fixture を `fixtures/phase-a` に置くか、`apps/bff/fixtures` 配下へ閉じるか。
- `packages/sources` の transfer list capture を呼ぶ command を `apps/cli` に置くか、root script に置くか。
- Projection builder を `apps/cli` の command とするか、root script とするか。
- Mock endpoint の 5 endpoint に対応する demo workflow label の最終セット。
