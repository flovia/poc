# Vercel frontend deployment

The public dashboard on Vercel is a fixture-only Next.js app. It does not call
the Lightsail BFF at build time or at runtime.

## Data source

Fixture mode is the default. The public project does not need
`NEXT_PUBLIC_FLOVIA_DATA_SOURCE` or `FLOVIA_FRONTEND_DATA_SOURCE`. A leftover
`BFF_URL` does not switch the app back to the BFF.

Set these Production and Preview environment variables:

| Name | Value | Why |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://demo.flovia402.com` | Canonical origin for Open Graph URLs. |

Opt into BFF mode only for local or compose development by setting
`NEXT_PUBLIC_FLOVIA_DATA_SOURCE=bff` (and `FLOVIA_FRONTEND_DATA_SOURCE=bff`)
with `BFF_URL`.

When the data source is `fixture` (the default):

- Provider catalog, customers, wallet 360, and route analytics come from
  `apps/frontend/lib/sdk-fixtures/`.
- Wallet addresses are deterministic synthetic values, not on-chain identities.
- `/api/:path*` is not rewritten to the BFF.
- Showcase live payments are paused. The Simulate control still shows a
  recorded flow.

Local BFF-backed development uses `apps/frontend/.env.example` as the template
and must set `NEXT_PUBLIC_FLOVIA_DATA_SOURCE=bff` with `BFF_URL=http://localhost:3001`.

## Project settings

GitHub Actions deploy with `vercel pull` → `vercel build` → `vercel deploy --prebuilt`.
Root `vercel.json` only disables Vercel Git deploys. App settings live in
`apps/frontend/vercel.json` (framework, frozen Bun install, security headers).

1. Root Directory: `apps/frontend`. Keep source files outside the Root Directory
   included so the repository `bun.lock` is visible.
2. Node.js version comes from `apps/frontend/package.json` `engines.node` (`24.x`).
3. Confirm in a preview build log whether Vercel applied `apps/frontend/vercel.json`
   or the repository-root `vercel.json`. The deploy action runs from the
   repository root against a project whose Root Directory is `apps/frontend`.

## CLI pin

`.github/actions/vercel-deploy/action.yml` installs `vercel@59.22.0`. Do not use
`vercel@latest` in CI.

## Verification

1. Open `/providers`. The picker shows fixture providers (including Northwind
   Price API) without the BFF.
2. Open a provider Customers and Wallet page. Addresses are full synthetic
   EVM values, not truncated placeholders or known public payTo wallets.
3. Open `/showcase/stripe-mpp`. Live Call/Pay buttons are disabled.
4. `/api-keys`-style private surfaces do not exist in this app. `/setup` remains
   available as a localStorage demo.

## Rollback

Use Vercel instant rollback. No Lightsail or DNS change is required for a
frontend-only rollback.
