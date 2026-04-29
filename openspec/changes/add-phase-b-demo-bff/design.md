## Context

Phase A では `apps/cli` と `packages/*` による market snapshot / intelligence 基盤が整っている。一方、Phase B の frontend demo は、4 画面のうち Setup を除く 3 画面が BFF API に依存する想定だが、現状の `apps/bff` は `/` と `/health` のみを返す最小 HTTP app である。

`../poc-frontend` は過去 BFF DTO に合わせている可能性があり、現在の shape をそのまま canonical contract として固定するのは危険である。そのため、実装は `packages/contracts` に置く Phase B canonical schema を基準にし、frontend 連携では必要に応じて adapter / migration を行う。

Phase B の response には、Phase A 由来の実データ相当、手書き demo label、将来 SDK telemetry で実データ化する想定値、そこから作る仮説が混在する。これらは `provenance` / `provenanceByField` / `reasons` で区別する。

## Goals / Non-Goals

**Goals:**

- `GET /customers`、`GET /customers/:address/profile`、`GET /wallet-usage-graph` を read-only BFF endpoint として実装する。
- 各 endpoint は `packages/contracts` の Phase B schema で検証可能な canonical envelope response を返す。
- demo / future SDK 想定値を専用 raw endpoint ではなく、3 つの product API response に内包する。
- prepared demo fixture / read model だけを読み、request path で live CDP / Bitquery / RPC を呼ばない。
- BFF route test で status、not found、method handling、contract validation を検証する。

**Non-Goals:**

- SDK middleware / telemetry collector の実装。
- live RPC、live CDP、live Bitquery を BFF request path に組み込むこと。
- `GET /demo-data`、`GET /sdk-events`、`GET /telemetry` の追加。
- 初回実装での `GET /patterns` / `GET /summary` 追加。
- 認証、課金、本番 multi tenant 化。
- frontend repository の大規模改修。

## Decisions

### 1. 3 つの product API に demo / future SDK 想定値を内包する

`/demo-data` や `/sdk-events` を作るのではなく、frontend の意思決定体験に必要な projection として `GET /customers`、`GET /customers/:address/profile`、`GET /wallet-usage-graph` に内包する。

代替案は raw demo endpoint を作ることだが、Phase B の BFF は raw viewer ではなく product API boundary であるため採用しない。

### 2. canonical envelope response を採用する

各 endpoint は `generatedAt`、`generatedFrom`、`scope`、`provenance` などを持つ envelope response を返す。現 frontend が直接配列や過去 DTO を期待していても、BFF contract は canonical shape を基準にする。

代替案は frontend の現 DTO をそのまま BFF contract にすることだが、過去 BFF に合わせた暫定実装を固定化するリスクがあるため採用しない。

### 3. fixture は TypeScript read model として管理する

初回は `apps/bff/src/data/phase-b-demo.ts` に deterministic な fixture を置き、schema validator で検証してから route で返す。JSON だけにすると型補完や共通定数の利用が弱くなるため、まずは TypeScript fixture を優先する。

必要になれば後続で JSON seed + loader へ分離できる。

### 4. BFF は `packages/contracts` を利用し、`apps/cli` を import しない

BFF は product API boundary として contract schema / validator は使うが、CLI の orchestration や source adapter 実装には依存しない。Phase A snapshot 相当の値は fixture / read model として扱う。

### 5. provider scoping は response `scope` に留める

初回実装では `providerId` query/header filtering を導入しない。必要な scope は response envelope に任意で含める。scope が省略された response は global/unscoped demo data として扱う。

## Risks / Trade-offs

- [Risk] frontend が現在期待する shape と canonical response が一致しない → BFF 実装後、frontend 側に adapter を追加して段階的に移行する。
- [Risk] provenance を細かくしすぎると fixture 作成が重くなる → demo/future/derived に見える重要 field を中心に `provenanceByField` と `reasons` を付ける。
- [Risk] fixture が実データのように見える → `docs/demo-data.md` の分類に従い、`demo_label` / `future_sdk_field` / `derived_insight` を明示する。
- [Risk] `customerCount` と `customers.length` などの不整合 → contract schema と BFF tests で検証する。
- [Risk] BFF route が肥大化する → route handler は request parsing と response dispatch に限定し、fixture/read model は `data` または `routes` 配下に分離する。
