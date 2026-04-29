# Flovia PoC Track

## Current status

Phase A は **core 完了**。Phase B は **real tx fact + mock attribution projection 化まで実装済み** と判定する。

```text
Phase A core: done
Phase A hardening: follow-up possible
Phase B demo BFF: real tx fact + mock attribution projection done
Phase B frontend integration: not verified in this repo
```

## Phase A: data foundation

### 判定

`docs/spec.md` の Phase A は、現状の `apps/cli` と `packages` による market snapshot / intelligence 基盤として成立している。

### 実装済み

- `packages/contracts`
  - Zod schema、TypeScript 型、normalization helper を提供している。
  - source facts、market snapshot、Phase B canonical response の contract boundary として機能している。
- `packages/sources`
  - CDP Discovery と Bitquery source adapter を持つ。
  - pagination、response parse、contract への正規化を担っている。
  - CoinGecko `payTo` 向けに `fetchPaymentTransfersByPayTo()` を持ち、Base USDC transfer list を default 1000 件、明示 limit では 1000 件超まで pagination 取得できる。
- `packages/intelligence`
  - scope filtering、join、active 判定、ranking、discrepancy、snapshot 生成を担っている。
- `apps/cli`
  - batch orchestration、引数処理、sources と intelligence の接続、JSON / Markdown report 出力を担っている。
- import boundary
  - `scripts/check-import-boundaries.ts` による境界検査がある。
  - `packages/*` の許可済み import、`apps/bff -> apps/cli` 禁止を検査している。
- tests / verification
  - contracts、sources、intelligence、cli、bff の typecheck / test を `bun run verify` で実行する構成になっている。

## Phase B: demo BFF

### 判定

Phase B の初回スコープである **frontend demo 用 read-only product API boundary** は、BFF 側では成立している。

ただし、frontend は別リポジトリ（`../poc-frontend` または private repo）前提のため、このリポジトリ単体では frontend 4画面との接続完了までは検証していない。

### 実装済み

- `apps/bff`
  - read-only BFF として `GET` の product endpoint を提供している。
  - 非 `GET` は write operation を行わず、read-only 方針に沿って `405` を返す。
  - 未公開 route は JSON の `404` を返す。
- Phase B canonical contract
  - `packages/contracts` に Phase B customer list / customer profile / wallet usage graph の schema と validator がある。
  - response は envelope 付き、strict schema、ISO datetime、atomic amount string、provenance 付きの canonical 形状を前提にする。
- real tx fact + mock attribution projection
  - `apps/bff/fixtures/phase-a/coingecko-transactions.json` に CoinGecko Base USDC `payTo` の transaction fact fixture を保持している。
  - `apps/bff/fixtures/phase-b/mock-attribution.json` に `txHash` keyed mock endpoint attribution を保持している。
  - mock attribution は real transaction fact 全件に対して deterministic に割り当て、projection が capture 件数を反映できるようにしている。
  - `bun --cwd apps/cli coingecko:transactions -- --from ... --to ... --limit ...` で live capture から fixture を再生成できる。
  - `apps/bff/src/data/projection-builder.ts` が `txHash` で join し、customer list / profile / wallet usage graph projection を生成する。
  - module initialization 時に `packages/contracts` の Phase B validator で検証する。
- docs
  - `docs/api-contract.md` に canonical 契約、provenance 契約、延期対象 endpoint を記載している。
  - `docs/demo-data.md` に demo data / provenance のラベリング規則を記載している。
  - `apps/bff/README.md` に BFF の endpoint、非公開 endpoint、read-only 方針を記載している。

### 公開済み endpoint

```text
GET /
GET /health
GET /customers
GET /customers/:address/profile
GET /wallet-usage-graph
```

product endpoint は `docs/api-contract.md` と `packages/contracts` の Phase B schema に従う。

### 初回実装では公開しない endpoint

```text
GET /demo-data
GET /sdk-events
GET /telemetry
GET /mock-attribution
GET /patterns
GET /summary
```

`GET /patterns` は当初候補に含めていたが、現在の canonical 初回スコープでは独立 endpoint としては延期している。co-usage / pattern 的な demo story は `GET /wallet-usage-graph` の response 内で表現する。

## Phase B data classification

Phase B の BFF response では、実データ由来の値と demo / 将来 telemetry 由来の値を混ぜず、各 field の由来を明示する。

### Phase A に依存する実データ

Phase A の data foundation から得られる、または Phase A snapshot / projection から再生成できる値。

- `pay_to` / recipient
- payer wallet / customer wallet
- network / asset
- payment activity / payment frequency
- active wallet 判定
- customer ranking / payer quality
- CDP resource / payment option
- Bitquery payTo aggregate
- market snapshot
- customer wallet projection
- wallet profile projection
- co-usage graph projection
- product / resource candidate cluster
- confidence / evidence のうち onchain facts に基づく部分

Phase B ではこれらを request path で live source から取りに行かず、prepared demo dataset、fixture、または Phase A snapshot 相当の read model として BFF から返す。

現在の CoinGecko Base USDC 観測値は次の通り。

```text
payTo: 0x110cdbba7fe6434ec4ce3464cc523942ad6fb784
transactionCount: 628
uniqueSenderCount: 75
latestTxHash: 0x6248880ec36541e6783ab756afdb427939f6209551b751cec5a2c97f71176d94
latestSender: 0xac5a07c44a4f971667b3df4b6551fb6991b2142d
latestBlockTimestamp: 2026-04-29T04:11:53Z
```

現在の fixture capture は `2026-01-01T00:00:00Z` から `2026-04-29T23:59:59Z` までを対象に、`requestedLimit: 5000` で 1908 件の unique valid transaction facts を保存している。

### 現時点では実データではない値

Phase A の onchain-first data foundation だけでは確定できないため、Phase B では `demo_label` または `future_sdk_field` として扱う値。

- source / medium candidate
- referrer-like label
- campaign-like label
- workflow / use case candidate
- endpoint candidate
- endpoint usage frequency
- endpoint attribution
- workflow sequence
- agent type inference
- provider-specific funnel
- plan / monetization context
- retention / upsell / partnership insight の演出・仮説部分

これらを実データ化するには、将来の SDK middleware、provider attribution data、request path、resource、request context、provider-side event、endpoint-level request telemetry が必要。

### API response 上の扱い

各 response field には、少なくとも次のいずれかの分類を持たせる。

- `onchain_fact`: Phase A の source facts / snapshot / projection から説明できる値
- `demo_label`: frontend demo の意思決定体験を見せるために用意した fixture 値
- `future_sdk_field`: SDK telemetry 統合後に実データ化する想定の値
- `derived_insight`: `onchain_fact` と `demo_label` から作る insight / hypothesis

`derived_insight` は、根拠に `demo_label` や `future_sdk_field` が含まれる場合、実データとして扱わない。

## Remaining hardening

### Phase A hardening

- import boundary checker の網羅性強化
  - `packages/* -> apps/*` 禁止は package allowed import により実質検査されている。
  - `packages/sources <-> packages/intelligence` 相互 import 禁止は package allowed import により実質検査されている。
  - `apps/bff -> apps/cli` 禁止は検査済み。
  - 次は `apps/*` 間依存方針を明文化し、必要なら `apps/cli -> apps/bff` なども明示的に検査する。
- Bitquery 実装の汎用化
  - 現状は Base USDC 前提が強い。
  - network / asset を広げる場合は source adapter 側で拡張する。
- snapshot contract の意味論整理
  - Phase B 側の provenance 契約は追加済み。
  - 次は Phase A snapshot と Phase B projection の境界を、生成パイプライン上でもより明確にする。

### Phase B hardening

- BFF demo data の外部 fixture 化 / projection store 化
  - in-file deterministic read model は廃止し、real transaction fixture、mock attribution fixture、projection builder に分離済み。
  - 次は projection output を必要に応じて生成済み JSON として永続化する。
- frontend integration の検証
  - このリポジトリでは BFF endpoint と schema validation までを確認している。
  - `../poc-frontend` 側の API client / adapter が canonical response を既存 UI DTO へ変換できることは未確認。
- endpoint scope / provider scope の整理
  - 現在は prepared demo read model を返す。
  - provider scope の query/header 化は後続 change まで延期する。
- `GET /patterns` の扱いの固定
  - 現在は公開しない。
  - 独立 endpoint が必要になった時点で、contract、fixture、BFF route、frontend adapter をまとめて追加する。

## Not now

- BFF request path で live CDP / Bitquery / RPC を呼ぶこと
- SDK middleware の本実装
- endpoint / workflow / MRR の実データ推定
- Solana parser
- 認証、課金、本番 multi tenant 化

## Next

次にやるべきことは、**Phase B の frontend 接続準備**。

優先順は次の通り。

1. `../poc-frontend` の 4画面が必要とする DTO と、BFF canonical response の差分を洗い出す。
2. frontend API client / adapter を作り、`/customers`、`/customers/:address/profile`、`/wallet-usage-graph` を既存 UI DTO へ変換する。
3. frontend 4画面（Setup、My Customers、Wallet 360°、Co-usage Patterns）で demo flow を通す。
4. 必要になった場合のみ、`GET /patterns` の独立 endpoint を contract-first で追加する。

## One-line summary

Phase A の data foundation は通過済み。Phase B は real tx fact + mock attribution projection 化まで完了しており、次は frontend adapter 接続を進める。
