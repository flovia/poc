## 1. Contract 境界

- [x] 1.1 現在の `CustomerIntelligenceResponse`、`PortfolioSummary`、`DeFiPosition`、`SourceCoverage` schema を確認し、Zerion provenance の最小追加方針を決める
- [x] 1.2 Zerion source provenance と normalized portfolio / DeFi source result shape の failing contract tests を追加する
- [x] 1.3 `zerion` source provenance support と、`packages/sources` / `packages/intelligence` で共有が必要な normalized portfolio source schema を追加する
- [x] 1.4 product payload fixture が raw Zerion response、API key、auth header、request metadata を拒否することを検証する

## 2. Zerion Source Adapter

- [x] 2.1 portfolio summary、DeFi positions、empty portfolio、partial response、API error 用の Zerion response fixtures を追加する
- [x] 2.2 injected `FetchLike`、明示 endpoint configuration、adapter 内で process env を読まない方針で `packages/sources/zerion.ts` を実装する
- [x] 2.3 Zerion wallet portfolio response を repository-owned summary / position DTO に正規化する
- [x] 2.4 Zerion が成功 response として empty result を返した場合は、unavailable ではなく zero positions の available portfolio coverage として扱う
- [x] 2.5 timeout / 429 / 5xx 系 response を、positions を捏造せず explicit partial または unavailable coverage に map する

## 3. Intelligence Integration

- [x] 3.1 available Zerion portfolio summary / positions を使う `classifyDefiActivity()` tests を追加する
- [x] 3.2 unavailable Zerion coverage が DeFi inactive を意味しないことを示す tests を追加する
- [x] 3.3 successful positions が evidence / reasons 付きの derived DeFi active insights を生成するよう portfolio / DeFi classification を更新する
- [x] 3.4 wallet-wide Zerion data が Base / USDC x402 payment scope と混同されないよう、reasons または scope metadata に明示する

## 4. CLI Capture Integration

- [x] 4.1 `--portfolio-source zerion` など、明示的な Zerion enablement の CLI argument tests を追加する
- [x] 4.2 Zerion capture が有効な場合だけ `apps/cli` で `ZERION_API_KEY` を解決する
- [x] 4.3 Zerion capture 有効時に credential がない場合、output write 前に失敗することを確認する
- [x] 4.4 Zerion source adapter を `customer:intelligence` capture に接続し、normalized portfolio result を `buildCustomerIntelligence()` に渡す
- [x] 4.5 available、empty、partial、unavailable の Zerion outcome について mocked end-to-end CLI flow tests を追加する

## 5. BFF / Fixtures / Docs

- [ ] 5.1 raw Zerion data を露出せず、Zerion available coverage を示す prepared customer intelligence fixture を更新または追加する
- [x] 5.2 fixture を更新する場合は、Zerion portfolio / DeFi context を含む prepared read model の BFF validation test coverage を追加する
- [x] 5.3 CLI docs に Zerion capture usage、必要な environment variable、offline verification separation を追記する
- [x] 5.4 customer intelligence docs に Zerion-derived facts、derived DeFi classification、unavailable / partial coverage semantics を追記する

## 6. Verification

- [x] 6.1 formatting が変わった場合は `bun run format` を実行する
- [x] 6.2 root で `bun run verify` を実行し、live Zerion access や `ZERION_API_KEY` が不要であることを確認する
- [ ] 6.3 `ZERION_API_KEY` を `.env` から読み込む explicit live command を実行し、対象 wallet の portfolio / DeFi 情報が Zerion から取得できることを確認する
- [x] 6.4 live Zerion capture で生成した read model JSON を `packages/contracts` の customer intelligence schema で validation する
- [x] 6.5 live capture 結果を `apps/bff/fixtures/phase-b/customer-intelligence/0xac5a07c44a4f971667b3df4b6551fb6991b2142d.json` などの prepared fixture に反映する場合、raw Zerion response、API key、auth header、request metadata が含まれないことを確認する
- [x] 6.6 prepared fixture 更新後に BFF route test / schema validation が offline で通ることを確認する
- [x] 6.7 `add-zerion-portfolio-intelligence` の OpenSpec status を確認し、artifacts と implementation tasks が揃っていることを確認する
