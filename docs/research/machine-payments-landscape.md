# Machine payments landscape research note

Generated: 2026-05-12

## Working thesis

Flovia is best framed as a **machine-payment route analytics and discovery
layer** rather than an x402-only dashboard.

The product narrative already points toward joining payment context with API
provider usage context across multiple rails:

```text
source route / directory / MCP client
  -> payment protocol or rail
  -> paid API endpoint / workflow
  -> usage, retention, success, revenue, reliability
```

That makes Flovia adjacent to x402 Bazaar, MPP registries, x402Scout-style
directories, facilitator dashboards, and provider-side payment observability.

## Repository anchors

### Existing positioning

- `docs/worklogs/260506_machine_payment_routes_p0_requirements.md` explicitly
  repositions the product from `x402` analytics to **machine-payment API route /
  rail / workflow analytics**.
- The same note states that Flovia should join payment context and API provider
  usage context, not claim perfect source attribution.
- `docs/showcase/showcase-mpp-flovia-sdk-integration.md` describes BFF-hosted
  showcase paid API routes for Stripe MPP, HitPay MPP, and Solana MPP, wrapped
  by a Flovia SDK-style tracking layer.
- `docs/research/pay-skills-payment-atlas.md` is already a concrete atlas of
  pay-skills providers and observed payment offers.
- `apps/cli/reports/x402-market-summary.md` is already a large x402 market
  snapshot with resources, payment options, active resources, transaction
  counts, and top endpoints.

### Canonical data vocabulary

The repo currently uses two related but distinct protocol vocabularies:

| Layer | Value shape | Meaning |
| --- | --- | --- |
| Catalog/UI protocol | `x402`, `MPP` | Product-facing protocol classification. |
| Runtime analytics protocol | `x402`, `mpp`, `legacy`, `other` | Machine-payment route analytics taxonomy. |
| Rail | `x402`, `stripe_mpp`, `hitpay_mpp`, `mpp`, `other` | Implementation or payment provider rail. |
| Source | `mpp_registry`, pay-skills, demo, live source | Where the provider/route row came from. |
| Visibility/provenance | `public_onchain`, `provider_attested`, `first_party`, etc. | How verifiable the payment/usage evidence is. |

Confirmed code anchors from project exploration:

- `packages/contracts/src/index.ts` defines `PaymentProtocolSchema` as
  `x402 | MPP` and `MachinePaymentProtocolSchema` as
  `x402 | mpp | legacy | other`.
- `packages/contracts/src/index.ts` defines route analytics fields such as
  `rail`, `protocol`, `status`, `provenance`, timestamps, and route IDs.
- `packages/sources/src/mpp-registry.ts` tags registry-derived rows as
  `protocol: "MPP"` even when x402-style `payment-required` data exists.
- `apps/bff/src/showcase/flovia-track-paid-api.ts` tracks showcase paid API
  calls with lower-case `rail: "mpp"` style runtime identifiers.
- `apps/frontend/lib/providers/filter.ts` and related tests normalize protocol
  filtering/display around `x402` and `MPP`.
- `apps/frontend/components/machine-payment-routes/route-sankey.ts` maps route
  analytics rails such as `x402`, `stripe_mpp`, and `hitpay_mpp` into display
  labels.

### Current naming risk

`MPP` and `mpp` are intentionally both present, but they are a canonicalization
hotspot.

Suggested policy:

- Use `MPP` for product-facing protocol names in provider catalog rows, UI
  filters, documentation, and comparison tables.
- Use `mpp` only where the route analytics schema requires lower-case machine
  protocol identifiers.
- Use rail-specific values such as `stripe_mpp`, `hitpay_mpp`, and future
  `tempo_mpp` or `solana_mpp` when settlement/provider implementation matters.
- Do not infer exact settlement semantics from the protocol label alone.

## x402 summary

x402 is an open payment standard for internet-native payments. The v2
specification separates:

1. **Types**: `PaymentRequired`, `PaymentPayload`, `SettlementResponse`,
   `VerifyResponse`.
2. **Logic**: payment schemes such as `exact`, `upto`, and batch settlement,
   with EVM/Solana-specific verification and settlement rules.
3. **Representation**: transports such as HTTP, MCP, A2A, or custom
   request-response systems.

Core flow:

```text
client request
  -> resource server returns payment-required signal + accepts[]
  -> client signs/constructs payment payload
  -> client retries request with payment payload
  -> server/facilitator verifies and settles
  -> server returns resource + settlement response
```

Important x402 actors:

- **Resource server**: API/content/tool server requiring payment.
- **Client**: app, script, browser, or AI agent paying for access.
- **Facilitator**: verifies payment authorization and broadcasts/settles on the
  target network.
- **Bazaar/discovery layer**: catalogs payable resources for developers and AI
  agents.

Important technical facts:

- v2 uses CAIP-2 network identifiers, e.g. `eip155:8453` for Base and Solana
  CAIP-2 identifiers for SVM.
- EVM `exact` uses EIP-3009 / EIP-712-style signed authorization for gasless
  ERC-20 transfers such as USDC.
- Solana `exact` uses SPL token transfer semantics and stricter instruction
  validation.
- Facilitator REST APIs include `/verify`, `/settle`, and `/supported`.
- Discovery APIs include `/discovery/resources` and `/discovery/search`.
- Bazaar supports both `http` resources and `mcp` resources. For MCP tools, the
  unique identifier is effectively `(resource, toolName)` because one MCP
  server endpoint can multiplex multiple tools.
- Bazaar seller metadata can include `serviceName`, `tags`, and `iconUrl` on
  the resource object. Facilitators may soft-drop invalid metadata fields while
  preserving the rest of the listing.
- Bazaar route templates consolidate dynamic paths such as `/users/123` and
  `/users/456` into a catalog key like `/users/:userId`.
- Bazaar extension processing may return an `EXTENSION-RESPONSES` header with a
  base64-encoded JSON status such as `success`, `processing`, or `rejected`.

Sources:

- x402 v2 specification:
  https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md
- x402 Bazaar extension:
  https://docs.x402.org/extensions/bazaar
- CDP Bazaar docs:
  https://docs.cdp.coinbase.com/x402/bazaar
- CDP Bazaar MCP server:
  https://docs.cdp.coinbase.com/api-reference/v2/rest-api/x402-facilitator/bazaar-mcp-server

## MPP summary

MPP most likely means **Machine Payments Protocol** in this project context.

MPP standardizes the HTTP `402 Payment Required` pattern using a formal Payment
HTTP authentication scheme:

```text
GET /resource
  -> 402 Payment Required
     WWW-Authenticate: Payment ...
  -> client pays/signs/completes payment
GET /resource
  Authorization: Payment ...
  -> 200 OK
     Payment-Receipt: ...
```

Key MPP claims from public sources:

- Co-authored by Tempo Labs and Stripe.
- Proposed as an open standard/IETF-track HTTP authentication scheme.
- Payment-method agnostic: Tempo stablecoins, Stripe/cards, Lightning, card
  tokens, and custom methods can fit the same challenge/credential/receipt
  flow.
- Defines `charge` for one-time per-request payments, `session` for
  streaming/high-throughput payment channels, and docs also describe
  `subscription` for recurring access across billing periods.
- Designed to work over HTTP and MCP transports.
- Public docs claim backwards compatibility with x402: x402 `exact` maps to
  MPP `charge`, so MPP clients can consume x402 services.
- Uses consistent payment-related HTTP status behavior: invalid/missing payment
  data typically returns `402` with a fresh challenge, successfully paid access
  returns `200`, and valid payment with policy denial returns `403`.
- For request bodies, `digest` can bind the challenge to the body using the RFC
  9530 Content-Digest format.
- Security requirements include TLS 1.2+, single-use payment proofs, no logging
  of Payment credentials, `Cache-Control: no-store` on challenges, and private
  caching on receipt-bearing responses.

Sources:

- MPP docs: https://mpp.dev/docs
- MPP protocol overview: https://mpp.dev/protocol/
- Cloudflare Agents MPP docs:
  https://developers.cloudflare.com/agents/agentic-payments/mpp/
- Payment HTTP Authentication Scheme: https://paymentauth.org/
- Stripe launch post:
  https://stripe.com/blog/machine-payments-protocol
- Alchemy comparison:
  https://www.alchemy.com/blog/x402-vs-mpp-comparing-agent-payment-protocols

## x402 vs MPP

| Axis | x402 | MPP |
| --- | --- | --- |
| Primary origin | Coinbase / x402 Foundation | Tempo Labs + Stripe |
| Core shape | Payment standard with schemes, facilitators, transports | HTTP Payment authentication scheme + methods/intents |
| Default payment style | Crypto/stablecoin-first, especially USDC | Payment-method agnostic: stablecoin, card, Lightning, custom |
| Main HTTP signal | x402 payment-required/payment payload representation | `WWW-Authenticate: Payment`, `Authorization: Payment`, `Payment-Receipt` |
| Settlement helper | Facilitator is central in common deployments | Method-specific verification/settlement; not necessarily facilitator-centric |
| Discovery | Bazaar and facilitator discovery APIs | Emerging registries/docs; less clear canonical catalog story |
| Agent fit | Strong for paid APIs and MCP tools | Strong for paid APIs, MCP, and high-throughput sessions |
| Flovia fit | Public onchain proof, Bazaar-like discovery, endpoint scoring | Provider-attested/context-rich route analytics, multi-rail support |

Working interpretation for Flovia:

- Treat x402 as a specific protocol/rail with strong public settlement evidence.
- Treat MPP as a broader machine-payment protocol family that can carry Stripe,
  Tempo, Solana, Lightning, and other payment methods.
- Keep analytics model protocol/rail/provider/provenance fields separate so
  Flovia can compare them without flattening away important trust differences.

## Payment HTTP Authentication details

The Payment HTTP Authentication draft is the core MPP-style wire substrate. It
standardizes a challenge/credential/receipt pattern rather than a single payment
rail.

Core headers:

- `WWW-Authenticate: Payment ...` carries the payment challenge.
- `Authorization: Payment <base64url>` carries a base64url-encoded JSON
  credential with no padding.
- `Payment-Receipt: <base64url>` is returned on successful paid responses.
- `Accept-Payment` lets clients express payment capabilities or preferences.

Required challenge parameters:

- `id`: challenge identifier; must be echoed in the credential.
- `realm`: protection space.
- `method`: lowercase payment method identifier such as `card`, `lightning`, or
  `solana`.
- `intent`: payment intent such as `charge`.
- `request`: base64url-encoded, JCS-serialized JSON request object.

Optional challenge parameters include `digest` for RFC 9530 request-body
binding, `expires` as an RFC3339 timestamp, human-readable `description`, and
`opaque` for base64url-encoded server metadata. Unknown params are ignored by
clients, enabling extension without a wire version. Incompatible changes should
use a new scheme name such as `Payment2`.

Credential shape:

```json
{
  "challenge": {
    "id": "...",
    "realm": "...",
    "method": "...",
    "intent": "...",
    "request": "...",
    "expires": "..."
  },
  "source": "did:key:...",
  "payload": {}
}
```

Receipt shape:

```json
{
  "status": "success",
  "method": "...",
  "timestamp": "2026-03-10T21:00:00Z",
  "reference": "..."
}
```

Status behavior:

- Missing payment credential: `402` plus a fresh challenge.
- Malformed credential: `402` with `malformed-credential` problem detail.
- Unknown, expired, or used challenge: `402` with `invalid-challenge`.
- Verification failure: `402` with `verification-failed`.
- Payment verified and access granted: `200` with `Payment-Receipt`.
- Payment verified but access denied by policy: `403` and no challenge.
- If both auth and payment are required, authenticate first: return `401` before
  `402` until non-payment auth succeeds.

Security and caching requirements:

- TLS 1.2+ is required; TLS 1.3 is recommended.
- Payment credentials are bearer secrets and should not be logged in plaintext.
- `402` challenge responses should use `Cache-Control: no-store`.
- Responses containing `Payment-Receipt` should use `Cache-Control: private`.
- Payment proofs are single-use; challenge consumption and resource delivery
  need atomicity/idempotency controls.
- Servers should bind `id` to challenge parameters, commonly via HMAC over
  `realm|method|intent|request|expires|digest|opaque`.

Implication for Flovia: store challenge ID, method, intent, request digest,
expiry, receipt reference, and problem type separately. These are cross-rail
analytics primitives even when payment settlement differs radically by method.

Sources:

- Payment HTTP Authentication Scheme:
  https://paymentauth.org/draft-httpauth-payment-00.txt

## MPP payment method drafts

### Solana charge

The Solana method registers `method="solana"`, `intent="charge"`. It supports
native SOL and SPL token transfers, including Token-2022, and has two credential
modes:

- Pull mode, `type="transaction"`: the client sends signed transaction bytes to
  the server; the server verifies, optionally co-signs as fee payer, broadcasts,
  waits for confirmation, then returns a receipt.
- Push mode, `type="signature"`: the client broadcasts the transaction and
  presents the Solana transaction signature; the server verifies it via RPC.

Important fields:

- Shared request fields: `amount`, `currency`, `recipient`, `description`,
  `externalId`.
- `methodDetails.network`: `mainnet`, `devnet`, or `localnet`.
- SPL token fields: `decimals`, `tokenProgram`.
- Fee sponsorship fields: `feePayer`, `feePayerKey`.
- `splits`: up to eight additional payment legs for platform fees, referrals,
  or revenue sharing.
- `recentBlockhash`: optional performance/freshness hint.

Analytics implications:

- Solana payments have strong public `reference` values: transaction signatures.
- `feePayer` and `splits` should be explicit route fields, not hidden metadata.
- Push-mode signatures are easier to index but weaker for challenge binding if
  identical challenges exist; pull mode gives the server better control.
- Finality is tiered: confirmed is fast and recommended for most payments;
  finalized may be required for high-value routes.

### Lightning charge

The Lightning method registers `method="lightning"`, `intent="charge"`. The
server issues a fresh BOLT11 invoice in the challenge, the client pays it, and
then presents the payment preimage as the credential.

Important fields:

- `amount`: satoshis as a decimal string.
- `currency`: `sat`.
- `methodDetails.invoice`: authoritative BOLT11 invoice.
- `methodDetails.paymentHash`: convenience copy of the invoice payment hash.
- `methodDetails.network`: `mainnet`, `regtest`, or `signet`.
- Credential payload: `preimage`.
- Receipt `reference`: payment hash, not the preimage.

Analytics implications:

- Do not log or persist preimages in analytics; they are bearer secrets.
- The receipt reference should be the payment hash.
- Effective expiry is the earlier of the HTTP challenge `expires` and the BOLT11
  invoice expiry.
- Settlement is final once the preimage is revealed, so failed resource delivery
  after challenge consumption is a real paid-error state worth tracking.

### Card charge

The card method registers `method="card"`, `intent="charge"`. It is PSP-agnostic
and uses encrypted network tokens provisioned by a client enabler and processed
by a server enabler.

Important fields:

- Shared request fields: `amount`, `currency` as lowercase ISO 4217,
  `recipient` as merchant/acquirer identifier, `description`, `externalId`.
- `methodDetails.acceptedNetworks`: e.g. `visa`, `mastercard`, `amex`.
- `methodDetails.merchantName`.
- Encryption material: either embedded `encryptionJwk` or `jwksUri` plus `kid`.
- Optional `billingRequired`.
- Credential payload includes `encryptedPayload` JWE plus display/processing
  metadata such as `network`, PAN last four, expiry, billing address, cardholder
  name, and `paymentAccountReference` when available.

Analytics implications:

- Card `Payment-Receipt.reference` is an authorization/reference ID from the
  server enabler, not final network settlement.
- Challenge ID should be used as idempotency key when forwarding to processors.
- Billing data, cardholder name, and PAR are PII and should not enter route
  analytics except as redacted/derived fields.
- Reversibility differs from Solana/Lightning: card payments can be charged
  back, so Flovia should distinguish authorization, capture, settlement, refund,
  and dispute states if card MPP becomes first-class.

Sources:

- Solana charge draft: https://paymentauth.org/draft-solana-charge-00.txt
- Lightning charge draft: https://paymentauth.org/draft-lightning-charge-00.txt
- Card charge draft: https://paymentauth.org/draft-card-charge-00.txt

## Adjacent protocols and tools

### L402

Lightning-native 402 pattern using Lightning invoices and macaroons. Similar
challenge/retry ergonomics, but tied to the Lightning stack.

- https://github.com/lightninglabs/L402/blob/master/README.md
- https://github.com/lightninglabs/L402/blob/master/protocol-specification.md

### Interledger / Web Monetization

Streaming payment lineage. More relevant for continuous content/payment streams
than simple per-request API payment, but conceptually adjacent to MPP sessions.

- STREAM: https://interledger.github.io/rfcs/0029-stream/
- SPSP: https://interledger.github.io/rfcs/0009-simple-payment-setup-protocol/
- Web Monetization: https://webmonetization.org/specification/

### Stripe402

Card/Stripe-based adaptation of the 402 challenge pattern. Useful as a
comparison point for stateful credit balances and card-minimum constraints.

- https://github.com/stripe402/stripe402

### Cloudflare agentic payments

Cloudflare documents x402 and MPP as first-class HTTP 402 protocols for agents.
This is important because it frames the category as infrastructure for AI agents
discovering, paying for, and consuming resources programmatically.

- https://developers.cloudflare.com/agents/agentic-payments/
- https://developers.cloudflare.com/agents/agentic-payments/mpp/

## Ecosystem entities to track

### Discovery and marketplaces

- x402 Bazaar / CDP Bazaar: canonical x402 discovery and MCP bridge.
- x402Scout: registry, scanner, trust score, MCP endpoint, route optimization.
- the402: x402 marketplace for data APIs, automated services, human work, MCP.
- pay-skills registry: provider catalog already probed by this repo.
- Alchemy agents: public support for both x402 and MPP.

### Trust scoring and scanners

x402Scout positions itself as a registry, scanner, router, proxy, MCP endpoint,
and monetization layer for x402 APIs:

- Claims 710+ indexed services.
- Claims six scan sources and automatic refresh every six hours.
- Exposes trust scores from 0 to 100.
- Offers CLI, REST, streamable-HTTP MCP endpoint, and Bazaar-compatible
  `.well-known/x402-discovery` metadata.
- Claims routing by price, latency, trust score, and facilitator fallback.
- Claims proxy wrapping for existing APIs and Base mainnet on-chain settlement.
- Public pricing examples: `/scan` and `/discover` at `$0.010` USDC,
  `/health/{id}` at `$0.001` USDC, plus a 2% transaction fee with `$0.002`
  minimum for monetization.

ScoutScore's February 2026 report audits the x402 Bazaar ecosystem and provides
a useful quality benchmark:

- 405 unique domains probed on February 10-11, 2026.
- 173 services, or 43%, were protocol compliant.
- 232 services, or 57%, were non-functional for x402 payment discovery.
- Average fidelity score was 40.3/100, graded C-.
- 56% claimed output schemas, but only 40% of those actually delivered schemas.
- Price mismatch appeared on 58% of checked services.
- Wallet mismatch was rare at 1.2%.
- Only 37% were fully verified across contract checks.
- Among compliant endpoints, 84% still used V1 JSON body behavior and 16% used
  V2 `PAYMENT-REQUIRED` header behavior.
- Base dominated network distribution at 84%; Solana appeared at 1%.
- Most listed services were micro-priced: 47% between `$0.001` and `$0.01`.

Trust-scoring implications for Flovia:

- Uptime and payment fidelity must be separate dimensions; an endpoint can be
  online but not payable or schema-consistent.
- Track listing/runtime contract drift for price, wallet, network, schema, and
  protocol version.
- Product opportunity is not just search; it is continuous paid-route QA,
  freshness, conversion failure diagnosis, and trust decay over time.
- Flovia can differentiate from scanners by joining scanner results to provider
  revenue, request success, retention, and workflow analytics.

Sources:

- x402Scout: https://x402scout.com/
- ScoutScore report: https://scoutscore.ai/report

### Facilitators and payment infrastructure

- CDP Facilitator.
- x402 Foundation ecosystem facilitators.
- Semantic Pay and similar x402 facilitator/MCP projects.
- 0xmeta, Nevermined, OpenZeppelin-related facilitator listings, and other
  facilitator entries from the x402 ecosystem directory.

### SDKs and packages

- x402 packages: `@x402/core`, `@x402/fetch`, `@x402/axios`, `@x402/hono`,
  `@x402/next`, `@x402/express`, `@x402/mcp`, `@x402/evm`.
- MPP packages from public docs: `mppx`, `pympp`, Rust `mpp` / `mpp-rs`.
- Solana MPP SDK: `@solana/mpp`, with server/client charge flows, fee
  sponsorship, split payments, and payment links.

### Provider examples already visible in this repo/domain

- AgentMail, StableEmail, StablePhone, StableEnrich, StableSocial, StableTravel,
  StableUpload, StableCrypto.
- QuickNode x402 RPC.
- Zapper public x402 endpoints.
- Google and Alibaba Cloud gateway-402 / pay-skills entries.
- Perplexity/RentCast via PaySponge.
- Purch, SocialIntel, Browserbase, PostalForm, Parallel, and Alchemy as public
  agentic-payment examples from external sources.

## Risk and gap matrix

| Risk/gap | Why it matters for Flovia |
| --- | --- |
| Protocol casing drift | `MPP` vs `mpp` can break filters, joins, and route analytics. |
| Protocol vs rail ambiguity | `MPP` does not imply Stripe, Tempo, Solana, or HitPay by itself. |
| Public vs attested proof mismatch | x402 onchain proof and Stripe/HitPay receipts are different evidence classes. |
| Facilitator dependency | x402 reliability depends on facilitator availability, network support, and settlement behavior. |
| Wallet/key custody | Agent clients need safe spending limits and signing flows. |
| Registry freshness | Discovery products need continuous probing and staleness indicators. |
| Payment/session semantics | Per-request charge, deposit balance, and streaming session should not be collapsed. |
| MCP attribution | MCP clients may multiplex tools; unique identity may require `(server, toolName)` rather than URL alone. |
| Pricing comparability | Atomic token amounts, fiat amounts, sessions, and credits need normalized display. |

## Product opportunities for Flovia

1. **Route analytics across protocols**
   - Compare x402, Stripe MPP, HitPay MPP, Solana MPP, Tempo MPP, and future
     rails under one route analytics model.

2. **Provider-side paid API observability**
   - Show paid requests, completed payments, abandoned challenges, latency,
     retention, and workflow success.

3. **Discovery quality layer**
   - Continuously probe payable endpoints and score freshness, reliability,
     response quality, pricing, and payment compatibility.

4. **Protocol/rail compatibility checker**
   - Given a URL, determine whether it supports x402, MPP, both, or neither;
     decode challenge headers; normalize payment options.

5. **Agent-ready marketplace intelligence**
   - Search paid APIs by task intent, price, trust, latency, provenance, MCP
     tool schema, and supported payment method.

6. **MPP/x402 interop dashboard**
   - Highlight which x402 resources can be consumed by MPP clients and which
     MPP resources expose x402-compatible charge semantics.

## Immediate follow-up research backlog

1. Build an exact code map of every `x402`, `MPP`, `mpp`, `stripe_mpp`, and
   `hitpay_mpp` reference in the repo.
2. Fetch and summarize MPP's IETF draft / Payment HTTP Authentication Scheme
   grammar, especially ABNF headers and security requirements.
3. Build a package matrix for x402 SDKs and MPP SDKs: language, install name,
   server middleware, client wrapper, MCP support, supported networks.
4. Enumerate x402 ecosystem directory entries into categories: facilitator,
   marketplace, MCP server, wallet, SDK, provider, scanner.
5. Compare Bazaar, x402Scout, the402, pay-skills, and Flovia as discovery
   products.
6. Probe representative endpoints from `pay-skills-payment-atlas.md` again and
   measure challenge freshness, headers, response status, and protocol drift.
7. Define a normalization table for route analytics: protocol, rail, method,
   settlement reference, visibility, provenance, payment intent.
8. Investigate Cloudflare's x402/MPP agentic payment APIs for possible provider
   integration or competitor positioning.

## Research round log

- Round 1: repo references for x402, MPP, rail, and protocol vocabulary.
- Round 2: Payment HTTP Authentication and IETF-style MPP substrate.
- Round 3: MPP SDK and payment-method matrix.
- Round 4: x402 SDK, facilitator, and Bazaar matrix.
- Round 5: x402 ecosystem actor classification.
- Round 6: discovery product comparison.
- Round 7: provider registry, pay-skills, and market snapshot reconciliation.
- Round 8: security, custody, and budget-control research.
- Round 9: MCP payment interoperability.
- Round 10: Flovia positioning synthesis.
- Round 11: AP2, ACP, TAP, and adjacent agent protocol research.
- Round 12: Stripe and Tempo MPP method deep dive.
- Round 13: Solana, Lightning, and card MPP method deep dive.
- Round 14: x402Scout and ScoutScore trust-scoring market research.
- Round 15: precise Payment HTTP Authentication summary.
- Round 16: round log and next research question update.
- Round 17: repo schema support for payment/trust fields.
- Round 18: x402 V1/V2 normalization requirements.
- Round 19: `charge` intent normalization.
- Round 20: MPP session/subscription semantics.
- Round 21: MCP paid tool identity and attribution.
- Round 22: competitor positioning matrix.
- Round 23: card/PSP privacy, PII, and redaction rules.
- Round 24: facilitator/provider economics.
- Round 25: final research closure review.

## Next research questions

1. Build a Flovia route analytics field proposal for `method`, `intent`,
   `challengeId`, `receiptReference`, `paymentState`, `settlementState`,
   `expiresAt`, `digestPresent`, and PII-safe receipt metadata.
2. Compare x402 V1 JSON body behavior with V2 header behavior and decide what
   Flovia should parse, normalize, and display.
3. Investigate the `charge` intent draft directly, especially idempotency,
   reversibility, fulfillment timing, and request schema fields shared by card,
   Lightning, and Solana.
4. Map which existing repo schemas already support scanner/trust-score fields
   and which fields require new contracts.
5. Define scanner metrics: protocol compliance, schema honesty, price drift,
   wallet drift, network drift, response shape, latency, and paid success rate.
6. Research privacy posture for card/PAR/billing fields and specify redaction
   rules for analytics ingestion.
7. Deep-dive MCP paid tool identity: URL vs `(server, toolName)` vs schema hash
   vs route template.
8. Research facilitator economics and reliability: fee models, settlement
   latency, supported networks, and outage handling.
9. Compare x402Scout, Bazaar, the402, pay-skills, and Flovia in a positioning
   table using buyer, user, evidence source, and monetization model.
10. Probe local fixtures for fields needed to represent ScoutScore-style trust
    metrics without mixing them with provider-attested usage metrics.

## Round 17: schema support for payment/trust fields

Existing support is partial and split across layers:

- `packages/contracts/src/index.ts` route analytics currently supports route and
  payment-adjacent basics such as route/workflow identifiers, status, and
  `settlementRef`, but it does not yet model MPP challenge/receipt fields such
  as `challengeId`, `receiptReference`, `paymentState`, `settlementState`,
  `expiresAt`, `digestPresent`, or `problemType`.
- `packages/contracts/src/index.ts` provider/resource contracts already include
  `method` and `intent` for provider resources, with current intent values such
  as `charge` and `session`.
- `packages/sources/src/mpp-registry.ts` already parses Payment auth challenges
  and extracts `id`, `method`, `intent`, `expires`, and `request` from
  `WWW-Authenticate: Payment` headers, but those values are not propagated into
  a first-class route analytics contract.
- `apps/bff/src/data/analytics-source.ts` validates and projects analytics rows
  through `RouteAnalyticsEventSchema`, so adding new route fields requires
  contract changes first.
- `apps/bff/src/showcase/flovia-track-paid-api.ts` tracks showcase events with
  status, response status, payment context, and API usage context, but not the
  challenge/receipt or scanner-derived fields above.
- `apps/frontend/components/showcase/ShowcaseProviderScreen.tsx` defensively
  reads `challenge.id` and `receipt.reference` for UI display, proving the data
  shape exists at runtime but is not yet schema-backed as analytics.

Scanner/trust fields are not first-class anywhere yet:

- `trustScore`
- `protocolCompliance`
- `schemaDelivered` or schema honesty
- `priceDrift`
- `walletDrift`
- `networkDrift`
- `responseShape`
- `paidSuccessRate`

Minimal field proposal:

1. Keep **provider-attested usage** on route analytics events:
   - `paymentMethod`: e.g. `card`, `lightning`, `solana`, `stripe`, `tempo`.
   - `paymentIntent`: e.g. `charge`, `session`, `subscription`.
   - `challengeId`: opaque string.
   - `receiptReference`: opaque string; maps to Solana tx signature, Lightning
     payment hash, card authorization ID, Stripe payment intent, etc.
   - `paymentState`: `challenged | authorized | paid | failed | expired | denied`.
   - `settlementState`: `none | pending | confirmed | finalized | settled | disputed | refunded`.
   - `paymentExpiresAt`: RFC3339 timestamp.
   - `digestPresent`: boolean.
   - `paymentProblemType`: problem URI or normalized short code.

2. Keep **scanner-derived trust** in a separate route quality/read-model table or
   contract to avoid mixing runtime revenue facts with external probes:
   - `trustScore`.
   - `protocolCompliant`.
   - `schemaClaimed` / `schemaDelivered`.
   - `priceMatchesListing`, `walletMatchesListing`, `networkMatchesListing`.
   - `responseShapeValid`.
   - `lastProbeAt`, `probeStatus`, `probeLatencyMs`.
   - `paidSuccessRate` only when based on controlled paid probes; otherwise call
     it `providerPaidSuccessRate` or `observedPaidSuccessRate` by provenance.

Round 17 conclusion: the parser already sees enough challenge metadata to start
normalization, but contract boundaries should be updated before implementation.
Provider usage facts and scanner trust facts should remain separate and join by
route/provider identity plus provenance.

## Round 18: x402 V1/V2 normalization

x402 has a migration boundary that matters for route scanners and paid API
normalization.

V1 payment-required behavior:

- HTTP `402` response body carries JSON payment-required data.
- Top-level required fields include `error`, `x402Version`, and `accepts`.
- Each `accepts[]` item uses `maxAmountRequired` for price.
- `resource` is required in each accepted payment option.
- Optional fields include `outputSchema` and `mimeType`.

V2 payment-required behavior:

- HTTP `402` response carries `PAYMENT-REQUIRED` header containing base64
  `PaymentRequired` data.
- Top-level required fields include `resource`, `accepts`, and `x402Version`;
  `error` is optional.
- Each `accepts[]` item uses `amount` instead of `maxAmountRequired`.
- `network` is CAIP-2 formatted, e.g. `eip155:8453`.
- `extensions` can appear in both required payment data and payment payloads.
- Client sends `PAYMENT-SIGNATURE` with base64 `PaymentPayload`.
- Server returns `PAYMENT-RESPONSE` with settlement information.
- Migration docs note header renames from `X-PAYMENT` to `PAYMENT-SIGNATURE`
  and from `X-PAYMENT-RESPONSE` to `PAYMENT-RESPONSE`.

Canonical normalization table:

| Canonical field | x402 V1 source | x402 V2 source |
| --- | --- | --- |
| `protocol` | body `x402Version` | decoded `PAYMENT-REQUIRED.x402Version` |
| `resource` | `accepts[].resource` | top-level `resource` and/or accepted item context |
| `amount` | `accepts[].maxAmountRequired` | `accepts[].amount` |
| `network` | legacy/chain-specific `accepts[].network` | CAIP-2 `accepts[].network` |
| `asset` | `accepts[].asset` | `accepts[].asset` |
| `payTo` / wallet | `accepts[].payTo` | `accepts[].payTo` |
| `mimeType` | `accepts[].mimeType` | accepted item or metadata extension |
| `outputSchema` | `accepts[].outputSchema` | accepted item or extension metadata |
| `paymentPayload` | `X-PAYMENT` / legacy payload | `PAYMENT-SIGNATURE` |
| `paymentResponse` | `X-PAYMENT-RESPONSE` | `PAYMENT-RESPONSE` |

Normalization risks:

- Do not silently coerce V1 `maxAmountRequired` and V2 `amount` without storing
  source version; price drift scanners need version-aware evidence.
- V2 CAIP-2 network IDs should not be flattened into old chain names without a
  lossless raw field.
- Mixed migration states are expected: facilitators may accept v1 clients while
  v2 servers emit headers.
- Bazaar and ScoutScore quality metrics imply scanner parsers must distinguish
  `online`, `protocol-compliant`, `schema-delivered`, and `contract-matched`.

Round 18 conclusion: Flovia should parse both body-based V1 and header-based V2,
then normalize into a versioned intermediate representation with raw evidence,
strict required-field validation, and explicit contract-drift flags.

Sources:

- x402 v1 spec:
  https://raw.githubusercontent.com/coinbase/x402/main/specs/x402-specification-v1.md
- x402 v2 spec:
  https://raw.githubusercontent.com/coinbase/x402/main/specs/x402-specification-v2.md
- x402 HTTP transport v2:
  https://raw.githubusercontent.com/coinbase/x402/main/specs/transports-v2/http.md
- CDP migration guide: https://docs.cdp.coinbase.com/x402/migration-guide

## Round 19: `charge` intent normalization

The `charge` intent is the shared one-time immediate-payment semantic used by
card, Lightning, Solana, and other payment methods under Payment HTTP
Authentication.

Shared request fields:

- Required: `amount`, `currency`.
- Optional: `recipient`, `description`, `externalId`, `methodDetails`.
- `expires` belongs to the `WWW-Authenticate` challenge auth-param, not the
  request JSON object.
- Request JSON is JCS-serialized and base64url-encoded without padding as the
  challenge `request` parameter.

Intent properties:

- Identifier: `charge`.
- Payment timing: immediate, before or with the protected request.
- Idempotency: single-use per challenge.
- Reversibility: method-dependent.
- Access should be atomic: no partial resource access before successful payment
  verification.

Payment proof families:

- Preimage proof, e.g. Lightning.
- Signature proof, e.g. signed authorization or transaction.
- Confirmation proof, e.g. processor confirmation or Stripe-style identifier.
- Ledger proof, e.g. public transaction hash/signature.

Settlement/finality implications:

- Immediate settlement: final once proof verifies, as with Lightning preimages.
- Deferred settlement: signed authorization or transaction still needs network
  confirmation or broadcast.
- Processor settlement: card/PSP/Stripe-style processor handles authorization,
  capture, settlement, and potential disputes.
- Reversibility differs by method, so route analytics must not equate `paid`
  with final revenue.

Round 19 conclusion: `charge` should be the common analytics intent, while
`method`, `paymentState`, `settlementState`, `proofType`, and `receiptReference`
carry the method-specific lifecycle. This lets Flovia compare paid API routes
without erasing card chargebacks, Lightning finality, or Solana confirmations.

Source:

- Charge intent draft: https://paymentauth.org/draft-payment-intent-charge-00.txt

## Round 20: MPP sessions and subscriptions

### Session intent

MPP `session` is the high-frequency counterpart to `charge`.

Tempo session flow:

1. **Open**: client deposits tokens into on-chain escrow, creating a channel
   between payer and payee. The channel is identified by `channelId`.
2. **Consume**: client signs off-chain cumulative vouchers as service is
   consumed. Each voucher says, effectively, "I have now consumed up to X total".
3. **Verify**: server verifies the EIP-712 voucher signature and checks that the
   cumulative amount increased relative to the previous voucher.
4. **Top up**: client can deposit more tokens without closing the channel.
5. **Close**: either party can close. The server settles with the highest voucher
   on-chain and unused deposit is refunded.

Session receipt semantics differ from charge receipts:

- `Payment-Receipt.reference` is the payment channel ID, not a transaction hash.
- The on-chain settlement transaction hash appears only when the channel is
  closed, e.g. `session.close()` returns a receipt with `txHash`.
- Settlement is deferred: request-time payment verification is off-chain and
  CPU-bound, while final settlement occurs at close.

Analytics implications:

- `charge` maps naturally to one payment per protected request.
- `session` maps many usage events and vouchers to one channel and often one
  final settlement transaction.
- Flovia must track both `channelId` and final `txHash` when available.
- States should include `session_opened`, `voucher_verified`, `top_up`,
  `close_started`, `settled`, and `refunded_unused` for session-capable rails.
- For LLM or streaming APIs, revenue attribution should be voucher-delta based,
  not only settlement-transaction based.

Tempo's public positioning frames sessions as "OAuth for money": authorize once,
then make many payments with near-zero request-time latency. It contrasts charge
at roughly 500ms on-chain confirmation with session vouchers verified off-chain
and batched into a single settlement.

### Subscription semantics

Subscription is visible in MPP docs as a recurring access concept, but public
normative detail is less complete than `charge` and `session` in the sources
reviewed. For Flovia, it should be treated as a separate lifecycle rather than a
variant of charge:

- Access may be covered for a billing period without per-request payment.
- Route analytics needs entitlement state and renewal state, not only per-call
  settlement.
- Subscription revenue should be allocated to usage windows with explicit
  allocation rules rather than assumed per-call settlement.

Sources:

- Tempo session MPP docs: https://mpp.dev/payment-methods/tempo/session
- Tempo machine payments: https://docs.tempo.xyz/learn/tempo/machine-payments

## Round 21: paid MCP tool identity and attribution

Bazaar/x402 MCP discovery introduces a different route identity model from HTTP
endpoints.

Confirmed identity rules:

- HTTP resources can be normalized by URL plus `routeTemplate` where available.
- MCP resources need the tuple `(resource, toolName)` because one MCP server URL
  can expose multiple payable tools.
- Bazaar MCP discovery metadata includes `type: "mcp"`, tool/tool-name metadata,
  and an `inputSchema` for MCP arguments.
- Official docs did not surface a required `schemaHash`; schema hashing is useful
  for Flovia drift detection but should be a derived Flovia field, not assumed as
  part of the protocol.

Repo implications observed by subagent research:

- CDP discovery ingestion is still mostly URL-first.
- The BFF read model already peeks into `extensions.bazaar.info.input` and
  related schema fields, but route identity is not yet formalized for MCP.
- Existing URL-based drilldowns should remain backward-compatible.

Recommended identity policy:

| Resource type | Canonical identity | Secondary drift keys |
| --- | --- | --- |
| HTTP route | normalized origin + `routeTemplate` if present, otherwise URL | method, output schema hash, price, network, wallet |
| MCP tool | `resource` + `toolName` | input schema hash, transport, price, network, wallet |
| Workflow | first-party `workflowId` plus route/tool sequence | step IDs, provider IDs, source attribution |

Round 21 conclusion: Flovia should not use URL alone as the universal route key.
For MCP, `(server/resource, toolName)` is the minimum safe identity, and schema
hashes should be used for drift monitoring rather than primary identity.

Source:

- Bazaar extension docs: https://docs.x402.org/extensions/bazaar

## Round 22: competitor positioning matrix

| Product / layer | Primary user | Main job | Evidence source | Monetization | Weakness / opening for Flovia |
| --- | --- | --- | --- | --- | --- |
| x402 Bazaar | API buyers, sellers, agents | Discover x402 HTTP/MCP resources | Facilitator/discovery listings | Listing is free; payment happens at resource | Discovery quality and runtime conversion analytics are limited |
| CDP Facilitator | Sellers using x402 | Verify and settle payments | Facilitator verify/settle APIs, on-chain settlement | 1,000 tx/month free, then `$0.001/tx` | Not provider revenue intelligence; tied to facilitator perspective |
| x402Scout | Agents/developers/providers | Discover, scan, route, proxy x402 APIs | Scanner/catalog/proxy | `/scan` and `/discover` at `$0.010`; 2% proxy fee, min `$0.002` | Strong scanner/router, but less focused on provider-side route revenue and retention |
| ScoutScore | Buyers/scanners | Trust score x402 services | Behavioral, metadata, schema, endpoint health, on-chain signals | Score/fidelity x402-gated at `$0.001/call` | Trust layer, not first-party provider usage/revenue analytics |
| the402 | Agents buying services | Unified marketplace for APIs, tasks, human work, subscriptions, products | Catalog, x402 payment, escrow/job states | Marketplace economics; provider release claims such as 95% payout | Marketplace operator, not neutral analytics across providers/rails |
| MPP directory / ecosystem | Agents/services | Find MPP-compatible services | Directory/docs/provider listings | Ecosystem-dependent | Discovery layer still emerging; analytics opportunity remains |
| Flovia target | API providers / GTM / revenue ops | Understand paid route conversion, revenue, reliability, source, retention across rails | SDK events, provider attestations, scanner probes, receipts | SaaS / analytics / monitoring | Must avoid becoming only a catalog; needs strong correlation/event model |

the402 adds an important competitive pattern: service types are broader than
simple API calls. It distinguishes data APIs, automated services, human services,
subscription plans, and digital products. It also uses async job states,
escrow/release flows, pre-funded balance with `X-BALANCE-AUTH`, and subscription
coverage. Flovia should therefore model protected API access and workflow/job
fulfillment separately.

Sources:

- the402 agents page: https://the402.ai/agents
- x402Scout: https://x402scout.com/
- ScoutScore docs: https://scoutscore.ai/docs

## Round 23: privacy, PII, and redaction rules

Card/PSP-style MPP routes are the highest privacy-risk area.

PCI and card-data facts:

- PCI DSS applies to entities that store, process, or transmit cardholder data
  or sensitive authentication data.
- Sensitive authentication data such as card verification codes must not be
  stored after authorization, even if encrypted.
- CVV/CVC storage is not permitted for card-on-file or recurring transactions.
- Truncated PAN may be out of PCI DSS scope only under specific segmentation and
  non-correlation conditions; systems doing truncation/tokenization can remain in
  scope.

PAR facts:

- Payment Account Reference is a non-financial reference linking tokenized and
  PAN-based transactions to the same underlying account.
- PAR alone is not PCI Account Data according to PCI SSC FAQ, because it cannot
  initiate authorization/capture/settlement and should not be reverse-engineerable
  to PAN.
- However, industry guidance treats PAR as personal data in practice and it can
  create cross-channel account correlation risk.

Flovia redaction policy:

- Never ingest raw `Authorization: Payment` credentials.
- Never ingest payment preimages, card cryptograms, full network tokens, PAN,
  CVV/CVC, PIN data, or raw encrypted card payloads.
- Do not store cardholder name, billing address, or PAR in route analytics.
- If card display is needed, store only redacted display fields such as network
  and last four, with provenance and retention limits.
- Treat wallet addresses and PAR-like stable identifiers as pseudonymous
  identifiers: hash/salt or aggregate where possible.
- Store receipt references only when they are intended as receipts: Solana tx
  signature, Lightning payment hash, card authorization reference, Stripe payment
  intent ID, channel ID.
- Keep scanner data separate from user/payment data to avoid accidentally joining
  behavioral traces into personally identifying profiles.

Sources:

- PCI SSC FAQ on SAD storage after authorization.
- PCI SSC FAQ on CVV storage for recurring/card-on-file.
- PCI SSC FAQ on PAR and PCI Account Data.
- US Payments Forum PAR white paper.

## Round 24: facilitator/provider economics

Known economics and fee signals:

- CDP x402 Facilitator verifies and settles payments so sellers do not need to
  operate blockchain infrastructure.
- CDP Facilitator public pricing: first 1,000 transactions/month free, then
  `$0.001` per transaction. Gas is separate.
- CDP supports Base, Polygon, Arbitrum, World, and Solana in docs reviewed;
  network tables use CAIP-2 identifiers and `exact` scheme support.
- CDP supports EIP-3009 for USDC/EURC and Permit2 for ERC-20s.
- x402Scout proxy monetization claims 2% transaction fee with `$0.002` minimum.
- ScoutScore score/fidelity endpoints cost `$0.001/call`; x402Scout scan/search
  endpoints cost `$0.010/call`.
- the402 claims provider release of 95% for escrowed workflows, implying a 5%
  marketplace take or reserve in that flow.

Analytics implications:

- Gross paid route revenue, facilitator fees, proxy/marketplace take, gas, and
  provider net revenue should be separate fields.
- For low-price endpoints, fixed fees and minimum fees can dominate margins.
- Session rails need amortized settlement-cost accounting across many vouchers.
- A provider dashboard should show free-tier threshold effects and fee leakage by
  rail/provider/facilitator.

Source:

- CDP x402 facilitator docs: https://docs.cdp.coinbase.com/x402/docs/facilitator

## Round 25: research closure verdict

Final reviewer verdict: **research is closed for core Flovia machine-payment
route analytics design/spec**.

Remaining research gaps are conditional, not blocking:

- HitPay-specific MPP evidence fields: needed only if HitPay is first-class in P0
  rather than represented as generic provider-attested MPP.
- MPP subscription lifecycle: needed only if subscriptions are in MVP.
- Card/PSP compliance depth: needed only if Flovia ingests card, PAR, or billing
  fields in production.
- Controlled paid-probe samples: needed only if scanner/trust-score claims are in
  MVP rather than future read model.
- Facilitator SLA and reliability data: needed only if Flovia ranks rails by net
  revenue, fee leakage, or reliability in MVP.

What remains is no longer broad research; it is product/design decision-making:

- First MVP user: provider PM, growth, DevRel, marketplace operator, or
  facilitator.
- First job: route conversion, route QA, revenue reconciliation, retention, or
  GTM source ranking.
- P0 rails: x402-only, x402 + generic MPP, or named rails such as Stripe, HitPay,
  Solana, and Tempo MPP.
- Final taxonomy: `protocol`, `rail`, `method`, `intent`, `provider`,
  `settlementRef`.
- Route identity policy: HTTP template, MCP `(resource, toolName)`, and workflow
  identity.
- Metric formulas and denominators.
- Provenance and field-level evidence display.
- Whether scanner/trust data is MVP or a separate future read model.

Next artifacts should be specs, not more research:

1. Machine-payment route analytics spec.
2. Canonical data dictionary.
3. Event lifecycle state machine.
4. Route identity spec.
5. Metric definitions.
6. Provenance and redaction spec.
7. API/contract proposal.
8. Adapter fixture requirements.

Round 25 conclusion: stop broad research. Move to OpenSpec/product spec. Reopen
research only for explicit expanded scope: subscriptions, card rails, named
HitPay adapter semantics, or scanner/trust-score MVP claims.
