# packages

このディレクトリには、x402 マーケットインテリジェンスの中核ロジックを置きます。

`apps/cli` と `apps/bff` は実行入口です。ドメインロジック、外部 API 連携、スナップショット生成の判断は `packages/*` に寄せます。

## 依存方向

```text
apps/cli ─┐
          ├──▶ packages/*
apps/bff ─┘
```

ルール:

- `apps/*` から `packages/*` への import は OK
- `packages/*` から `apps/*` への import は禁止
- `apps/bff` から `apps/cli` への import も禁止

## パッケージ

### `contracts`

共有 contract を定義します。

- Zod schema
- TypeScript 型
- 正規化済み CDP resource / payment option
- Bitquery aggregate
- market snapshot DTO
- network / asset / payTo の正規化 helper

### `sources`

外部 source との接続を担当します。

- CDP x402 Discovery client
- Bitquery GraphQL client
- pagination
- response parse
- contracts への正規化

ここでは ranking や scoring は行いません。

### `intelligence`

分析ロジックを担当します。

- CDP resource と Bitquery activity の join
- scope filtering
- active resource 判定
- ranking
- discrepancy detection
- market snapshot 生成

## 方針

この branch では CDP + Bitquery を primary source とします。

旧 self-implemented discovery / probe / onchain attribution 基盤は `v0-self-implemented-x402` branch に保存済みで、この `packages` 構成には含めません。

## 検証

各 package は個別に検証できます。

```bash
cd packages/contracts && bun run typecheck && bun test
cd packages/sources && bun run typecheck && bun test
cd packages/intelligence && bun run typecheck && bun test
```

通常は repository root でまとめて実行します。

```bash
bun run verify
```
