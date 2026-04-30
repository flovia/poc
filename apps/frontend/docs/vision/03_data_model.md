---
name: Data model policy
description: Granularity policy for mock JSON and unresolved items
type: project
---

# Data model policy

> Last updated: 2026-04-28
> Status: policy only, schema finalized in a later step

## ★ Client-side data (localStorage)

All user-entered `pay_to` values are saved to browser `localStorage`; no server-side storage
in PoC (no auth).

### Expected shape

```ts
type StoredProvider = {
  providerId: string;          // internal ID (slug or uuid)
  name: string;                // optional provider name
  mode: 'simple' | 'advanced';
  // simple mode:
  payTo?: string;              // one address
  // advanced mode:
  paths?: Array<{
    apiPath: string;           // e.g. '/v1/generate'
    payTo: string;
  }>;
  createdAt: string;
};

// localStorage key: 'flovia:providers'
type StoredProviders = StoredProvider[];
```

### Operations

- add: from Setup page
- switch: provider selector in sidebar/header
- delete: × button in selector with confirmation dialog
- edit: via Setup page

## ★ Confirmed policy

### Recipient address granularity — support both

Customers (API providers) differ in x402 recipient configuration:

- **Case A**: different `pay_to` addresses per API path
- **Case B**: one `pay_to` address for the entire provider

PoC mocks should represent both cases.

### Identification logic

- **Case A**: reverse-derive API path from unique `pay_to` address
- **Case B**: only provider can be identified from `pay_to`; API path is augmented from
  x402 request resource metadata (URL etc.)

### Data source (production intent)

| Purpose | Source |
|---|---|
| Cross-observation of x402 tx | x402 facilitator public aggregated data |
| Provider identification (`pay_to` → name) | x402bazaar directory |
| API path resolution | (Case A) reverse-lookup by `pay_to`; (Case B) resource metadata |

PoC uses all mock JSON.

## ★ Target entities (draft)

Starting point for next-step detailed design.

| Entity | Main attributes (assumed) |
|---|---|
| Provider | provider_id, name, category, pay_to addresses[], API paths[] |
| Wallet | address, agent_type (Claude Code / Cursor etc.), first_seen_at |
| Payment | tx_hash, wallet, provider_id, api_path, amount_usd, timestamp |
| Co-usage Edge | wallet, provider_a, provider_b, frequency, time_proximity |
| Workflow Pattern | pattern_id, sequence[provider_id, ...], wallet_count |

## ★ Mock data criteria for demo

Implement with protagonist wallet ([09_protagonist_wallet.md](09_protagonist_wallet.md)) as
the center of the demo dataset. Co-used provider names (VectorMind AI / RouteZero DEX /
SignalPort / VaultLayer / StreamDelta / LedgerLake) must be consistent across all docs.

Other supporting wallets (other rows in My Customers, cluster nodes in Patterns) should be
generated in multiple quantities while remaining consistent with the protagonist's world.

## ★ Open items

- API category taxonomy (MECE definition for Storage / Compute / Data / Payment, etc.)
- Time-proximity definition for sessions (within 5 minutes? 1 hour? wallet-level active window?)
- Mock data scale (wallets × providers × tx) for sufficient richness
- Retention window (continue with D14 or use another PoC view)
- Insight card auto-generation logic (fixed strings for PoC or templated generation)
