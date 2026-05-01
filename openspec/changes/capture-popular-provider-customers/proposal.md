## Why

The real provider catalog now exposes high-activity services, but many popular providers only have aggregate counts and no payer-wallet transfer facts, so their Customers views are empty. Capturing payer-wallet facts for selected high-activity providers will make the demo both market-representative and drilldown-ready.

## What Changes

- Add a repeatable workflow to select popular provider payTos from the existing provider catalog / payTo census for transfer capture.
- Prioritize targets by transaction count, unique sender count, resolved service identity, and demo relevance, while keeping CoinGecko in the captured set.
- Run bounded payTo transfer capture for selected popular providers and persist transfer facts into the analytics SQLite store.
- Regenerate BFF analytics fixtures/read models so selected popular providers have `hasCustomerFacts=true` and non-empty Customers views.
- Add checks that report which high-activity providers remain aggregate-only after capture.

## Capabilities

### New Capabilities
- `popular-provider-customer-capture`: Select and capture payer-wallet transfer facts for popular provider payTos so their Customers views can be populated.

### Modified Capabilities
- `analytics-sampling`: Extend sampling expectations to support popularity-targeted provider/payTo selection for demo-ready customer drilldown.
- `analytics-full-capture`: Support a focused refresh path that captures transfer facts for selected popular providers and regenerates read models.

## Impact

- Affected code: CLI analytics sampling/capture scripts, analytics store queries, read-model regeneration docs/tests, and generated BFF fixture refresh workflow.
- Data: local SQLite `transfer_facts` coverage increases for selected popular provider payTos; committed BFF generated fixture can be refreshed from that store.
- External services: live capture requires Bitquery credentials only when running the capture; normal verification remains offline.
- Runtime APIs: no BFF/frontend API shape changes are required; improved data coverage flows through existing provider catalog and Customers endpoints.
