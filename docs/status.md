# Flovia PoC Track

## Current status

Phase A は **core 完了** と判定する。

```text
Phase A core: done
Phase A hardening: follow-up possible
Phase B: not cleared yet
```

## Phase A: data foundation

### 判定

`docs/spec.md` の Phase A は、現状の `apps/cli` と `packages` による market snapshot / intelligence 基盤として成立している。

### 実装済み

- `packages/contracts`
  - Zod schema、TypeScript 型、normalization helper を提供している。
  - source facts と market snapshot の contract boundary として機能している。
- `packages/sources`
  - CDP Discovery と Bitquery source adapter を持つ。
  - pagination、response parse、contract への正規化を担っている。
- `packages/intelligence`
  - scope filtering、join、active 判定、ranking、discrepancy、snapshot 生成を担っている。
- `apps/cli`
  - batch orchestration、引数処理、sources と intelligence の接続、JSON / Markdown report 出力を担っている。
- import boundary
  - `scripts/check-import-boundaries.ts` による境界検査がある。
- tests / verification
  - contracts、sources、intelligence、cli、bff の typecheck / test が通る。
  - `bun run verify` は offline で通過済み。

### 検証結果

```text
bun run verify

Import boundaries OK
packages/contracts: pass
packages/sources: pass
packages/intelligence: pass
apps/cli: pass
apps/bff: pass
```

## Remaining hardening for Phase A

Phase A の core は完了。ただし、次は hardening として扱う。

- import boundary checker の網羅性強化
  - `packages/* -> apps/*` 禁止
  - `packages/sources <-> packages/intelligence` 相互 import 禁止
  - `apps/bff -> apps/cli` 禁止
  - 必要なら `apps/*` 間依存方針も明文化・検査する。
- Bitquery 実装の汎用化
  - 現状は Base USDC 前提が強い。
  - network / asset を広げる場合は source adapter 側で拡張する。
- snapshot contract の意味論整理
  - onchain-only facts、demo label、future SDK telemetry field を混ぜないための分類を明確化する。

## Phase B: next target

次に着手する主対象は Phase B。

### Goal

BFF が frontend demo のための read-only product API boundary になること。

frontend: ../poc-frontend or https://github.com/flovia/poc-frontend (private repo)

### Build order

1. frontend 4画面に必要な API shape を定義する。
2. demo dataset / fixture を用意する。
3. BFF route が fixture / projection を read-only に返す。
4. Setup、My Customers、Wallet 360°、Co-usage Patterns の demo flow を支える。
5. onchain-only / demo label / future SDK field の区別を API response 上でも分かるようにする。

### Candidate endpoints

```text
GET /customers
GET /customers/:address/profile
GET /wallet-usage-graph
GET /patterns
```

### Phase B で扱う demo fields

- source / medium candidate
- referrer-like label
- campaign-like label
- workflow / use case candidate
- endpoint candidate
- endpoint usage frequency
- retention / upsell / partnership insight
- confidence / evidence label

これらは現時点では実データではなく、`demo label` または `future SDK telemetry field` として扱う。

### Phase B data classification

Phase B の BFF response では、実データ由来の値と demo / 将来 telemetry 由来の値を混ぜず、各 field の由来を明示する。

#### Phase A に依存する実データ

Phase A の data foundation から得られる、または Phase A snapshot / projection から再生成できる値。

- `pay_to` / recipient
- payer wallet / customer wallet
- network / asset
- payment activity / payment frequency
- active wallet 判定
- customer ranking / payer quality
- CDP resource / payment option
- Bitquery payTo aggregate
- market snapshot
- customer wallet projection
- wallet profile projection
- co-usage graph projection
- product / resource candidate cluster
- confidence / evidence のうち onchain facts に基づく部分

Phase B ではこれらを request path で live source から取りに行かず、prepared demo dataset、fixture、または Phase A snapshot 相当の read model として BFF から返す。

#### 現時点では実データではない値

Phase A の onchain-first data foundation だけでは確定できないため、Phase B では `demo label` または `future SDK telemetry field` として扱う値。

- source / medium candidate
- referrer-like label
- campaign-like label
- workflow / use case candidate
- endpoint candidate
- endpoint usage frequency
- endpoint attribution
- workflow sequence
- agent type inference
- provider-specific funnel
- plan / monetization context
- retention / upsell / partnership insight の演出・仮説部分

これらを実データ化するには、将来の SDK middleware、provider attribution data、request path、resource、request context、provider-side event、endpoint-level request telemetry が必要。

#### API response 上の扱い

各 response field には、少なくとも次のいずれかの分類を持たせる。

- `onchain_fact`: Phase A の source facts / snapshot / projection から説明できる値
- `demo_label`: frontend demo の意思決定体験を見せるために用意した fixture 値
- `future_sdk_field`: SDK telemetry 統合後に実データ化する想定の値
- `derived_insight`: `onchain_fact` と `demo_label` から作る insight / hypothesis

`derived_insight` は、根拠に `demo_label` や `future_sdk_field` が含まれる場合、実データとして扱わない。

## Not now

- BFF request path で live CDP / Bitquery / RPC を呼ぶこと
- SDK middleware の本実装
- endpoint / workflow / MRR の実データ推定
- Solana parser
- 認証、課金、本番 multi tenant 化

## One-line summary

Phase A の data foundation は通過済み。次は Phase B として、BFF demo read model と frontend 4画面向け API shape を作る。
