# Desired state of the Flovia PoC

This document redefines the PoC and repository direction based on
`docs/overview.md`, `../poc-frontend/docs/vision`, and the current
`apps/cli` / `packages` / `apps/bff` implementation.

## 1. Re-defining the PoC

Flovia PoC is a market intelligence product for x402 providers to understand
their customers' wallets and surrounding product usage through
**onchain-first observation**.

The PoC is phased as follows.

```text
PoC scope
  Phase A: data foundation
    Build market snapshot / intelligence foundation with apps/cli + packages

  Phase B: demo BFF
    Return demo data / snapshot / projection from BFF
    and validate a partner-driven product experience in frontend

Future scope
  Phase C: SDK telemetry integration
    Collect API request telemetry via provider middleware
    and correlate it with onchain settlement
```

In other words, the current PoC is positioned as validating the product
experience we want to enable after SDK telemetry integration through **Phase A data
foundation + Phase B demo BFF**. SDK telemetry integration itself is a future
extension in Phase C and beyond.

## 2. Desired product shape

### 2.1 Core value

Flovia provides visibility into:

- Which payer wallets are paying the provider's `pay_to` / recipient
- Which other x402-like products, recipients, and provider candidates those payer
  wallets use
- Which settlement patterns, relayers, facilitators, and middlemen are used
- Which wallets carry upsell, partnership, and retention signals based on
  co-usage across the provider and other products
- Confidence-based separation of what can be said from onchain data alone and
  what requires SDK telemetry

### 2.2 Partner demo goal

This PoC is a demo for partner-facing product vision. We received the following
desire from partners.

```text
where the user is coming from, and use case if possible
what endpoints they use and the frequency

why this matters:
  know what source / medium to double down on for GTM or marketing
  know what use case / endpoint is most suitable for x402 / Agents
  improve the API or x402 offerings
```

Therefore, in Phase B demo BFF / frontend, we show the partner's required
decision-making experience using demo data even when endpoint telemetry cannot be
obtained as live data.

| Partner asks for | Representation in Phase B demo | Needed for live data |
| --- | --- | --- |
| where user is coming from | Display `source / medium candidate`, `referrer-like label`, and
`campaign-like label` as demo data | SDK telemetry, provider attribution data,
referrer / campaign metadata |
| use case | Display `workflow / use case candidate` as demo label | request path,
resource, request context, provider-side event |
| endpoints they use | Display `endpoint candidate` and usage frequency as demo
projection | SDK middleware endpoint-level request telemetry |
| frequency | Show payment frequency / wallet activity from data foundation,
and endpoint frequency as demo label | onchain frequency + SDK request
frequency |
| GTM / marketing focus | Show hypotheses for `source / medium × payer quality ×
co-usage` | attribution data and conversion / usage data |
| suitable endpoint / use case for x402 / Agents | Show `endpoint / use case`
ranking as demo insight | endpoint usage, payment conversion, agent/workflow signal |

The key in Phase B is to show a **product answer** for partner needs. At the same
time, because source/medium, endpoint usage, and use-case attribution cannot be
obtained from onchain-only data, the PoC explicitly marks them as `demo label`
or `future SDK telemetry field`.

### 2.3 PoC constraints

The PoC does not attempt to solve everything as live data from day one.

- HTTP telemetry is not a baseline assumption yet.
- BFF does not call live CDP / Bitquery / RPC per request.
- BFF is a read-only product API returning prepared demo data, snapshots, and
  projections.
- endpoint / workflow / agent type / plan / MRR are treated as demo label or
  future SDK field.
- Clearly separate what is certain from onchain-only data and what is inference,
  narrative, or future extension.

### 2.4 Product narrative

The demo narrative should not be generic “API analytics.” It follows this flow:

```text
1. API provider registers their own pay_to
2. Flovia detects payer wallets and settlement activity
3. Selects important wallets from customer wallet list
4. In Wallet 360°, view that wallet payment history and co-usage
5. In Patterns, inspect customer-level product clusters at a glance
6. Provider gains hypotheses for source/medium, use case, endpoint frequency,
   retention, upsell, and partnership
```

We keep the original 4-screen structure.

| Screen | Role | Position in current PoC |
| -------------------| ---------------------------| ---------------------------------------------------------------|
| Setup              | register provider `pay_to` | entry point of demo data; connects to SDK/provider config in
future |
| My Customers       | payer wallet list | displays customer projection returned from BFF demo API |
| Wallet 360°        | wallet-level understanding | prioritizes timeline / co-usage / insight |
| Co-usage Patterns  | market overview | visualizes payer overlap and product candidate clusters |

## 3. Desired shape of BFF

### 3.1 Role

BFF is the **product API boundary** for the frontend demo.

While the current BFF is a minimal HTTP app, the intended responsibilities are:

- a boundary so frontend does not depend directly on `apps/cli` or
  `packages/sources`
- read-only delivery of demo data and generated snapshots/projections
- transformation into shapes required by UI
- adapter boundary to enable switching between live sources and demo sources
- stable API contracts even after future SDK telemetry integration

### 3.2 What BFF does not do

BFF is neither a collector nor a batch job runner.

- Does not call CDP / Bitquery / RPC per user request
- Does not place heavy aggregation or scoring on request path
- Does not import internal implementations from `apps/cli`
- Does not leak source-specific DTOs to frontend directly
- Does not support write operations

### 3.3 BFF data source

For now it returns demo data.

```text
prepared demo dataset
  -> BFF read model / projection
  -> /customers
  -> /customers/:address/profile
  -> /wallet-usage-graph
  -> /patterns
```

In the future, it will be replaced with snapshot generated by CLI,
persisted projection store, and SDK telemetry-based read model.

```text
apps/cli batch output
  -> snapshot / projection store
  -> apps/bff read-only API
  -> frontend
```

## 4. Desired shape of data foundation

The data collection foundation was rebuilt and is now standardized around
`apps/cli` and `packages`. This is the repository baseline.

```text
apps/cli
  -> packages/sources
  -> packages/contracts
  -> packages/intelligence
  -> JSON / Markdown report
```

### 4.1 Package responsibilities

| Package                 | Responsibilities | Non-responsibilities |
| -------------------------| --------------------------------------------------------------------------| ------------------------------------|
| `packages/contracts`    | Zod schema, TypeScript types, normalization helpers, DTO contract | source fetch, ranking, UI shape |
| `packages/sources`      | CDP Discovery, Bitquery, pagination, response parse, normalization to
contract | scoring, ranking, product decision |
| `packages/intelligence` | scope filtering, join, active wallet detection, ranking,
discrepancy, snapshot generation | external API call, HTTP serving |

### 4.2 App responsibilities

| App        | Responsibilities |
| ------------| ------------------------------------------------------------------------------|
| `apps/cli` | batch orchestration, argument handling, source-intelligence wiring,
report output |
| `apps/bff` | read-only product API, delivery of demo data / projections, shape
conversion for frontend |

### 4.3 Dependency direction

Dependency direction is fixed.

```text
apps/cli ─┐
          ├──▶ packages/*
apps/bff ─┘

packages/sources ─────▶ packages/contracts
packages/intelligence ▶ packages/contracts
```

Forbidden imports:

- `packages/*` importing `apps/*`
- `packages/sources` importing `packages/intelligence`
- `packages/intelligence` importing `packages/sources`
- `apps/bff` importing `apps/cli`
- frontend/BFF direct dependency on external source implementations

## 5. Data model rework

### 5.1 Current PoC data layers

```text
source facts
  CDP resource / payment option
  Bitquery payTo aggregate
  future onchain observation

normalized contracts
  network
  asset
  payTo
  aggregate
  market snapshot

intelligence projections
  active resources
  top resources
  top payment options
  discrepancy
  customer wallet projection
  wallet profile projection
  co-usage graph projection

product API shapes
  customers
  wallet 360 profile
  usage graph
  patterns
```

### 5.2 Data added by future SDK telemetry

SDK/middleware integration is in a future layer. New fields are handled separately
from onchain data.

```text
provider_id
api_request_id
request_time
request_host
request_path
resource
agent_type_candidate
workflow_label
response_status
payment_header
settlement_tx_hash
pay_to
payer
```

This enables stronger representation for values currently expressed as demo or
weak inference.

- endpoint attribution
- workflow sequence
- agent type inference
- activation / retention loop
- provider-specific funnel
- plan / monetization context

### 5.3 Phase B data provenance

Phase B product API shapes explicitly carry provenance. In frontend demos, live
data and demo/future fields can appear side-by-side, so BFF responses distinguish
origins per field.

| Provenance | Meaning | Examples | Phase B handling |
| --------------------| -------------------------------------------------------------------------------------------| ---------------------------------------------------------------------------------------------------------| ---------------------------------------------------------------|
| `onchain_fact`     | Values explainable from Phase A source facts / normalized contracts / intelligence projection | `pay_to`, payer wallet, network, asset, payment frequency, active flags, co-usage | Treat as live-data-derived |
| `demo_label`       | Values prepared as fixtures to express decision-making for partner demo | source / medium candidate, referrer-like label, campaign-like label, workflow / use case candidate | Explicitly marked as demo data |
| `future_sdk_field` | Values expected to become live after SDK telemetry integration | endpoint candidate, endpoint usage frequency, request path, workflow sequence, provider-specific funnel | Not live data today |
| `derived_insight`  | Insight / hypothesis built from multiple signals | retention / upsell / partnership insights, GTM double-down hypotheses | Not treated as live data when reasons include demo/future fields |

Phase A dependency for live data:

- CDP resource / payment option
- Bitquery payTo aggregate
- network / asset / `pay_to`
- payer wallet / customer wallet
- payment activity / payment frequency
- active wallet determination
- market snapshot
- customer wallet projection
- wallet profile projection
- co-usage graph projection
- product / resource candidate cluster
- confidence / evidence components based on onchain facts

Values not fully backed by Phase A alone:

- source / medium candidate
- referrer-like label
- campaign-like label
- workflow / use case candidate
- endpoint candidate
- endpoint usage frequency
- endpoint attribution
- workflow sequence
- agent type inference
- provider-specific activation / retention loop interpretation
- provider-specific funnel
- plan / monetization context

Phase B BFF does not call live CDP / Bitquery / RPC on the request path. Live-data
origin values are returned as prepared demo dataset, fixture, or Phase A
snapshot-equivalent read model.

## 6. Desired repository shape

### 6.1 Principles

- contract-first
- separate source adapters and intelligence logic
- CLI focuses on batch orchestration, BFF on read API only
- manage demo data as reproducible fixtures/seeds
- do not commit generated reports, DBs, `.env`, or `dist`
- keep live verification out of standard `verify`
- verify import boundaries via script/linter/ast-grep, not prompts

### 6.2 Recommended structure

```text
docs/
  overview.md
  desired-state.md
  phase-b/
    api-contract.md              # where Phase B BFF contracts live
    demo-data.md                 # where Phase B demo dataset semantics live

packages/
  contracts/
  sources/
  intelligence/

apps/
  cli/
    scripts/analytics/
    tests/
    reports/                     # generated, git ignored

  bff/
    src/
      http.ts
      server.ts
      routes/                    # split as endpoint count grows
      data/                      # demo read model adapter
      projections/               # UI-facing conversion
    tests/
```

### 6.3 BFF expansion order

BFF should be expanded in the following order without overloading implementation:

1. Define required API contracts as `packages/contracts` or `apps/bff` boundary.
2. Prepare fixture-driven demo dataset.
3. Return fixture/projection in BFF routes as read-only.
4. Enable the 4 frontend screens to complete demo flow.
5. Verify CLI snapshots can generate the same projection.
6. If SDK telemetry is added, introduce it as a new source without breaking existing
   projection contracts.

## 7. Re-defining PoC scope

### 7.1 What we do now

- stabilize the market snapshot pipeline in `apps/cli` and `packages`
- add demo data read model to BFF
- return API shapes required by all 4 `apps/frontend` screens
- make Wallet 360° and Co-usage Patterns the demo highlights
- document the separation of onchain-only, demo label, and future SDK fields

### 7.2 What we do not do now

- live CDP / Bitquery / RPC calls on BFF request path
- implementing real SDK middleware
- live estimation of endpoint / workflow / MRR data
- Solana parser
- authentication, billing, and production multi-tenancy for provider dashboard

### 7.3 Future work

- link API requests and settlement transactions via SDK / middleware
- transform generated snapshots into BFF read model
- strengthen onchain observation, catalog join, payer wallet profile
- explicitly surface confidence scoring in UI
- extend to provider-specific customer intelligence

## 8. Success criteria

Success criteria for the PoC are:

- frontend demo explains product value within three minutes
- BFF consistently supports four screens with demo data
- data foundation remains separated into `contracts / sources / intelligence`
- offline `bun run verify` passes
- demo and tests are reproducible regardless of live source availability
- no mixing of onchain-only facts, demo-layer presentation, and SDK telemetry
  requirements

## 9. One-line position

Flovia PoC validates payer-wallet co-usage and x402 market intelligence value by
using a rebuilt CLI/packages data foundation and BFF demo data while planning
toward a provider intelligence product after SDK telemetry integration.
