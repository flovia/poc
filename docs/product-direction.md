# Flovia Product Direction

## Summary

Flovia should evolve from a demo / analytics prototype into a **revenue
operations layer for paid APIs and MCP tools**.

The product should not be positioned primarily as a generic onchain analytics
dashboard, protocol implementation, marketplace, or facilitator. Its strongest
wedge is helping paid API / paid MCP providers understand and operate the
business reality behind agentic payments:

> Which API or MCP calls actually got paid, by whom, for which resource, and
> what should the provider do next?

Flovia's product loop is:

```text
Connect → Collect → Reconcile → Understand → Act
```

The most defensible value comes from combining **SDK context** with
**payment-side truth**, reconciling both into a trusted ledger, then helping
providers take auditable pricing, access, and customer actions.

---

## Product Positioning

### One-line positioning

Flovia is the revenue operations layer for paid APIs and MCP tools.

### Expanded positioning

Flovia connects to paid API / paid MCP providers, captures payment and request
activity, reconciles revenue with usage, explains what changed, and helps
operators adjust pricing and access policies.

### What Flovia is

- Revenue ledger for paid API / MCP providers
- Usage intelligence layer
- Payment-request reconciliation system
- Customer and resource intelligence product
- Policy operations layer for pricing, discounts, quota, and access

### What Flovia is not, initially

- Not a payment facilitator
- Not a protocol layer
- Not only a dashboard
- Not a generic marketplace
- Not a generic multi-chain analytics platform
- Not a buyer-side spend management product, at least initially

---

## Initial ICP

The first ideal customer profile is:

> Providers selling APIs, MCP tools, or machine-consumable services through x402,
> MPP, or adjacent agentic payment flows, who need to understand revenue,
> usage, customers, and payment integrity.

Their practical pain is not merely that onchain payments exist. The pain is:

- Payments and API/MCP usage are not reliably connected.
- Wallets, agents, API keys, and customers are hard to attribute.
- Failed payments, unpaid usage, duplicates, and missing events are hard to
  detect.
- Providers cannot easily see which endpoint, tool, wallet, or customer is
  driving revenue.
- Pricing and discount decisions lack trusted usage data.
- Operators do not have a daily answer to: "What happened yesterday, and what
  should we do?"

---

## Core Product Flow

```text
┌─────────┐   ┌─────────┐   ┌────────────┐   ┌────────────┐   ┌──────┐
│ Connect │ → │ Collect │ → │ Reconcile  │ → │ Understand │ → │ Act  │
└─────────┘   └─────────┘   └────────────┘   └────────────┘   └──────┘
```

### 1. Connect

Providers connect Flovia to the systems that define payment and usage context.

Core connections:

- SDK / middleware
- Receiving wallet
- Facilitator
- API endpoint or MCP tool metadata
- Resource configuration
- Pricing configuration

The onboarding path should support two stages:

```text
Wallet-only connection
  → payment visibility, weak attribution

SDK / middleware connection
  → payment + request + resource + customer attribution
```

This lets users get value before full integration while making it clear that the
SDK unlocks the strongest product value.

### 2. Collect

Flovia collects two complementary forms of truth.

#### SDK context layer

SDK data is fast and contextual.

Examples:

- `request_id`
- `resource_id`
- Endpoint or MCP tool name
- Price quoted
- Payer wallet, agent id, API key, or principal
- Payment requirement id
- Status code
- Latency
- Error
- Timestamp

#### Payment truth layer

Onchain and facilitator data is slower but authoritative.

Examples:

- Transaction hash
- Payer wallet
- Recipient wallet
- Amount
- Asset
- Chain
- Block timestamp
- Settlement status
- Facilitator
- Receipt or payment payload reference

### 3. Reconcile

Reconciliation is the product core.

Flovia should match:

```text
payment × request × customer × resource
```

The goal is a trusted ledger that can answer:

- Was this request actually paid?
- Which payment belongs to which request?
- Which customer or wallet generated revenue?
- Which endpoint or MCP tool generated revenue?
- Which events are missing, duplicated, failed, or suspicious?

Useful reconciliation states include:

- `paid_request`
- `unpaid_request`
- `payment_failed`
- `settlement_pending`
- `settled`
- `underpaid`
- `overpaid`
- `duplicate_payment`
- `unmatched_payment`
- `request_without_payment`
- `payment_without_request`
- `refunded`

### 4. Understand

The Web UI should not be a passive BI surface. It should be the operator's daily
workspace.

Core surfaces:

#### Overview

- Revenue
- Paid requests
- Active customers
- New customers
- Failed payments
- Unmatched events
- Revenue change vs previous period

#### Resources

- Endpoint / MCP tool revenue
- Request volume
- Conversion
- Failure rate
- Top customers
- Pricing performance

#### Customers

- Wallet / customer / agent identity
- Total spend
- Recent spend
- Resources used
- Repeat frequency
- Last seen
- Failure history
- Discount or custom plan eligibility

#### Integrity

- Payments without requests
- Requests without payments
- Failed settlements
- Duplicate payments
- Stale data
- Truncated batch results
- Missing SDK attribution

Integrity should be treated as a first-class product surface. A provider must be
able to trust the data before acting on it.

### 5. Act

Act is where Flovia moves from analytics to a revenue control plane.

Understand answers:

> What happened?

Act answers:

> What should we change, and can we apply it safely?

Act should evolve from notifications into recommended and auditable changes to
pricing, access, customer treatment, and policy configuration.

---

## Act Phase Direction

Act may become the highest-value phase because it directly affects revenue,
retention, risk, and access control.

### Maturity stages

#### Stage 0: Notify

Examples:

- Revenue dropped yesterday.
- Payment failures increased.
- A high-volume wallet appeared.
- Unmatched payments were detected.

This is useful but still close to BI.

#### Stage 1: Recommend

Examples:

- Offer a volume discount to a high-usage customer.
- Review pricing for an endpoint with high demand.
- Investigate unpaid usage from a wallet or principal.
- Review a resource with high payment failure rate.

This is where product value becomes more operational.

#### Stage 2: One-click action

Examples:

- Apply a customer-specific discount.
- Change an endpoint price.
- Rate-limit a suspicious principal.
- Grant trial quota.
- Apply stricter prepayment rules.

These actions should require human approval at first.

#### Stage 3: Rules

Examples:

- Apply volume tier automatically after a threshold.
- Degrade access after repeated payment failures.
- Expire trial quota after a period.
- Assign approved customers to lower-friction access paths.

#### Stage 4: Autonomous optimization

Examples:

- Continuous price optimization
- Automated discounting
- Automated access control

This is a later-stage capability and should not be part of the first product
release.

### Action taxonomy

#### Pricing actions

- Endpoint / MCP tool price update
- Customer-specific discount
- Volume tier assignment
- Trial or promo credit
- Minimum payment threshold
- Bundle pricing
- Dynamic pricing recommendation

#### Access actions

- Allowlist / denylist
- Wallet / API key / agent access control
- Rate limit
- Quota
- Degrade mode
- Paid-only feature gate
- Temporary suspension

#### Customer actions

- High-value customer alert
- Churn risk follow-up
- Sales or customer success handoff
- Renewal / upsell signal
- Invoice or CSV export package

#### Integrity actions

- Unmatched payment review
- Unpaid request review
- Duplicate payment refund candidate
- Failed payment retry prompt
- Missing SDK event investigation

#### Experiment actions

- Pricing A/B test
- Endpoint packaging test
- Discount cohort test
- Free-to-paid conversion test

#### Protocol / settlement actions

- Facilitator config change
- Supported chain or currency update
- Settlement destination update
- Payment requirement policy update

### Policy model

To make Act safe and auditable, Flovia should manage policies as data rather
than scattering logic across UI, SDK, and gateway code.

Canonical policy fields:

```text
Policy
- id
- type: pricing | access | discount | quota | settlement
- scope: provider | resource | customer | wallet | agent | api_key
- resource: endpoint or MCP tool
- subject: customer | wallet | agent | segment
- condition: volume | time | chain | payment_status | risk_score
- action: price | discount | allow | deny | rate_limit | quota
- priority
- effective_from
- effective_until
- status: draft | approved | active | expired | rolled_back
- created_by
- approved_by
- source_insight_id
- audit_trail
```

Adapters can then compile policy data into:

- x402 payment requirements
- MPP parameters
- MCP gateway config
- SDK middleware rules
- API gateway rules

### Human-in-the-loop principle

Money and access changes should start with human approval.

Fully automated actions can include:

- Daily brief generation
- Anomaly notification
- Customer segment tagging
- Export or webhook delivery
- Draft policy creation
- Integrity queue assignment

Approval-required actions should include:

- Price changes
- Customer discounts
- Access suspension
- Settlement config changes
- Denylist changes
- High-impact quota or rate-limit changes

Later automation is appropriate only when:

- Reconciliation confidence is high.
- Blast radius is small.
- Rollback is available.
- The policy was pre-approved.
- Impact preview is available.

### Act MVP

The first version should not attempt full automation. It should prove that
Flovia can recommend and prepare safe operational changes.

MVP capabilities:

1. Action cards
   - Offer discount to high-volume customer
   - Review pricing for endpoint or MCP tool
   - Investigate unpaid usage
   - Rate-limit suspicious principal
   - Review failed settlements

2. Exception queue
   - Unmatched payment
   - Unpaid request
   - Failed payment
   - Missing SDK attribution

3. Draft policy generation
   - Discount policy draft
   - Access rule draft
   - Price change draft

4. Manual approval and audit
   - Approve
   - Reject
   - Customize
   - Apply
   - Roll back

5. SDK / gateway config export
   - JSON / YAML policy export
   - API endpoint for SDK policy fetch
   - Automatic push can come later

6. Impact preview
   - What would this policy have changed over the last 30 days?
   - Which customers, wallets, or resources are affected?
   - What is the expected revenue or access impact?

---

## SDK Direction

The SDK is not merely an integration convenience. It is Flovia's proprietary
context source.

Without SDK data, Flovia may know:

```text
wallet paid amount X
```

With SDK data, Flovia can know:

```text
wallet paid amount X for resource Y, via agent Z, request succeeded, latency was
N ms, and this customer has repeated usage this week.
```

The SDK should eventually support two functions:

1. Observability and attribution
   - Emit request events
   - Attach resource, price, customer, and agent context
   - Link request and payment identifiers

2. Policy enforcement
   - Resolve pricing policy
   - Resolve access policy
   - Generate or adapt x402 / MPP payment requirements
   - Apply discounts, quota, and access controls

Initial provider-side shape:

```ts
app.get(
  "/v1/enrich",
  flovia.paidRoute({
    resourceId: "company-enrich",
    pricingPolicy: "default-company-enrich",
  }),
  handler,
);
```

Initial client-side shape:

```ts
const result = await flovia.fetch("https://api.example.com/v1/enrich", {
  budget: "1.00/day",
});
```

The product should not require the SDK to deliver initial value, but the SDK
should clearly unlock full attribution and Act capabilities.

---

## Data and Batch Direction

Daily batch work remains important, but it should be framed as the trust layer,
not the whole product.

```text
SDK events       = fast, contextual, provisional
Onchain data     = slower, authoritative
Daily batch      = reconciliation and completeness layer
Read models      = product-facing views
```

Important batch capabilities:

- Incremental capture
- Watermark management
- Retry handling
- Idempotency
- Truncation detection
- Source freshness metrics
- Completeness reporting
- Reconciliation confidence
- Read model regeneration

The first goal is not perfect completeness. The first goal is knowing when data
may be incomplete and preventing low-confidence data from triggering dangerous
Act recommendations.

---

## Web UI Direction

The Web UI should prioritize operational clarity over visual breadth.

Recommended first surfaces:

1. Overview
2. Resources
3. Customers
4. Integrity
5. Actions

Avoid presenting too many protocol details up front. Terms such as x402, MPP,
facilitator, settlement, and chain should be available where relevant, but the
main product language should remain:

- Paid API
- Paid MCP tool
- Revenue
- Usage
- Customer
- Resource
- Payment
- Receipt
- Policy
- Action

---

## Product Wedge

The strongest wedge is:

> Paid API revenue reconciliation plus customer/resource attribution.

This is more concrete than "agentic payments analytics" and more valuable than a
generic market intelligence dashboard.

Initial promise:

> Know which API and MCP calls actually got paid, by whom, for which resource,
> and what to do next.

---

## What to Cut from the First Product

To avoid diluting the product, defer:

- Generic marketplace
- Full multi-chain coverage
- Full MPP support
- Buyer-side spend management
- Advanced ML customer intelligence
- Fully autonomous pricing optimization
- Enterprise RBAC and compliance
- Perfect identity graph
- Real-time streaming everywhere
- Beautiful but passive dashboards

Keep:

- Provider onboarding
- SDK / middleware event capture
- Receiving wallet / facilitator connection
- Canonical ledger
- Payment-request reconciliation
- Daily brief
- Integrity / exception view
- Customer and resource breakdown
- Action cards
- Draft policies
- Manual approval
- Export / API

---

## 90-Day Direction

### Days 0-30: Trusted ledger with design partners

Goal: make the reconciliation loop work end-to-end with a small number of real
or design-partner providers.

Priorities:

- One primary protocol/chain path
- Provider wallet connection
- Minimal SDK / middleware
- Request event capture
- Payment event capture
- Canonical ledger
- Daily batch
- Reconciliation states
- Daily brief
- Integrity queue

Success condition:

> A provider can trust Flovia to explain yesterday's paid usage and revenue.

### Days 31-60: Operational product

Goal: create a daily workspace.

Priorities:

- Hosted dashboard
- Overview, Resources, Customers, Integrity
- Action cards
- Draft policies
- Manual approval and audit
- Slack / email alerts
- CSV / API export
- SDK install documentation
- Freshness and coverage metrics

Success condition:

> Providers use Flovia instead of block explorers and spreadsheets.

### Days 61-90: Paid beta and controlled Act

Goal: validate willingness to pay and make Act useful without unsafe automation.

Priorities:

- Paid beta with 3-5 design partners
- Impact preview
- Policy versioning
- Rollback
- SDK policy fetch or config export
- Customer retention / cohort insights
- Pricing review workflows
- Second connector only if pulled by demand

Success condition:

> Providers approve Flovia-generated recommendations and begin using policies in
> production-like workflows.

---

## Key Risks

### Market risk

The paid API / paid MCP market may still be too early. If providers do not have
meaningful revenue or operational pain, analytics becomes nice-to-have.

Mitigation:

- Focus on providers with real paid usage.
- Position as revenue operations, not ecosystem analytics.
- Use public ecosystem reports only as lead generation.

### Attribution risk

Incorrect attribution can lead to bad pricing, access, or customer decisions.

Mitigation:

- Show confidence scores.
- Keep integrity visible.
- Require human approval for money/access changes.
- Stop Act recommendations when data integrity is low.

### Automation risk

Automating pricing or access too early can damage customer trust.

Mitigation:

- Draft-first workflow
- Impact preview
- Approval gates
- Rollback
- Expiry dates
- Max price-change limits
- Scoped permissions
- Audit logs

### Fragmentation risk

x402, MPP, paid MCP, Base, Solana, facilitators, and marketplaces may fragment.

Mitigation:

- Keep the user workflow stable.
- Treat protocol and chain support as connectors.
- Do not let connector breadth define the product.

---

## Guiding Principles

1. Start with provider revenue operations, not broad market intelligence.
2. Reconciliation is the core product value.
3. SDK context is the moat; onchain data alone is not enough.
4. Integrity comes before automation.
5. Act should begin as recommendation plus human approval.
6. Policy changes must be auditable, reversible, and scoped.
7. Daily batch is a trust layer, not the product itself.
8. Protocols and chains are connectors; the product workflow should remain stable.
9. Cut demo language from product surfaces: lead with revenue, usage, customers,
   resources, integrity, and actions.
10. The product should help providers answer what happened, why it changed, and
    what to do next.
