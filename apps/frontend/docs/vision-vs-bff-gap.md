# Initial vision ↔ BFF delivered-data gap analysis

Last updated: 2026-04-29

This document records the gap between the pre-PoC assumptions and script captured in
[`vision/`](vision/) and the data currently provided by BFF (`apps/bff`), and makes
clear what is realistically expressible with the current BFF. The canonical reference
for current functionality is [current-capabilities.md](current-capabilities.md).

Sources:
- [00_overview.md](vision/00_overview.md) — narrative, user, and scope
- [01_screens.md](vision/01_screens.md) — four-screen composition
- [02_visualization.md](vision/02_visualization.md) — three visualizations (Timeline / Network / Bubble)
- [03_data_model.md](vision/03_data_model.md) — target entities
- [08_demo_script.md](vision/08_demo_script.md) — 3-minute demo script
- [09_protagonist_wallet.md](vision/09_protagonist_wallet.md) — protagonist wallet spec
- [10_design_review.md](vision/10_design_review.md) — critical UI five elements

Current state:
- [current-capabilities.md](current-capabilities.md) — implementation status for BFF/frontend
- BFF README: `../poc/apps/bff/README.md`

---

## 1. Reconfirming the initial vision

### 1.1 Narrative
- **Primary**: Co-usage Discovery — "what other APIs are used together by wallets that call your API"
- **Secondary**: Retention — D14 retention rate of paid users
- **Perspective**: not competitor analysis, but **co-usage pattern analysis**

### 1.2 Intended user
**PM / Growth / DevRel** of an API Provider, as a tool for understanding behavior of
their users (= wallets).

### 1.3 Intended entities (from [03_data_model.md](vision/03_data_model.md))

| Entity | Assumed attributes |
| --- | --- |
| Provider | provider_id, name, **category**, pay_to addresses[], **API paths[]** |
| Wallet | address, **agent_type** (Claude Code / Cursor etc.), first_seen_at |
| Payment | tx_hash, wallet, provider_id, **api_path**, **amount_usd**, timestamp |
| Co-usage Edge | wallet, provider_a, provider_b, **frequency**, **time_proximity** |
| Workflow Pattern | pattern_id, **sequence[provider_id, ...]**, wallet_count |

### 1.4 Demo climax (from [08_demo_script.md](vision/08_demo_script.md))

| Climax | Timing | Required information |
| --- | --- | --- |
| **a. Understanding gained** | 1:32-1:48 | Need to see "price API → LLM → DEX → Discord" as an hourly loop in order |
| **b. Upsell opportunity found** | 2:24-2:42 | Need to see package: "Free tier 92% / 7d +184% → Pro Trading 250M" |

### 1.5 Intended protagonist wallet spec ([09_protagonist_wallet.md](vision/09_protagonist_wallet.md))

| Item | Value |
| --- | --- |
| Wallet | `0x7A91...C4E8` |
| Estimated agent type | `Self-hosted DeFi Trading Bot` |
| Monthly spend | `$3,840` |
| 7d growth | `+184%` |
| Free tier progress | `92%` |
| Usage pattern | Every hour around 00-03, Price → LLM → DEX → Discord |
| Activity Timeline | 12 rows (Provider × API path × USD amount) |

---

## 2. What the current BFF provides

| Provided | Details |
| --- | --- |
| ✅ payer wallet | address, observation count, cumulative atomic spend, recipient count involved, last observed time via `/customers` / `/customers/:address/profile` |
| ✅ recipient wallet (= provider candidate) | `providerWallets` and `payerWallets` in `/wallet-usage-graph` |
| ✅ payment observation | `txHash` / `timestamp` / `amountAtomic` in timeline from `/customers/:address/profile` and observations in `/wallet-usage-graph` |
| ✅ demo attribution | provider / service label, confidence, reasons generated from prepared mock attribution fixture |
| ✅ customer intelligence | other service candidates, payTo activity, portfolio / DeFi context, derived insight from `/customers/:address/intelligence` |
| ✅ wallet usage graph | payer wallet × recipient wallet relationships (observations + other-service candidates) |
| ✅ heuristic | freeTierProgress (linear PoC), activityGrowth (first-half / second-half ratio), entryPointRatio (share linked to attribution candidates), upsellOpportunity (low/medium/high) |

**What BFF README explicitly says it does not provide**:

- ❌ infer `tx.from` as `human user / agent_type`
- ❌ endpoint URL / resource URL / referrer / HTTP semantics
- ❌ agent-type inference
- ❌ upsell-related plan names or estimated MRR
- ❌ currency conversion (USD / fiat)
- ❌ write operations like ingestion, scoring, reaggregation

---

## 3. Gap map (by domain element)

Legend: ✅ available / ⚠️ partially approximable / ❌ outside BFF scope

### 3.1 Narrative-facing elements

| Initial vision | Available in BFF | Notes |
| --- | --- | --- |
| Co-usage Discovery (finding "what is co-used") | ✅ | expressible through `/wallet-usage-graph` providerWallets × payerWallets structure. Same payer hitting other recipients = co-usage candidate. |
| **Temporal order** of co-usage patterns ("Price → LLM → DEX → Discord") | ⚠️ | observation `block_timestamp` can be ordered, but grouping into workflows (same cycle vs separate cycles) needs heuristics. BFF does not provide this. |
| Retention (D14 pass rate) | ❌ | cohort analysis from initial paid to D14 is missing in BFF. You can compute from `first_seen_at` / `last_seen_at`, but not yet exposed in UI. |
| Competition ≠ co-usage perspective | ✅ | Structurally, distinct recipients used by the same payer can be read as co-usage relationships. |

### 3.2 By intended entity

| Intended attribute | Available in BFF | Notes |
| --- | --- | --- |
| Provider.name | ✅ | from prepared mock attribution fixture as provider label. Treat as `demo_label`, not real data. |
| Provider.**category** | ⚠️ | approximate as service label. Treat as `demo_label`, not real data. |
| Provider.pay_to addresses[] | ✅ | `pay_to_wallet` |
| Provider.**API paths[]** | ❌ | explicitly not provided by BFF README |
| Wallet.address | ✅ | `payer_wallet` |
| Wallet.**agent_type** | ❌ | explicitly not provided by BFF README |
| Wallet.first_seen_at | ✅ | `first_seen_at` |
| Payment.tx_hash | ✅ | `tx_hash` |
| Payment.wallet | ✅ | `payer_wallet` |
| Payment.provider_id | ✅ | linked to provider candidates via mock attribution projection |
| Payment.**api_path** | ❌ | not provided by BFF |
| Payment.**amount_usd** | ❌ | atomic strings only; conversion is outside BFF scope |
| Payment.timestamp | ✅ | `block_timestamp` |
| Co-usage Edge.frequency | ✅ | can calculate from payer-specific observation arrays in `/wallet-usage-graph` |
| Co-usage Edge.**time_proximity** | ⚠️ | can approximate with differences in `block_timestamp`. Threshold (5 min, 1 hour, etc.) decided on UI side |
| Workflow Pattern.**sequence** | ⚠️ | possible to order consecutive observations per payer. Naming clusters such as "hourly trading loop" is not provided by BFF |
| Workflow Pattern.wallet_count | ⚠️ | computable if sequence clustering is completed |

### 3.3 Wallet 360° "critical UI 5 elements" ([10_design_review.md](vision/10_design_review.md))

| Element | Available in BFF | Notes |
| --- | --- | --- |
| 1. Free Tier Progress Bar | ✅ | `metrics.freeTierProgress` (0..1). BFF heuristic is linear with `spend < 3M atomic`. There is no true plan limit |
| 2. 7d Volume Sparkline | ❌ | Current BFF does not expose windowed aggregation endpoints; requires contract extension to add |
| 3. Upsell Opportunity Card | ⚠️ | `metrics.upsellOpportunity` (low/medium/high) exists, but **plan names such as `Pro Trading 250M` or `Projected $890 MRR` are not provided**. Use a generic card that shows heuristic inputs instead |
| 4. Workflow Summary Strip ("Price → LLM → DEX → Discord") | ⚠️ | provider name ordering can be built from observation order, but **naming a repeated pattern like an hourly loop requires heuristics** |
| 5. Entry-point Badge ("step 1 in 87% of observed loops") | ❌ | BFF does not provide "share of hourly loops starting from this API". `metrics.entryPointRatio` has different meaning: ratio of observations linked to attribution candidates, so cannot be substituted directly |

### 3.4 Each scene in the demo script

| Scene | Content | Feasible? | Alternative |
| --- | --- | --- | --- |
| 1. Intro (`/setup`) | Start from existing pay_to | ✅ | Works with 3 seeded localStorage entries |
| 2. Choose protagonist from My Customers | "24h DeFi bot, 7d +184%, Free tier 92%" | ⚠️ | `/customers` can provide 5 payer rows. "DeFi bot" label is not available (no agent type). "7d +184%" can be replaced by `activityGrowth` (a half-to-half ratio). Free tier 92% can be shown with `freeTierProgress`. |
| 3. Identity bar summary | Monthly spend / 7d growth / Free tier / Entry-point Badge | ⚠️ | Replace monthly spend with cumulative spend. Entry-point badge requires copy change |
| 4. Activity Timeline (climax a) | Show "Price → LLM → DEX → Discord" as an hourly loop | ⚠️ | It is possible to show observation sequence in chronological list. Grouping by hourly loop requires workflow detection heuristics (currently not in frontend). |
| 5. Co-usage Map for structural reinforcement | provider center and co-usage network around it | ⚠️ | The payer × recipient structure in `/wallet-usage-graph` gives structure. **Original Force-directed Network is not implemented** (Patterns currently shows BubbleChart only) |
| 6. Upsell insight (climax b) | "Pro Trading 250M / $890 MRR / Why now 3 lines" | ❌ | **Plan names and MRR estimates are not provided**. Keep to heuristic inputs (free-tier / growth / entry-point ratio) |
| 7. Patterns for full picture | Bubble Chart with upper-right = partnership priority | ✅ | `/wallet-usage-graph` is already transformed into a scatter plot. Vocabulary like "partnership priority" is UI-owned |

### 3.5 Intended visualizations ([02_visualization.md](vision/02_visualization.md))

| Visualization | Placement | Original claim | Available in BFF |
| --- | --- | --- | --- |
| Activity Timeline | Screen 2, protagonist | "which order, when, and which APIs" | ⚠️ Provider and timestamp can be shown, **but API path is not available**. Workflow structuring also not available |
| Force-directed Network | Screen 2 auxiliary | ecosystem structure | ⚠️ Data exists but **not implemented** (currently BubbleChart only) |
| Bubble Chart | Screen 3 main | strategic importance (X=co-usage frequency / Y=retention) | ⚠️ X-axis (unique payer count) is available, **Y-axis retention is not provided**. Currently replaced with average observations per payer |
| Workflow Clusters | Screen 3 secondary | "Cluster 1: Image gen → Storage → Notify (52%)" | ❌ no clustering in BFF / CLI |
| Retention by Agent | Screen 3 secondary | "Claude Code 86%, Cursor 59%, curl 14%" | ❌ agent type is missing |

---

## 4. What still works with BFF alone in the initial vision

Based on this analysis, we can restate the range that can be represented naturally using
only data BFF can currently provide.

### 4.1 Story that can be represented directly

> There are **clusters of payer wallets** paying to your `pay_to`. The same wallets are
> also paying other `pay_to` addresses, so those APIs are being used together.

This is fully possible with only `/customers` + `/customers/:address/profile` + `/wallet-usage-graph`.
Because we have `payer wallet × recipient wallet × observation`, the core narrative of
**discovering co-usage** works.

### 4.2 Screen behavior that can be represented directly (reworked)

#### Setup (unchanged)
- Can start from already registered `pay_to`
- Multiple provider switching via localStorage

#### My Customers
- payer wallet list
- cumulative spend (atomic), observation count, recipient count involved (= number of co-used provider wallets), last observed, activity half-split (`activityGrowth`), upsell score
- emphasize wallet with `upsellOpportunity = high` as "the next one to click"

#### Wallet 360°
- Identity bar: address / role / identity caveat / cumulative spend / `activityGrowth` / `freeTierProgress`
- Activity Timeline: show observations in chronological order (**no API path**, provider name + amount_atomic + timestamp + txHash only)
- Provider Usage List (new): list of recipient wallets this payer paid, with tx count and last observation
- Insights: show `insights[]` returned by BFF as-is

#### Co-usage Patterns
- BubbleChart: per recipient wallet scatter plot of "unique payer count × average observations per payer"
- upper-right means "recipient wallets with many unique payers and deeper repeated use"

### 4.3 What can be realized with BFF + UI heuristics

| Initial vision | Additional UI-side work |
| --- | --- |
| 7d Volume Sparkline | Not possible from current BFF alone. Add 7d / 30d window metrics to BFF DTOs first, then render bar/line |
| Workflow Summary Strip (provider sequence) | sort same payer observations by `block_timestamp`, group by `time_proximity` threshold (e.g., 5 min), do not assign cycle names; display provider sequence only |
| Lightweight Co-usage Network diagram | extract payer-recipient edges from `/wallet-usage-graph` and render force-directed. To keep the original sense of "center = own API / peripheral = co-used partners," use focused wallet as center node |
| Lightweight retention metric | calculate whether each payer has `last_seen_at - first_seen_at >= 14 days`; keep this as payer-level aggregate, not by agent |
| Lightweight Workflow Cluster | hash sequence strings from grouped cycles above and aggregate frequent patterns; do not force human-readable names, show only arrays |

### 4.4 What is replaced with an alternative meaning

| Original meaning | BFF heuristic replacement |
| --- | --- |
| Free tier 92% (actual plan limit) | `freeTierProgress` (linear PoC heuristic with 3M atomic cap) |
| 7d growth +184% | `activityGrowth` (observed half-to-half ratio) |
| Entry-point Badge "step 1 in 87% of loops" | `entryPointRatio` (share of observations linked to attribution candidates). **Copy must be rewritten since meaning differs** |
| Upsell "Pro Trading 250M" | `upsellOpportunity` (low/medium/high) plus heuristic input summary. **Do not include plan names or MRR estimates** |

### 4.5 What cannot be represented as initially envisioned

These are explicitly outside what BFF README says it provides; we must either drop them
or expand BFF scope (which changes PoC scope).

| Dropped element | Affected screens / UI |
| --- | --- |
| Agent type (Claude Code / Cursor / curl, etc.) | Agent column in My Customers, Retention by Agent in Patterns, "Self-hosted Trading Bot" on Wallet 360° |
| API path (`/v1/price/history`, etc.) | path column per Activity Timeline row, "Used Endpoints" column in My Customers |
| Currency conversion (USD display) | all screens displaying values like "$1,240", "$3,840" |
| Specific workflow names ("Hourly trading loop") | Workflow Clusters section in Patterns, "every-hour loop" phrasing in Wallet 360° Workflow Summary Strip |
| Plan names / MRR estimates | plan and MRR parts inside Upsell Opportunity Card |
| Climax Scene 4 / Scene 6 text in demo script | Without paths, the line "Payment logs become workflow understanding" is weaker; without plan names, "who to sell what and why now" is weaker |

---

## 5. Reframing the PoC narrative

The initial "**Co-usage Discovery + Retention**" narrative can be reframed within current
BFF capability as:

> **"There is a set of payer wallets paying to your `pay_to`, and we can show which
> other `pay_to` addresses they also pay.**
> **From those co-usage relationships, surface wallets that deserve attention**
> (**high spend / many providers / rising recent activity / heuristic upsell candidate**).

In this reframing:

- **Strong**: structure `payer wallet × recipient wallet × observation` is complete
- **Weak**: we cannot say **which APIs** were called, **which agent** is calling, or **roughly how much USD value**

So we can say **"who is co-used with whom"**, but cannot say **"what they call"** or
**"in what workflow"**. The original core intent of **"visualizing an agent's full
workflow"** is not achievable with BFF alone.

---

## 6. Recommended next steps

### Short term (UI improvements without changing BFF)

1. Add a **Force-directed Network diagram** to Patterns (currently scatter plot only)
2. Generate Wallet 360° **Workflow Summary Strip** automatically from timeline
   `time_proximity` (do not assign cycle names; show provider sequence only)
3. Connect **customer intelligence endpoint** to frontend to add other service candidates
   and portfolio context to Wallet 360°

These can be done with currently published BFF endpoints and refine the
**reframed narrative**.

### Mid term (requires BFF extension / PoC scope decision)

5. Add **Workflow Cluster detection** in BFF or CLI: group consecutive observations by
   `time_proximity` per payer and aggregate frequent patterns. Do not auto-name clusters.
6. Add **windowed metrics** (last 7d / 30d) to BFF DTOs, extending from cumulative values.
7. Add `provider category` as explicit field in contract/projection.

### Long term (PoC scope change)

8. Add **agent-type inference source** (HTTP UA / SDK usage patterns, etc.)
   — this is listed in BFF README as waiting for future enrichment sources.
9. Add **API path / endpoint URL ingestion** — same reason as above.
10. Add **currency conversion** (integration with a rate provider)

---

## 7. Conclusion

The original 3-minute demo script cannot be reproduced exactly with the current BFF.
In particular, climax a ("workflow becomes visible from API paths") and climax b
("upsell with explicit plan and MRR") depend on data not provided by BFF by design.

However, the **core of the original vision** (="visualizing co-usage of API with API per payer wallet")
does hold with BFF alone. We already have all three needed elements: payer, recipient,
and observation.

The current poc-frontend is already implemented in line with the **reframed narrative**
([current-capabilities.md](current-capabilities.md) reference). The next step is to implement
the **short-term items in §6** so the experience gets as close as possible to the
initial vision without changing BFF.
