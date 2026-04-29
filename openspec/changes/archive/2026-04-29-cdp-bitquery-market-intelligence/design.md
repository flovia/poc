## 背景

現在の repository は Bun workspace で、`apps/cli` が主な PoC 実装、`apps/bff` が read API surface です。
既存実装は、endpoint discovery、dry-run probe、paid probe、onchain scan、attribution / fingerprint logic など、self-managed な x402 acquisition を中心に構築されていました。

今回の pivot では repository を x402-specific のまま保ちつつ、default data path を変更します。
CDP x402 Discovery が resource / payment-option metadata を提供し、Bitquery GraphQL が観測済み payment activity を提供します。
self-implemented pipeline は `v0-self-implemented-x402` branch に残し、将来 optional verification として再導入できますが、この change の main path ではありません。

## 目標 / 対象外

**目標:**

- shared domain logic を `packages/` 配下に置き、`apps/cli` と `apps/bff` は薄い entrypoint として扱う。
- external response を repository-owned contract に正規化する CDP / Bitquery source client を追加する。
- CDP resource / payment option と Bitquery transfer aggregate を結合して market snapshot を構築する。
- CLI command から deterministic な JSON / Markdown report を生成する。
- 可能な範囲で既存の Bun workspace、Docker、TypeScript、Biome、verification foundation を維持する。

**対象外:**

- 初期実装では DB persistence を行わない。
- 初期実装では BFF rewrite を行わない。
- BFF request handler から live CDP / Bitquery call を発行しない。
- default market snapshot の一部として dry-run / paid probe を実行しない。
- 新しい architecture と衝突する場合、旧 CLI command internals の維持を目的にしない。

## 決定事項

### package name に prefix を付けない

この repository は x402-specific なので、package name に `x402-` prefix は付けません。初期 package は次の通りです。

- `packages/contracts`: Zod schema、共有 TypeScript type、正規化済み model、DTO。
- `packages/sources`: CDP Discovery / Bitquery GraphQL client と response normalization。
- `packages/intelligence`: join、ranking、discrepancy detection、summary data、market snapshot construction。

`packages/store` は、snapshot model が DB persistence を正当化できるほど安定するまで延期します。

検討した代替案: `packages/x402-contracts`、`packages/x402-sources`、`packages/x402-intelligence`。
x402-only repository では冗長なので採用しませんでした。

### app は薄く保つ

CLI と BFF はどちらも package に依存し、互いには依存しません。

```text
apps/cli ─┐
          ├──▶ packages/*
apps/bff ─┘
```

package code は `apps/*` から import してはいけません。これにより、現在の PoC 形状が CLI implementation detail を BFF に hard-code することを防ぎます。

### CLI snapshot output から始める

最初の実装 target は、次のファイルを書き出す CLI command です。

- `reports/x402-market-snapshot.json`
- `reports/x402-market-summary.md`

これにより、CDP / Bitquery の data shape が検証される前に persistence や BFF read model を早期設計しすぎることを避けます。

### CDP と Bitquery を primary source として扱う

CDP Discovery は resource metadata、payment option、`payTo`、asset、amount、network、quality field の source です。
Bitquery GraphQL は transaction count、unique sender、volume、latest observed payment data など transfer activity の source です。

snapshot builder は、主に network、asset、`payTo` による正規化済み payment option を join key として使います。

### BFF request handler で live external call を避ける

BFF は将来的に snapshot、projection、または stored data を読みます。
初期 design では、incoming product request ごとに Bitquery call を発行しません。user-facing latency と reliability を external API cost / rate limit に結合しないためです。

## リスク / トレードオフ

- CDP / Bitquery schema が変化する可能性がある → `packages/contracts` 経由で正規化し、regression test 用 raw fixture を保持する。
- Bitquery query cost は payTo count とともに増える可能性がある → batch request し、Base USDC から始め、CLI に limit を公開する。
- CDP quality metrics と Bitquery transfer metrics が正確に一致しない可能性がある → hard error ではなく first-class snapshot field として discrepancy を追跡する。
- probe を省略すると live endpoint verification を失う → default dependency ではなく optional future mode として残す。
- DB persistence を延期すると BFF の有用性は初期段階で限定される → report file を最初の stable contract とし、snapshot shape が証明されてから `packages/store` を追加する。

## 移行計画

1. 現在の self-implemented pipeline を `v0-self-implemented-x402` に隔離する。
2. pivot branch に contracts、sources、intelligence の shared package を追加する。
3. 旧 database や BFF を変更せず、新しい source path を実行する CLI snapshot command を追加する。
4. fixture と、default offline `verify` path 外の live-only command で検証する。
5. snapshot model が安定してから `packages/store` と BFF read endpoint を追加する。

## 未決事項

- routine local run 向けの default CDP page size と maximum resource limit はどれにするか。
- 最初の Bitquery implementation は aggregate のみを取得するか、payment option ごとに小さな latest-transfer sample も保存するか。
- Base path が安定した後、最初の follow-up で Base USDC 以外にどの network を含めるか。
