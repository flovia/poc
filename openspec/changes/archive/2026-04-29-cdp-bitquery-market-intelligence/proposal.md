## なぜやるか

現在の PoC は self-implemented な x402 discovery、probe、onchain collection を中心にしていたが、CDP x402 Discovery と Bitquery はすでに広い resource metadata と payment activity coverage を提供している。
これらの source に軸足を移すことで、既存の self-implemented pipeline を `v0-self-implemented-x402` branch に保存しつつ、x402 market intelligence の検証をより速く進められる。

## 変更内容

- 新規作業の default direction として、CDP + Bitquery based market intelligence pipeline を導入する。
- CLI と BFF を薄い application entrypoint に保つため、core logic を package 化する。
- CDP resource / payment-option metadata と Bitquery transfer activity を結合して market snapshot を生成する。
- DB persistence や BFF read endpoint を追加する前に、JSON / Markdown report を生成する。
- 旧 dry-run probe、paid probe、onchain scanner、fingerprint decoder workflow は、この change の main path ではなく legacy / optional として扱う。
- 初期実装では、BFF request handler から live CDP / Bitquery call を発行しない。

## Capability

### 新しい Capability

- `market-intelligence`: CDP Discovery resource と Bitquery payment activity から、正規化済み x402 market snapshot を構築する。

### 変更される Capability

なし。

## 影響

- contract、source client、market intelligence logic のために `packages/` 配下に shared package を追加する。
- x402 market snapshot を生成するため、`apps/cli` に CLI command を追加または更新する。
- `apps/bff` は将来的な product API 境界として残すが、最初の実装 step では BFF rewrite を要求しない。
- Bitquery GraphQL request には環境変数 `BITQUERY_TOKEN` を使う。
- 可能な範囲で既存の Docker、Bun workspace、TypeScript、Biome、verification foundation を維持する。
