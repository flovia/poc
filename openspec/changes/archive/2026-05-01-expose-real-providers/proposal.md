## Why

The frontend currently relies on three hand-written demo providers, while the BFF customer list is not scoped by provider or payTo, so provider switching still shows the same customer data. The analytics pipeline already captures real CDP provider/payment-sink relationships, and promoting that data into BFF/frontend read models will make the demo reflect real provider/payTo activity while keeping deterministic fixture fallback.

## What Changes

- Add a BFF-facing provider catalog read model generated from the existing analytics store payTo census, service candidates, endpoint attribution, and transfer-fact coverage.
- Add a read-only BFF providers endpoint that serves generated real provider/payTo rows without live external calls.
- Add payTo-scoped customer list behavior so customer lists represent payer wallets that paid the selected recipient wallet.
- Update frontend provider loading so generated real providers are preferred, with the current three demo providers retained only as fallback when no generated provider catalog is available.
- Prefer meaningful providers in the UI by ranking/filtering on real activity, resolved service identity, attribution confidence, and customer drilldown availability.

## Capabilities

### New Capabilities
- `real-provider-catalog`: BFF and frontend access to a generated provider catalog derived from analytics store provider/payTo mappings.

### Modified Capabilities
- `analytics-data-store`: Generate and persist provider catalog read models from existing CDP/payment-sink data and transfer-fact coverage.
- `phase-b-demo-bff`: Support provider catalog and payTo-filtered customer list reads from generated projections while preserving fixture fallback.

## Impact

- Affected code: `apps/cli/scripts/analytics/read-models.ts`, analytics store query helpers/tests, `packages/contracts`, `apps/bff/src/data/analytics-source.ts`, `apps/bff/src/http.ts`, BFF route tests, `apps/frontend/lib/api`, frontend provider context/sidebar/setup flows, and customer data-source calls.
- APIs: add `GET /providers`; extend `GET /customers` with an optional `payTo` filter or equivalent provider-scoped access path.
- Data: generated analytics read model gains a provider catalog section; existing generated/raw data remains ignored and regenerated locally.
- Runtime policy: BFF request handling remains offline/read-only and does not call CDP, Bitquery, RPC, SDK collectors, or other live services.
