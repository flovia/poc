## Why

Phase B の BFF は現在 deterministic demo read model を返しているが、Phase A の real onchain transaction とは実際には接続されていない。CoinGecko の複数 endpoint が同じ `payTo` に集約されるため、オンチェーンだけでは endpoint path を判定できず、real transaction と mock endpoint attribution を明確に分離して扱う必要がある。

## What Changes

- `packages/sources` に CoinGecko `payTo` に紐づく real onchain transfer list 取得を追加し、その transaction facts を Phase B demo projection の入力として扱う。
- `txHash` を join key とする mock endpoint attribution fixture を追加する。
- Phase A 由来の `onchain_fact` と、Phase B demo 用の `demo_label` / `future_sdk_field` / `derived_insight` を projection 上で分離する。
- BFF は request path で live source を呼ばず、生成済み projection / fixture を read-only に返し続ける。
- 現在の in-file deterministic read model を、real tx facts + mock attribution 由来の生成済み projection へ移行する。
- **BREAKING**: なし。既存 endpoint shape は canonical contract を維持する。

## Capabilities

### New Capabilities

- なし

### Modified Capabilities

- `phase-b-demo-bff`: Phase B demo BFF が prepared demo data を返す要件を、real onchain tx facts + mock endpoint attribution 由来の projection を返せる形へ拡張する。
- `market-intelligence`: Phase A 相当の onchain transaction facts を、Phase B projection 生成の入力として保存・再利用できる要件を明確化する。

## Impact

- `apps/bff` の demo data 読み込み元と projection 生成フロー。
- `packages/contracts` の Phase B provenance / schema validation 利用箇所。
- `packages/sources` の Bitquery transfer list adapter と、`apps/cli` または script による real transaction fixture / projection generation。
- `openspec/specs/phase-b-demo-bff` と `openspec/specs/market-intelligence` の要件。
- docs: `docs/phase-b/demo-data.md`、`docs/status.md`、必要に応じて BFF README。
