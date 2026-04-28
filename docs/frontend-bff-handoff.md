# Frontend / BFF Handoff Notes

この文書は、これから frontend / BFF を実装する人に向けて、現在の
`apps/cli` 実装から何を読み取ればよいかを共有するためのメモです。

現時点では BFF API や frontend を実装するための確定仕様ではありません。
コード分割や package 化を急がず、現在の安定点・不安定点・重要な境界を
共有することを目的とします。

## 目的

Flovia は EVM onchain-first の x402 market intelligence PoC です。

現在の CLI は、Base mainnet の USDC settlement transaction から
x402-like payment observation を抽出し、known fingerprint / catalog と照合して
provider、middleman、facilitator などの候補を confidence と evidence 付きで出します。

重要な前提は次です。

```text
Onchain observations are facts.
Catalog and fingerprint data only enrich observed facts.
Provider and middleman labels stay candidates with confidence and evidence.
```

frontend / BFF では、弱い推定を確定ラベルとして表示しないでください。

## 現在の実装の中心

主要実装は `apps/cli` にあります。

```text
apps/cli/
  lib/
    schema.ts
    db.ts
    api/
    observations/
    decoder/
    attribution/
    aggregates/
    rpc-config.ts
    rpc-fixtures.ts
  scripts/
    ingest-fixtures.ts
    ingest-rpc-tx.ts
    ingest-rpc-range.ts
    score.ts
    aggregate.ts
    report.ts
    verify.ts
    verify-live.ts
```

CLI scripts は現在の entrypoint ですが、将来の BFF handler が scripts をそのまま
HTTP 化する前提ではありません。BFF を作る場合は、`lib/*` の reusable logic を
薄い application service に包む方針が安全です。

## 重要ファイルと読み方

### `apps/cli/lib/schema.ts`

現在の型と validation の中心です。

重要な型:

- `RawTransaction`
- `RawReceipt`
- `PaymentObservationInput`
- `PaymentObservationRecord`
- `AttributionCandidate`
- `ProviderEndpointClaim`
- `SettlementFingerprintPack`
- `KnownFingerprint`

注意点:

- domain 型、fixture 型、seed 型、API DTO 候補が同じファイルに混在しています。
- frontend / BFF 用の公開 DTO としてそのまま固定されたものではありません。
- 将来、API の入出力が固まったら、この中から公開 DTO / validation schema を
  分離する可能性があります。

### `apps/cli/lib/db.ts`

SQLite schema と DB 接続の中心です。

重要テーブル:

- `payment_observations`
- `settlement_evidence`
- `known_fingerprints`
- `provider_endpoint_claims`
- `settlement_fingerprint_packs`
- `attribution_candidates`
- `ingestion_runs`
- `daily_metrics`
- `payer_wallet_profiles`
- `recipient_summaries`
- `relayer_summaries`

注意点:

- CLI default DB は残っていますが、`createDb()` と明示的 `database` 引数により、主要な storage / aggregate / scoring path は isolated DB context でも実行できます。
- BFF から直接 default `db` を触る設計にすると、後でテスト・並列実行・環境分離が難しくなります。
- BFF 実装時は明示的 DB context を受け取る repository / service 層で隠すのが望ましいです。

### `apps/cli/lib/observations/build-observation.ts`

onchain transaction / receipt から normalized observation を作るドメインロジックです。

主な entrypoint は `buildPaymentObservations()` です。以前の fixture 専用名ではなく、
fixture ingest と RPC ingest の両方から使う source-neutral な builder になっています。

現在検出している主な pattern:

- Base USDC direct `transferWithAuthorization`
- Base USDC `executeWithAuthorization`
- Multicall3 `aggregate3` 内の USDC authorization transfer

抽出する主な情報:

- chain id
- transaction hash
- block number / timestamp
- relayer candidate (`tx.from`)
- payer
- recipient
- amount atomic
- token address
- method
- top-level selector
- evidence

BFF / frontend の理解において、`payer`、`recipient`、`relayer` の意味は特に重要です。
`tx.from` は実ユーザーではなく relayer / facilitator candidate である可能性があります。

### `apps/cli/lib/observations/store-observations.ts`

observation と settlement evidence を保存します。

特徴:

- `payment_observations` は `UNIQUE(chain_id, tx_hash, stable_hash)` で冪等化されています。
- evidence は observation に紐づく audit trail として保存されます。
- 同じ transaction を再 ingest しても observation は重複しない設計です。
- evidence `source_ref` は fixture の `caseId` だけに依存せず、`txHash`、`stableHash`、evidence type、index を含む stable ref です。将来の evidence drill-down UI で参照しやすくなっています。
- `tx_index` placeholder は削除済みです。現時点では block 内 transaction index を保持していません。
- receipt/log 検証の evidence type は fixture 専用名ではなく `receipt_validation` です。

### `apps/cli/lib/attribution/score.ts`

observed payment を known fingerprints / provider claims / settlement fingerprints と照合し、
attribution candidate を作ります。

`scoreObservationCandidates()` は in-memory input から candidate を返す pure scoring helper です。
DB への read/write orchestration と scoring rule が分離され始めているため、将来 BFF で
「なぜこの candidate なのか」を説明する用途にも使いやすくなっています。

frontend で表示すべきものは「確定 provider」ではなく、以下を持つ candidate です。

- candidate type
- matched value
- matched claim / settlement fingerprint
- entity id / role
- confidence
- reasons
- evidence refs

### `apps/cli/lib/aggregates/summaries.ts`

dashboard / BFF の read model 候補です。

現在の読み取り関数:

- `listPaymentObservations()`
- `listAttributionCandidates()`
- `listDailyMetrics()`
- `listPayerProfiles()`
- `listRecipientSummaries()`
- `listRelayerSummaries()`

将来 BFF を作る場合、最初の read API はこの層を薄く包む可能性が高いです。

このファイルの row reader は SQLite に近い内部 read model です。frontend / BFF に
そのまま公開する前提ではありません。

### `apps/cli/lib/api/dto.ts`

future-facing な projection DTO と mapper の置き場です。

現在の役割:

- SQLite row の snake_case shape を JSON-safe / camelCase shape に変換する
- `PaymentObservationDto`、`AttributionCandidateDto`、`DailyMetricDto`、`WalletProfileDto`、`ReportSummaryDto` を定義する
- `reasons_json` / `evidence_refs_json` のような DB 保存形式を frontend が扱いやすい配列に戻す
- `scripts/report.ts` の `summary` 出力にも DTO mapper が使われており、`summary.json` は以前より BFF prototype に近い projection になっています

注意点:

- これはまだ HTTP API の確定 contract ではありません。
- BFF/frontend 実装時に response shape が固まったら、ここを起点に API schema 化する可能性があります。

### `apps/cli/lib/attribution/wallet-graph.ts`

provider wallet と payer wallet の関係を graph 的に組み立てます。

product overlap や payer wallet intelligence の frontend 表示に近い構造です。

### `apps/cli/scripts/report.ts`

現在の static report 生成です。

`summary.json` に相当する出力は、将来の dashboard API の prototype として読めます。
現在は `apps/cli/lib/api/dto.ts` の DTO mapper を通した JSON-safe / camelCase projection です。
現在含まれる主な情報:

- counts
- observations
- attribution candidates
- daily metrics
- payer wallet profiles
- recipient summaries
- relayer summaries
- wallet usage graph
- scope note

最初に BFF を作る場合は、`GET /summary` 相当の read-only projection から始めるのが自然です。

### `apps/cli/scripts/ingest-rpc-tx.ts`

明示された tx hash を Base RPC から取得し、observation pipeline に流します。

将来の mutation API 候補:

```text
POST /ingest/rpc-tx
```

ただし、現時点では API 仕様として確定していません。

### `apps/cli/scripts/ingest-rpc-range.ts`

bounded block range を scan し、candidate transaction の receipt だけ取得して observation を作ります。

特徴:

- range size guard があります。
- candidate filter 後に receipt を取得します。
- ingestion run metadata を保存します。

BFF 化する場合は同期 API ではなく job 化、rate limit、認可、max range 制限が必要になる可能性があります。

## 現時点で安定している考え方

- onchain observation が source of truth です。
- catalog / fingerprint は observation を enrich するだけです。
- provider / middleman / facilitator は candidate として扱います。
- confidence、reasons、evidence refs を UI に出す必要があります。
- storage / aggregate / scoring の主要 path は明示的 DB context を受け取れるため、BFF 側では default DB singleton に寄せず service 層で接続を渡す構成にできます。
- default verify は offline であるべきです。
- live RPC は明示的な別経路にします。
- `summary.json` は dashboard-ready projection の初期形として使えます。

## まだ変わりそうなもの

- BFF API path
- request / response DTO
- frontend の画面構成
- package 分割
- DB schema
- indexer の cursor / retry / reorg handling
- live RPC ingest を同期 API にするか job にするか
- attribution score versioning
- evidence drill-down の UI 粒度
- wallet / entity / provider の最終的な表示モデル

## BFF API 候補

これは確定仕様ではなく、現在の codebase から自然に見える候補です。

Read-only:

```text
GET /health
GET /summary
GET /observations
GET /attribution-candidates
GET /metrics/daily
GET /wallets/payers
GET /wallets/recipients
GET /wallets/relayers
GET /wallet-usage-graph
```

Mutation / jobs:

```text
POST /ingest/rpc-tx
POST /ingest/rpc-range
POST /score
POST /aggregate
```

初期 BFF は read-only から始めるのが安全です。RPC ingest や range scan は外部依存、実行時間、rate limit、再実行性の考慮が必要です。

## Package 化について

現時点では、frontend / BFF 共有のために先に package 化することは必須ではありません。

保留する理由:

- BFF API 境界がまだ確定していません。
- frontend が実際に共有型を import する段階ではありません。
- `apps/cli/lib/schema.ts` には domain / fixture / seed / API DTO 候補が混在しています。
- 早期に shared package 化すると、責務が曖昧な置き場になりやすいです。

将来切り出すなら、DB や RPC ではなく API 境界から小さく始めるのがよいです。

候補名:

```text
packages/api-schema
packages/api-types
packages/protocol
```

`contracts` は smart contracts と混同しやすいため避ける方針です。

切り出し候補:

- API request / response DTO
- validation schema
- frontend に渡す summary / observation / attribution candidate 型

まだ切り出さない方がよいもの:

- SQLite 接続と schema
- DB repository 実装
- CLI scripts
- RPC client
- live ingest implementation

## frontend / BFF 実装者への注意

- `apps/cli/scripts/*` を直接 HTTP handler にしないでください。
- まず `apps/cli/lib/*` の reusable logic を見てください。
- DB を使う reusable logic は、可能な限り明示的 DB context を渡して呼んでください。
- frontend / BFF に渡す read projection は `apps/cli/lib/api/dto.ts` の DTO mapper を起点にしてください。
- `payment_observations` に provider 確定ラベルを入れないでください。
- attribution は candidate として表示してください。
- confidence と evidence を UI から見えるようにしてください。
- live RPC を default verify や通常の offline flow に混ぜないでください。
- `tx.from` を user と呼ばないでください。relayer candidate として扱ってください。

## 最初に共有するとよい順番

frontend / BFF 担当者には、まず次の順で読んでもらうと理解しやすいです。

1. `docs/index.md` の product direction
2. `docs/implementation.md` の architecture overview と component boundaries
3. この文書
4. `apps/cli/scripts/report.ts` の `summary` 出力
5. `apps/cli/lib/aggregates/summaries.ts`
6. `apps/cli/lib/observations/build-observation.ts`
7. `apps/cli/lib/attribution/score.ts`

## 近い将来の判断ポイント

次のどれかが起きたら、BFF API / package 化 / DTO 分離を再検討します。

- frontend が実際に `summary` 相当の型を import したくなった
- BFF と CLI で同じ DTO validation が重複し始めた
- read-only API の path と response shape が固まった
- live ingest を UI から起動する必要が出た
- evidence drill-down の UI 要件が固まった

それまでは、コード構造を先に固定するより、この文書のように「今の安定点と変わりそうな点」を共有する方が安全です。
