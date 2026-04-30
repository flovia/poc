---
name: Flovia PoC Overall Overview
description: Narrative, scope, and tech stack for an investor/customer demo PoC dashboard
type: project
---

# Flovia PoC — Overview

> Last updated: 2026-04-28
> Purpose: capture the starting assumptions of the PoC
> Note: documents under `research/sync_meeting/` are for reference only. This PoC is designed from scratch

## ★ PoC goals

**Build a rich dashboard for investor/customer demo.**

- Emphasize a runnable demo with visuals and narrative
- Use mock JSON for the full PoC (real data connection in Phase 2)
- Final shape is ready for sharing via Vercel URL

## ★ Intended users

**API providers as customers** (= SaaS providers offering APIs via x402)

Designed as a tool for API providers to understand their users (= wallets), not an internal PM dashboard.

## ★ Narrative (three-minute story)

### Main narrative — Co-usage Discovery

> **"For wallets calling your API, what other APIs are they combining it with?"**
>
> Cross-provider payment logs reveal a full view of user behavior that cannot be seen from a single provider's invoices.
>
> Example: "Our image-generation users also call Storage and Billing APIs" → the workflow of
> image generation → storage → payment becomes visible.
>
> This is a story only because AI agent workflows can be observed across x402 facilitator public data,
> which is not possible in Stripe Dashboard.

### Sub-narrative — Retention

> Unlike human SaaS customers, AI agent retention is uncertain. Flovia visualizes how many agents stay after
> day 14 from first paid, helping assess whether the customer base is healthy.

### Core perspective shift

- **Co-usage pattern analysis, not competitor analysis**
- Other API providers are not always competitors; they are often workflow complements
- "Which APIs are often used with ours" → partnership opportunities, bundling ideas, better
  use-case understanding

## ★ Data assumptions

| Item | Assumption |
|---|---|
| cross-observation of x402 transactions | x402 facilitator published aggregated data |
| provider identity | resolve provider name from x402bazaar directory using `pay_to` address |
| API path granularity | if each API path has its own `pay_to`, identify by address; if not, complement with resource metadata |
| PoC data source | mock JSON (Phase 2 moves to real facilitator ingestion) |

**Important**: Customers may have one `pay_to` per API path or one for the entire provider.
Data model must support **both patterns**.

## ★ Tech stack

| Item | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Package manager | pnpm |
| Deployment | Vercel |
| Data | mock JSON first, structured for backend replacement |
| Design | custom from scratch with Codex, modern SaaS dashboard style |
| Visualization | primary: network graph (Force-directed), secondary: Sankey, strategy: bubble |

## ★ Access model (PoC)

**Fully flat**: pages for all providers are publicly viewable.

- No "self mode / other mode"
- `pay_to` entered by user is saved in browser `localStorage` for easy switching and deleting
- Each page explicitly states "data from this provider"

### Expansion points when authentication is introduced later

Provider-specific proprietary data via SDK will be separated into components so it can be
introduced with auth later. In PoC:

- Keep public x402 data and provider-private SDK data separated by component boundaries
- Keep private data ready for future auth guard integration

## ★ Scope out of PoC

- Real facilitator / on-chain ingestion
- Authentication / multitenancy / RBAC (planned for future)
- Server-side user setting persistence (only localStorage in PoC)
- Proprietary private data display (SDK integration later)
- Alerts / notifications
- Internationalization
