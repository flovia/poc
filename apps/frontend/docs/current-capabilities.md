# Flovia PoC Frontend — Current Capabilities

Last updated: 2026-04-29

This document summarizes what `apps/frontend` currently **can show and what it cannot**.
It clarifies the implementation status and the areas intentionally omitted within the
PoC scope.

---

## 1. Overall architecture

```
[Browser]
   |
   ▼
[Next.js 15 App Router (poc-frontend)]
   │  Server Component fetches (cache: no-store)
   ▼
[Flovia BFF (apps/bff, Bun)]   ← localhost:3001
   |
   ▼
[prepared fixture / projection read model]
```

- The frontend does **not hold state**. All screens fetch DTOs from BFF inside Server
  Components and pass them directly into components.
- BFF is **read-only** and performs no writes, ingestion, or scoring.
- Data is projected into a read model at module initialization from
  `apps/bff/fixtures/phase-a/coingecko-transactions.json`,
  `apps/bff/fixtures/phase-b/mock-attribution.json`, and
  `apps/bff/fixtures/phase-b/customer-intelligence/*.json`.

### Startup

```bash
# BFF
bun --filter bff start                            # http://localhost:3001

# Frontend
BFF_URL=http://localhost:3001 NEXT_PUBLIC_BFF_URL=/api bun --filter frontend dev # http://localhost:3000
```

---

## 2. Screen-level: what is visible

### 2.1 `/setup`

| Item | Status |
| --- | --- |
| Provider name / mode (`simple` / `advanced`) and `pay_to` registration form | ✅ working |
| `simple` mode: store one `pay_to` | ✅ |
| `advanced` mode: store multiple rows of `API path × pay_to` | ✅ |
| Validation (`pay_to` required / minimum one row in `advanced`) | ✅ |
| Persistence to localStorage (`flovia:providers`) | ✅ |
| Demo 3-provider seed on first visit (`acme-price` / `lumen-vec` / `halonet`) | ✅ |
| Display and delete saved providers (with confirmation dialog) | ✅ |

**Note**: `providerId` registered in Setup is only a **display identifier** in the
sidebar and does not affect BFF data scope. BFF has no provider-level filtering API.

---

### 2.2 `/providers/[providerId]/customers` — Customers list

[CustomersPage](../app/providers/%5BproviderId%5D/customers/page.tsx) calls `GET /customers`, passes
[`CustomerListItemDto[]`](../lib/api/types.ts) to
[`CustomersTable`](../components/customers/CustomersTable.tsx).

#### Displayable columns

| Column | DTO field | Notes |
| --- | --- | --- |
| Wallet | `address` | payer wallet address |
| Spend (atomic) | `spendAtomic` | formatted with `formatAtomic`, assuming 6 decimals |
| Observations | `observationCount` | observed on-chain payment count |
| Providers | `providerCount` | distinct recipient wallets this payer paid |
| Activity growth | `activityGrowth` | first-half / second-half observation ratio (BFF heuristic) |
| Last seen | `lastSeenAt` | unix sec → ISO string |
| Upsell | `upsellOpportunity` | displayed as `low` / `medium` / `high` using `UpsellPill` |

#### Summary chips
- Total wallets
- Cumulative spend (atomic)
- High-upsell count (`upsellOpportunity = high`)

#### Limits
- **Search box / Sort / Upsell filter are UI-only (PoC: not wired)**. They do not execute.
- Row click navigation to Wallet 360° works.

---

### 2.3 `/providers/[providerId]/wallet/[address]` — Wallet 360°

[WalletPage](../app/providers/%5BproviderId%5D/wallet/%5Baddress%5D/page.tsx) calls
`GET /customers/:address/profile`, passes [`CustomerProfileDto`](../lib/api/types.ts)
to [`WalletScreen`](../components/wallet/WalletScreen.tsx). A dedicated error screen is
shown on 404.

#### IdentityBar (top)
- payer wallet address (full length in mono font) + copy UI
- `customer.label` (currently always `null` in seed, shown as "Payer wallet")
- `customer.role` / `customer.identityBasis`
- `customer.caveat` (`"wallet-address based and do not claim verified human identity"`)
- KPIs: Total spend (atomic) / Activity growth (%) / Free tier progress (% + bar)
- Entry-point ratio: `metrics.entryPointRatio` shown as share of observations linked to
  an attribution candidate

#### ActivityTimeline (left)
- list `profile.timeline[]` in chronological order
- event types `payment` / `provider_usage` / `growth` / `upsell_signal` are color-coded by badge
- each row: timestamp / type / title + description / providerId / txHash / amount (atomic)

#### Right column
1. **UpsellCard** — promotes `metrics.upsellOpportunity` as the headline and lists
   heuristic inputs (`free-tier` / `activity growth` / `entry-point ratio` / `spend atomic`).
   Includes a note that this is **PoC-grade and not production analytics**.
2. **ProviderUsageList** — displays `profile.providers[]` (`providerId` / shortened payTo / tx count /
   last observed time / spend atomic). Sort order is BFF-defined as tx count descending
   then name ascending.
3. **InsightsList** — shows `profile.insights[]` grouped by `severity` (`info` / `opportunity` / `warning`).

#### Limits
- No **windowed aggregation** such as monthly or 7-day windows (BFF only provides cumulative values).
  "Monthly spend" is replaced by "Total spend."
- No concept of "API path" (for example `/v1/price/history`); BFF does not provide endpoint URLs.
- No concept of agent type (`"Claude Code"` / `"Cursor"`, etc.).

---

### 2.4 `/providers/[providerId]/patterns` — Co-usage Patterns

[PatternsPage](../app/providers/%5BproviderId%5D/patterns/page.tsx) calls
`GET /wallet-usage-graph`, converts [`WalletUsageGraphDto`](../lib/api/types.ts) into
a scatter plot in [`PatternsScreen`](../components/patterns/PatternsScreen.tsx).

#### BubbleChart
- each bubble = recipient wallet (provider)
- X-axis: number of unique payer wallets (normalized by maximum)
- Y-axis: average observations per payer (normalized by maximum)
- radius: proportional to payer wallet count
- color: teal toward upper-right ("partnership candidate"), slate toward lower-left
- bubble click navigates to `/providers/[providerId]/customers?co-used=<payTo>` (the query itself is not used by current UI behavior)
- displays `identityFieldsExcluded` at chart top (list of identity-bearing fields excluded by BFF)

#### Limits (not representable by BFF by design)
- ❌ "Workflow clusters" (workflow name + ratio, e.g. hourly trading loop) — no
  observation sequence clustering in BFF.
- ❌ "Retention by agent" — agent type is not present in BFF.
- These items have already been removed from the UI.

---

## 3. Dataset

Current BFF builds projections from prepared fixtures, not an SQLite seed.

- real onchain fact: `apps/bff/fixtures/phase-a/coingecko-transactions.json`
- demo attribution: `apps/bff/fixtures/phase-b/mock-attribution.json`
- customer intelligence read model: `apps/bff/fixtures/phase-b/customer-intelligence/*.json`

Projections are `txHash` joined in `apps/bff/src/data/projection-builder.ts` and
validated with `packages/contracts` validators during module initialization. If fixture
regen is needed, run the CLI live-capture command explicitly.

---

## 4. BFF endpoints and frontend usage

| Endpoint | Frontend usage | Notes |
| --- | --- | --- |
| `GET /health` | unused | connectivity check |
| `GET /wallet-usage-graph` | ✅ Patterns | BubbleChart input |
| `GET /customers` | ✅ Customers | table + summary |
| `GET /customers/:address/profile` | ✅ Wallet 360° | all cards |
| `GET /customers/:address/intelligence` | unused | provided by BFF, not connected to frontend screens |

---

## 5. Types and data consistency

- Frontend UI DTOs are centralized in [`lib/api/types.ts`](../lib/api/types.ts). BFF
  canonical responses are validated with the `packages/contracts` validator before being
  passed to adapters.
- API calls are only through [`lib/api/client.ts`](../lib/api/client.ts). `fetch` is
  fixed to `cache: "no-store"`; only profile 404 returns `null`, all other errors throw.
- Assumes `bun --filter frontend typecheck` / `bun --filter frontend test`.
- No currency conversion; all values remain atomic unit strings and are shown via
  `formatAtomic` (default 6 decimals = USDC-equivalent).
- Only setup-registered `StoredProvider[]` is stored in `localStorage`; BFF data is not stored.

---

## 6. Intentionally not provided

These are explicitly excluded outside the PoC scope, consistent with BFF README.

| Feature | Reason |
| --- | --- |
| Agent-type display / filtering | BFF does not infer agent type / human user |
| API path / endpoint URL display | BFF does not provide endpoint URL as an enrichment source |
| Workflow cluster (hourly loop, etc.) | BFF / CLI does not support observation-sequence clustering |
| Retention by agent | same reason as above |
| Currency conversion (USD display) | BFF returns atomic units only |
| 7-day / monthly window aggregation | BFF returns cumulative values only |
| Search / Sort / Filter active behavior | UI only; BFF has no query parameters |
| Provider-level customer scope split | BFF only aggregates across payer wallets |
| Write operations (ingestion / scoring) | BFF is read-only |

---

## 7. Known caveats

- **TopBar labels like "LIVE" / "Updated 2m ago" / "Last 30d" are placeholders**.
  BFF has no live-status concept.
- **Toolbar Search / Sort / Upsell selectors are PoC: not wired**.
- **Wallet 360° "Free tier progress" is a BFF heuristic** (`spend < 3M atomic`, linear).
  This is not production analytics.
- **The meaning of entry-point ratio is not obvious from UI copy**. It is the ratio of
  observations linked to attribution candidates, not the share of being the first step of
  an hourly loop (BFF heuristic).

---

## 8. Extendability

Short term (possible without changing BFF):
- Show `/summary` on dashboard top screen
- Add explorer links from `txHash` in Wallet 360° sourced from `/observations`
- Connect customer intelligence endpoint to Wallet 360°

Mid term (requires BFF extension):
- 7-day / monthly window metrics
- observation-sequence workflow clustering
- query parameters for `/customers` (`filter` / `sort` / `search`)

Long term (requires BFF scope change):
- Add an agent-type inference source
- Currency conversion integration with a rate provider
