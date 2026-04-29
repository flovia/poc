## Context

Phase B demo BFF は `GET /customers`、`GET /customers/:address/profile`、`GET /wallet-usage-graph` を prepared fixture / read model から read-only に返している。現在の profile は CoinGecko x402 `payTo` 周辺の onchain fact と demo attribution を組み合わせた Wallet 360° 表示であり、customer address 起点の外部 x402 service 探索、portfolio / DeFi context、cross-provider affinity までは扱わない。

customer intelligence は外部 API の rate limit、retry、認証、live source availability に影響されやすいため、BFF request path では live source を呼ばない。Phase B では CLI / offline capture で read model JSON を生成し、BFF は保存済み read model を contract validation したうえで返す。

## Goals / Non-Goals

**Goals:**

- `GET /customers/:address/intelligence` の contract-first な response / fixture schema を定義する。
- customer address、network、asset、time window を read model metadata として保持する。
- x402 service candidate、payTo activity、portfolio summary、DeFi position、insight、evidence / provenance を分離して表現する。
- CLI / offline capture で external source fact を取得し、`packages/intelligence` で集計・join・score する。
- BFF は prepared read model を read-only に返し、default verification は offline のまま維持する。

**Non-Goals:**

- BFF request path から Bitquery、CDP、Zerion、MCP、RPC を直接呼ばない。
- endpoint-level attribution、request sequence、correlation id、agent behavior をこの change で実 telemetry として扱わない。
- `profile` response に customer intelligence payload を統合しない。
- 初期実装で multi-chain / multi-asset の live query orchestration を一般化しない。scope は metadata で明示し、初期値は Base / USDC を想定する。

## Decisions

### 1. `profile` ではなく `intelligence` endpoint を追加する

`profile` は Wallet 360° の基本表示に限定し、重い探索・外部 API 由来・更新頻度が異なる情報は `GET /customers/:address/intelligence` に分離する。

- 採用理由: UI / BFF が軽量な profile read と分析 read を別々に扱える。customer intelligence の partial source や unavailable reason を profile contract に漏らさずに済む。
- 代替案: `profile.insights` を拡張する。短期的には簡単だが、provenance、portfolio、DeFi、external service candidate が肥大化し、profile の責務が曖昧になるため採用しない。

### 2. Live capture と BFF read path を分離する

external source access は `apps/cli` の customer intelligence capture に閉じ、BFF は generated read model JSON を読む。

- 採用理由: 通常の `bun run verify` を offline に保てる。rate limit、credential、retry、partial source failure を request path から切り離せる。
- 代替案: BFF route で live source を call する。demo の応答安定性と検証再現性を損なうため採用しない。

### 3. Package 責務を contracts / sources / intelligence / app に分離する

`packages/contracts` は schema と provenance contract、`packages/sources` は external source の fetch / normalize、`packages/intelligence` は集計・join・score、`apps/cli` は orchestration と file write、`apps/bff` は read-only serving を担当する。

- 採用理由: source adapter と projection logic を CLI に閉じ込めず、contract-first でテスト可能にする。`packages/sources` が `packages/intelligence` に依存しないことで外部 fact の取得と分析 logic を分離できる。
- 代替案: CLI に全 logic を実装する。PoC 速度は出るが、BFF / tests / future job から再利用しづらくなるため採用しない。

### 4. Provenance と evidence を必須の設計要素にする

response は `onchain_fact`、`derived_insight`、`demo_label`、`future_sdk_field` の違いを保持し、derived insight は空でない `reasons` または `evidence` を持つ。

- 採用理由: endpoint / workflow / service label には demo / future telemetry placeholder が混在するため、利用側が実 fact と仮説を区別できる必要がある。
- 代替案: flat な business DTO だけを返す。demo では見やすいが、事実と推測の境界が消えるため採用しない。

### 5. 未取得 customer は初期実装では 404 とする

`GET /customers/:address/intelligence` は matching read model がない場合に `404` を返す。

- 採用理由: `GET /customers/:address/profile` の未知 wallet の挙動と揃い、capture 済みか未取得かを明確にできる。
- 代替案: 空の valid response を返す。partial source と未取得の区別が曖昧になるため初期実装では採用しない。

## Risks / Trade-offs

- [Risk] CDP / Bitquery / portfolio source の一部が未取得でも payload が必要になる → `sourceCoverage`、`unavailableReason`、`reasons` で section 単位の状態を表現する。
- [Risk] service candidate の confidence が過剰に確定的に見える → `confidence` と `evidence` を必須化し、candidate は derived insight として扱う。
- [Risk] fixture が demo 固有 label に依存しすぎる → demo label は provenance で区別し、contract は source fact / derived insight を中心に設計する。
- [Risk] 初期 schema が portfolio / DeFi を過剰設計する → 初期は summary / positions の最小 contract に留め、raw source response は直接公開しない。
- [Risk] CLI live command が default verify に混ざる → live capture / verification command は通常の `bun run verify` から分離する。

## Migration Plan

1. `packages/contracts` に customer intelligence schema と fixture validation を追加する。
2. `packages/intelligence` に pure function の aggregation / matching / scoring / projection builder を追加する。
3. `apps/bff/fixtures/phase-b/customer-intelligence/` に prepared read model fixture を追加する。
4. `apps/bff` に read-only route を追加し、known address は `200`、unknown address は `404` を返す。
5. `apps/cli` に offline capture command を追加する。live external source command は default verify に含めない。
6. Tests と route validation を追加し、最後に root で `bun run verify` を実行する。

Rollback は route registration と fixture 参照を外すことで可能。contract / intelligence package の追加は既存 endpoint と分離されるため、既存 Phase B response への影響は限定的にする。

## Open Questions

- Zerion / MCP adapter のどちらを初期 portfolio source とするかは実装時の利用可能な credential / MCP に依存する。初期 contract は source が unavailable でも valid response を表現できるようにする。
- CDP Discovery metadata で service identity が解決できない `payTo` を unknown candidate として返すか、activity のみに留めるかは scoring 実装時に fixture と合わせて決める。
