## Why

Phase A の data foundation は完了しているが、frontend demo はまだ安定した read-only BFF API に支えられていない。Phase B では、partner demo に必要な 4 画面を live source に依存せず再現できる product API boundary を作る必要がある。

また、Phase B の表示値には onchain facts、手書き demo label、将来 SDK telemetry 想定値、そこから作る仮説が混在するため、API contract 上で provenance を保ったまま返す必要がある。

## What Changes

- BFF に Phase B demo read model を追加する。
- BFF に次の read-only endpoint を追加する。
  - `GET /customers`
  - `GET /customers/:address/profile`
  - `GET /wallet-usage-graph`
- 各 endpoint は raw demo data ではなく、frontend 画面向けの product projection を返す。
- response は `packages/contracts` の Phase B schema で検証可能な envelope 形式にする。
- demo / future SDK 想定値は独立 endpoint にせず、3 つの product API response に内包する。
- `onchain_fact` / `demo_label` / `future_sdk_field` / `derived_insight` を response 内で区別できるようにする。
- BFF request path では live CDP / Bitquery / RPC を呼ばない。
- `GET /patterns`、`GET /summary`、`GET /demo-data`、`GET /sdk-events` は初回実装対象外とする。

## Capabilities

### New Capabilities

- `phase-b-demo-bff`: Phase B frontend demo を支える read-only BFF product API と demo read model。

### Modified Capabilities

- `market-intelligence`: Phase A snapshot / projection 相当の値を Phase B read model の `onchain_fact` として扱う境界を明確化する。

## Impact

- `apps/bff`
  - demo fixture / read model adapter の追加
  - 3 つの GET endpoint の追加
  - route tests の追加
- `packages/contracts`
  - Phase B response schema / validator の利用
  - 必要に応じた contract test の追加・調整
- `docs`
  - API contract / demo data policy に沿った実装への追従
- `../poc-frontend`
  - 後続作業で canonical envelope response への adapter / migration が必要
