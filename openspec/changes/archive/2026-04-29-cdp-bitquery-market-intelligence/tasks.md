## 1. Workspace と contracts

- [x] 1.1 Bun / TypeScript package metadata を持つ `packages/contracts`、`packages/sources`、`packages/intelligence` workspace package を作成する。
- [x] 1.2 `packages/contracts` に正規化済み CDP resource / payment option schema を定義する。
- [x] 1.3 `packages/contracts` に Bitquery aggregate、latest-transfer、market resource、discrepancy、market snapshot schema を定義する。
- [x] 1.4 contract parsing と invalid input failure の fixture-based test を追加する。

## 2. Source clients

- [x] 2.1 pagination と configurable limit handling を持つ CDP Discovery client を `packages/sources` に実装する。
- [x] 2.2 source provenance と relevant quality field を保持しながら、CDP Discovery response を contract 型に正規化する。
- [x] 2.3 `BITQUERY_TOKEN` を configuration または explicit option から読む Bitquery GraphQL client を `packages/sources` に実装する。
- [x] 2.4 `payTo` ごとに group された payment option 向けの Base USDC aggregate query を実装する。
- [x] 2.5 recorded fixture と mocked fetch response を使った source client test を追加する。

## 3. Market intelligence

- [x] 3.1 要求された network / asset scope の payment option filtering を実装する。
- [x] 3.2 正規化済み CDP payment option と Bitquery aggregate を network、asset、`payTo` で結合する。
- [x] 3.3 source value を捨てずに active resource indicator、ranking field、discrepancy indicator を計算する。
- [x] 3.4 resource、payment option、aggregate、summary metrics、generated timestamp、source metadata を含む market snapshot object を構築する。
- [x] 3.5 join、zero-activity payment option、metric discrepancy の intelligence test を追加する。

## 4. CLI report generation

- [x] 4.1 package function 経由で x402 market snapshot を生成する CLI entrypoint を追加する。
- [x] 4.2 resource limit、network、asset、JSON output path、Markdown output path の CLI option を追加する。
- [x] 4.3 validated snapshot shape で `reports/x402-market-snapshot.json` を書き出す。
- [x] 4.4 high-level count、top resources、discrepancy notes を持つ `reports/x402-market-summary.md` を書き出す。
- [x] 4.5 Bitquery credential 不足時に明確な error を返し、誤解を招く partial activity report を出さないようにする。

## 5. Integration と verification

- [x] 5.1 package export を追加し、新しい CLI snapshot command 向けに workspace script を更新する。
- [x] 5.2 live CDP / Bitquery verification を default offline `bun run verify` path から分離する。
- [x] 5.3 新しい package と CLI report generation の targeted test を実行する。
- [x] 5.4 root `bun run verify` を実行し、regression を修正する。
- [x] 5.5 self-implemented probe workflow の legacy status と新しい CDP + Bitquery primary path を文書化する。
