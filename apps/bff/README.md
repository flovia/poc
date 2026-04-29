# Flovia BFF

BFF は、CDP + Bitquery market intelligence product の将来的な product API 境界として残しています。

この branch では、以前の SQLite / CLI 結合 read model を意図的に削除しています。
その実装は `v0-self-implemented-x402` に保存済みです。現在の BFF は、`apps/cli` に依存しない最小の独立 HTTP app です。

## コマンド

```bash
bun install
cd apps/bff
bun run start
bun run verify
```

## エンドポイント

- `GET /` -> `{ status: "ok", service: "flovia-bff" }`
- `GET /health` -> `{ status: "ok", service: "flovia-bff" }`

将来 market intelligence endpoint を追加する場合は、生成済み snapshot、projection、または保存済みデータを読みます。
ユーザーリクエストごとに live CDP / Bitquery call を発行しない方針です。
