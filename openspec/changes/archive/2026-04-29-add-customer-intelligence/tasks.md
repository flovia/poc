## 1. Contract First

- [x] 1.1 既存 `packages/contracts` の Phase B schema / provenance 型を確認し、customer intelligence contract の配置と export 方針を決める
- [x] 1.2 customer intelligence response / fixture / scope / source coverage / evidence schema の failing contract tests を追加する
- [x] 1.3 `CustomerIntelligenceResponse`、`CustomerIntelligenceFixture`、`X402ServiceCandidate`、`PayToActivity`、`PortfolioSummary`、`DeFiPosition`、insight / evidence / provenance schema を実装する
- [x] 1.4 lowercase EVM address、network、asset、time window、derived insight reasons の validation tests を通す

## 2. Intelligence Core

- [x] 2.1 `packages/intelligence` の package 構成と exports を追加する
- [x] 2.2 `aggregatePayToActivities()` の failing tests を追加し、payTo / network / asset / time window 単位の集計を実装する
- [x] 2.3 `matchPayToToPaymentOptions()` の failing tests を追加し、payTo activity と CDP payment option の join を実装する
- [x] 2.4 `scoreServiceCandidates()` の failing tests を追加し、confidence、reasons、evidence を持つ service candidate scoring を実装する
- [x] 2.5 `classifyDefiActivity()` の failing tests を追加し、portfolio / DeFi source coverage と active / inactive classification を実装する
- [x] 2.6 `buildCustomerIntelligence()` の failing tests を追加し、contract schema で validate できる projection builder を実装する

## 3. Source Interfaces and Capture Inputs

- [x] 3.1 `packages/sources` に customer outgoing transfer、CDP payment option lookup、portfolio source の normalized input / output contract を追加する
- [x] 3.2 Bitquery outgoing transfer adapter または fixture-backed source の tests を追加し、customer address / network / asset / time window filter を実装する
- [x] 3.3 CDP payment option adapter の再利用または lookup wrapper の tests を追加し、payTo / network / asset matching に必要な metadata を返す
- [x] 3.4 portfolio source が unavailable な場合の normalized result と unavailable reason を実装する

## 4. Fixtures and BFF Endpoint

- [x] 4.1 `apps/bff/fixtures/phase-b/customer-intelligence/` に valid customer intelligence read model fixture を追加する
- [x] 4.2 BFF の fixture loader / repository に customer intelligence read model lookup を追加する
- [x] 4.3 `GET /customers/:address/intelligence` の route tests を追加し、known address の `200`、unknown address の `404`、mixed-case normalization を Red にする
- [x] 4.4 BFF route を実装し、prepared read model を `packages/contracts` で validate して read-only response として返す
- [x] 4.5 route test で request path が live CDP、Bitquery、Zerion、MCP、RPC、SDK collector を呼ばないことを確認する

## 5. CLI Capture

- [x] 5.1 `apps/cli` の command 構成を確認し、customer intelligence capture command の引数 parse tests を追加する
- [x] 5.2 customer address、network、asset、from、to、out を受け取る capture orchestration を実装する
- [x] 5.3 sources → intelligence builder → contracts validation → JSON write の flow tests を追加する
- [x] 5.4 credential 不足時に明確な configuration error で失敗し、partial read model を成功扱いで書き出さないことをテストする
- [x] 5.5 live source capture / validation command を default `bun run verify` から分離する

## 6. Verification and Documentation

- [x] 6.1 customer intelligence の source fact / derived insight / demo label / future SDK field の扱いを docs または inline fixture metadata に反映する
- [x] 6.2 `bun run format` を必要に応じて実行する
- [x] 6.3 root で `bun run verify` を実行し、offline で typecheck / test / route test が通ることを確認する
- [x] 6.4 OpenSpec status を確認し、change artifacts と implementation state が一致していることを確認する
