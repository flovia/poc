## Why

Phase B の customer profile は自社 x402 API 周辺の Wallet 360° 表示に必要な情報を返せるが、「この customer は自社以外のどんな x402 service / payTo と関係しているか」や portfolio / DeFi context までは表現できない。
重い外部探索や更新頻度の異なる分析結果を `profile` へ詰め込まず、customer 起点の intelligence を独立 contract と read model として扱う必要がある。

## What Changes

- `GET /customers/:address/intelligence` 用の customer intelligence contract を追加する。
- customer address、network、asset、time window を明示した read model / fixture schema を追加する。
- x402 service candidate、payTo activity、portfolio summary、DeFi position、derived insight、evidence / provenance を表現できる schema を追加する。
- customer 起点の outgoing payment fact と CDP payment option metadata を join / score する intelligence builder を追加する。
- CLI / offline capture で customer intelligence read model JSON を生成する経路を追加する。
- BFF は生成済み read model を read-only に返し、request path で Bitquery、CDP、Zerion、MCP、RPC を呼ばない。
- endpoint-level attribution や request sequence はこの change では実 data に昇格せず、将来 SDK telemetry の対象として扱う。

## Capabilities

### New Capabilities

- `customer-intelligence`: customer address を起点にした x402 service candidate、payTo activity、portfolio / DeFi context、derived insight、evidence / provenance を提供する capability。

### Modified Capabilities

- `phase-b-demo-bff`: `GET /customers/:address/intelligence` を prepared read model から返す read-only Phase B product endpoint として追加する。

## Impact

- `packages/contracts`: customer intelligence response / fixture / nested entity schema と provenance contract を追加する。
- `packages/intelligence`: payTo aggregation、payment option matching、candidate scoring、DeFi activity classification、projection builder を追加する。
- `packages/sources`: customer outgoing transfer、CDP payment option lookup、portfolio adapter の source contract / adapter を追加または再利用する。
- `apps/cli`: customer intelligence capture command と fixture / read model 書き込みを追加する。
- `apps/bff`: `GET /customers/:address/intelligence` route を追加し、保存済み read model を validate して返す。
- `apps/bff/fixtures`: Phase B customer intelligence read model fixture を追加する。
- Verification: default `bun run verify` は offline のまま維持し、live source 検証は別 command とする。
