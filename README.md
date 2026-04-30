# 🌊 Flovia

> Mapping the Machine Payable Web with x402 and Solana signals.

<p align="center">
  <strong>x402 × MPP × Solana × Customer Intelligence</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/x402-Payment%20Discovery-purple" alt="x402 Payment Discovery" />
  <img src="https://img.shields.io/badge/MPP-Machine%20Payable%20Products-orange" alt="Machine Payable Products" />
  <img src="https://img.shields.io/badge/Solana-Onchain%20Signals-14F195" alt="Solana Onchain Signals" />
</p>

---

## 🚀 What is Flovia?

**Flovia** explores the emerging **Machine Payable Web** through market intelligence for machine-payable products and services.

It combines x402 payment discovery, onchain activity signals, customer intelligence pipelines, a read-only product API, and a Next.js demo frontend to reveal:

- what machine-payable services exist
- which wallets are economically active
- how usage clusters across apps and services
- where new customer opportunities may be forming
- how Solana-style high-frequency payment signals can shape market intelligence

The current implementation uses `contract / source / intelligence` layers across `packages/*`, consumed by `apps/cli`, `apps/bff`, and `apps/frontend`.

---

## 🧠 The thesis

The web is gaining a new economic layer.

Instead of relying only on manual subscriptions, signups, and checkout flows, software can increasingly:

- discover paid APIs
- pay per request
- compose services dynamically
- leave machine-readable payment traces
- generate wallet-level usage and demand signals

This creates a new category:

> **Machine Payable Products** — products and services that agents, apps, and APIs can discover, evaluate, and pay for programmatically.

Flovia explores the intelligence layer for that category.

---

## ✨ Demo flow

```mermaid
flowchart LR
  A[x402 Discovery] --> D[Source Layer]
  B[Bitquery / Onchain Signals] --> D
  C[Solana Payment Activity] --> D

  D --> E[Intelligence Layer]
  E --> F[Market Snapshot]
  E --> G[Customer Intelligence]
  E --> H[Wallet Usage Graph]

  F --> I[BFF API]
  G --> I
  H --> I

  I --> J[Next.js Frontend]
```

---

## ⚡ What Flovia reveals

| Signal | Insight |
| --- | --- |
| x402 service discovery | What machine-payable services exist? |
| Onchain payment activity | Which wallets are economically active? |
| Solana-style payment signals | Where high-frequency payment demand may emerge |
| Wallet co-usage | Which apps and services share customer clusters? |
| Customer intelligence | Who is likely to pay for what next? |

---

## 🟣 Why Solana signals?

Solana is a natural fit for machine-payable market intelligence because it emphasizes:

- low-cost payment events
- fast settlement
- wallet-native identity surfaces
- high-frequency usage patterns
- strong agent, DePIN, API-commerce, and payment experimentation ecosystems

Flovia currently treats Solana as a signal direction for onchain payment intelligence while keeping default verification deterministic and offline-first.

---

## 🏗️ Architecture

| Workspace | Purpose |
| --- | --- |
| `apps/cli/` | CLI entrypoint, market snapshot / customer intelligence generation, fixture capture, reporting |
| `apps/bff/` | Read-only product API for frontend demos; returns prepared fixtures / projections in a canonical envelope |
| `apps/frontend/` | x402 co-usage discovery prototype UI built with Next.js 15 and React 19 |
| `packages/contracts/` | Shared Zod contracts for market intelligence and Phase B product API schemas |
| `packages/sources/` | Source clients and normalization for CDP Discovery and Bitquery |
| `packages/intelligence/` | Join logic, ranking, customer intelligence, and projection helpers |

The CLI generates market snapshots and customer intelligence by combining CDP x402 Discovery and Bitquery. The BFF serves saved read models as a read-only product API, and the frontend renders those projections as a Next.js UI.

---

## ⚡ Quick start

Requirements:

- Bun `>=1.3.13`
- Node.js `>=20` to run the frontend

```sh
bun install
cp -n .env.example .env
bun run verify
```

Environment variables are stored in the repository-root `.env` file. Use `.env.example` as a template. Live capture / snapshot / customer intelligence with Bitquery requires `BITQUERY_TOKEN`.

---

## 🧪 Common commands

Unless otherwise noted, run commands from the repository root.

```sh
bun run verify        # import boundary, typecheck, tests, offline verification
bun run test          # test suite
bun run typecheck     # TypeScript strict typecheck
bun run format        # format TypeScript / JSON with Biome
bun run format:check  # check formatting
```

Start the demo stack:

```sh
bun --filter bff start       # start read-only product API (default: localhost:3001)
bun --filter frontend dev    # start frontend dev server (default: localhost:3000)
```

Or run BFF and frontend together:

```sh
docker compose up --build
```

---

## 🔎 Generate intelligence

CLI pipeline commands are available from the `apps/cli` workspace.

```sh
bun --cwd apps/cli market:snapshot -- --limit 100 --network base --asset USDC
bun --cwd apps/cli market:snapshot -- --all
bun --cwd apps/cli customer:intelligence -- --address 0x... --network base --asset USDC
bun --cwd apps/cli coingecko:transactions -- --from 2026-01-01T00:00:00Z --to 2026-04-29T23:59:59Z
```

`market:snapshot` requires `BITQUERY_TOKEN` when scoped payment options need Bitquery activity. By default, it writes:

- `apps/cli/reports/x402-market-snapshot.json`
- `apps/cli/reports/x402-market-summary.md`

Without `--all`, the result is capped by `X402_MARKET_FETCH_LIMIT` (default: 100). This cap is intentionally conservative, so pass `--all` explicitly if needed.

`customer:intelligence` and `coingecko:transactions` regenerate fixtures / read models using live Bitquery and CDP Discovery. They are not included in normal `verify` runs. See `apps/cli/scripts/README.md` for details.

---

## 🌐 BFF / frontend

The BFF does not call live CDP / Bitquery / RPC / SDK collector methods on the request path. It returns deterministic fixture / read models from `apps/bff/src/data/phase-b-demo.ts`.

Main endpoints:

| Endpoint | Description |
| --- | --- |
| `GET /` / `GET /health` | API health check |
| `GET /customers` | Known customer list |
| `GET /customers/:address/profile` | Customer profile |
| `GET /customers/:address/intelligence` | Customer intelligence |
| `GET /wallet-usage-graph` | Wallet / app usage graph |

The frontend fetches the BFF from Server Components. You can override the target with `BFF_URL` (default: `http://localhost:3001`) and `NEXT_PUBLIC_BFF_URL` (default: `/api`).

```sh
bun --filter bff start
BFF_URL=http://localhost:3001 NEXT_PUBLIC_BFF_URL=/api bun --filter frontend dev
```

API contracts are based on `docs/phase-b/api-contract.md` and the Phase B schema in `packages/contracts`.

---

## 🔒 Verification policy

```sh
bun run verify
```

The default verification path is intentionally offline-only. It must pass without:

- wallet access
- paid APIs
- live RPC calls

Live verification is explicit and opt-in through commands such as `market:snapshot`.

---

## 🛠️ Tech stack

- Bun workspaces
- TypeScript 6
- Zod contracts
- Next.js 15
- React 19
- CDP x402 Discovery
- Bitquery
- Biome
