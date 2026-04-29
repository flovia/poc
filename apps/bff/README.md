# Flovia BFF

The BFF is kept as the future product API boundary for the CDP + Bitquery market
intelligence product.

This branch intentionally removed the previous SQLite/CLI-coupled read model.
That implementation is preserved on `v0-self-implemented-x402`. The current BFF
is a minimal independent HTTP app so it does not import from `apps/cli`.

## Commands

```bash
bun install
cd apps/bff
bun run start
bun run verify
```

## Endpoints

- `GET /` -> `{ status: "ok", service: "flovia-bff" }`
- `GET /health` -> `{ status: "ok", service: "flovia-bff" }`

Future market intelligence endpoints should read generated snapshots,
projections, or stored data. They should not issue live CDP or Bitquery calls per
user request.
