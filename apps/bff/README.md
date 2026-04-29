# Flovia BFF

BFF は、frontend demo のための read-only product API 境界です。

Phase B では、prepared demo read model を返す 3 つの product endpoint を提供します。
現在の BFF は `apps/cli` に依存せず、`packages/contracts` の Phase B contract に従う
canonical envelope response を返します。

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
- `GET /customers` -> Phase B customer list projection
- `GET /customers/:address/profile` -> Phase B wallet profile projection
- `GET /wallet-usage-graph` -> Phase B co-usage graph projection

product endpoint の response は `docs/phase-b/api-contract.md` と `packages/contracts` の Phase B schema に従います。
demo label や future SDK telemetry 想定値は専用 endpoint ではなく、上記 3 endpoint の
response に内包され、`provenance` / `provenanceByField` / `reasons` で区別されます。

以下は Phase B 初回実装では公開しません。

- `GET /demo-data`
- `GET /sdk-events`
- `GET /telemetry`
- `GET /patterns`
- `GET /summary`

## データソース

現在の BFF は `apps/bff/src/data/phase-b-demo.ts` の deterministic fixture / read model を返します。
fixture は module initialization 時に `packages/contracts` の validator で検証されます。

将来 market intelligence endpoint を拡張する場合も、生成済み snapshot、projection、または保存済みデータを読みます。
ユーザーリクエストごとに live CDP / Bitquery / RPC / SDK collector call を発行しない方針です。

## Read-only 方針

product endpoint は GET のみを受け付けます。非 GET method は write operation を行わず、
read-only 方針に沿った error response を返します。
