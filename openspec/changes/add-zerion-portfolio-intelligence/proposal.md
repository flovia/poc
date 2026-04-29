## Why

Customer intelligence は `portfolioSummary` と `defiPositions` を持っているが、現状は portfolio source が未取得の placeholder coverage として表現されている。Zerion を接続することで、BFF が prepared JSON だけを読む方針を維持しながら、CLI capture で customer の実 portfolio / DeFi context を取り込めるようにする。

## What Changes

- customer intelligence capture の明示的な portfolio source として Zerion を追加する。
- `packages/sources` に直接 Zerion HTTP adapter を追加し、wallet portfolio / positions を repository-owned DTO に正規化する。
- raw Zerion response を公開せず、portfolio source provenance で Zerion を識別できるよう customer intelligence contract を最小限拡張する。
- `packages/intelligence` の portfolio classification を拡張し、Zerion coverage の `available` / `partial` / `unavailable` を扱えるようにする。
- `customer:intelligence` で Zerion portfolio capture を有効化する CLI option を追加する。
- BFF request handling と default `bun run verify` から live Zerion access を分離する。
- この change では MCP、汎用 source plugin framework、background job、frontend UI 変更は導入しない。

## Capabilities

### New Capabilities

<!-- なし。この change は既存の customer intelligence capability を拡張する。 -->

### Modified Capabilities

- `customer-intelligence`: customer intelligence capture が、source coverage と provenance 付きで Zerion 由来の portfolio summary / DeFi positions を任意に含められるようにする。

## Impact

- `packages/contracts`: `zerion` provenance support と、必要に応じて sources / intelligence 間で共有する normalized portfolio source contract を追加する。
- `packages/sources`: offline tests 用に injected fetch を持つ Zerion portfolio adapter を追加する。
- `packages/intelligence`: portfolio / DeFi classification を更新し、available、partial、unavailable、no-position の Zerion 結果を区別する。
- `apps/cli`: customer intelligence に Zerion capture option と `ZERION_API_KEY` handling を追加する。
- `apps/bff`: live Zerion call は追加しない。必要な場合も prepared read model fixture を validate して返すだけにする。
- Verification: default `bun run verify` は offline のまま維持し、live Zerion verification は明示的な非 default command path に分離する。
