---
name: 3-minute demo script
description: 3-minute narration tracking one hero wallet
type: project
---

# 3-minute demo script

> Last updated: 2026-04-28
> Source: [Codex proposal](/tmp/flovia-codex-review/demo_script.md)
> Goal: Make CoinGecko / Nansen-style Manager stakeholders want to contract with us

## ★ Audience assumptions

- **Target**: Manager-level stakeholders in crypto data API providers (CoinGecko / Nansen assumed)
- **Role**: Business decision makers (PM / Growth), contract decision owners
- **Objective**: Make them feel "this is what we need" and move toward contracting

## ★ Demo climaxes (reduced to 2)

| # | Type | Timing | Purpose |
|---|---|---|---|
| **a** | Insight gain | 1:32–1:48 | Notice that our API is embedded as a workflow entry point |
| **b** | Revenue opportunity discovery | 2:24–2:42 | Instantly answer who / what / why to sell now |

---

## ★ Scene-by-scene script (total 180 sec)

### Scene 1 — Introduction (0:00-0:18)

- **Screen**: Registered `pay_to` list on `/setup` (pre-registered state)
- **Narration**:
  > "Flovia visualizes all wallet behavior using only your x402 pay_to address. Today, as a price-data API provider, we'll show how this single `pay_to` becomes a full view of customer understanding and revenue opportunities."
- **Interaction**: Hover a pre-registered `pay_to` row → immediately transition to My Customers
- **Motion**: thin Teal line on hover, 180ms fade between screens
- **Emotion**: "Onboarding feels light", "can start without heavy integration"

### Scene 2 — Select hero from list (0:18-0:42)

- **Screen**: Customers table at `/providers/[id]/customers`
- **Narration**:
  > "This is the list of wallets using our API. Today we'll inspect this one. It is a DeFi auto-trading bot that has become very active in the last 7 days, and it is also close to the free-tier cap. That means it is both a customer to understand and a high-value opportunity right now."
- **Interaction**: Emphasize hero row (`Status: Growth Potential`, `Free tier 92%`, `7d +184%`) → click
- **Motion**: row hover moves right arrow 4px; click lights left-edge indicator
- **Emotion**: "Not just a list, but a prioritized operation screen"

### Scene 3 — Read summary in identity bar (0:42-1:08)

- **Screen**: Wallet 360° identity bar top summary
- **Narration**:
  > "Opening an individual wallet first shows only the summary needed for business decisions: active period, estimated agent type, spend this month, and free-tier progress. The key point is that this view tells us how commercially tractable this customer is, not just that it is active."
- **Interaction**: Hover `Monthly spend` / `7d growth` / `Free tier progress` from left to right
- **Motion**: values glow brighter in Mono, with subtle blue glow on hover card
- **Emotion**: "This is immediately usable by CS/Growth teams"

### Scene 4 — Activity Timeline (climax a) (1:08-1:48)

- **Screen**: Activity Timeline on Wallet 360° (hero area)
- **Narration**:
  > "This is the core of Flovia. This wallet runs in a consistent pattern every hour. First it calls a price API, then analyzes with an LLM, executes through a DEX aggregator when conditions are met, and finally posts to Discord. So our API is not used in isolation; it is embedded as the entry point in an automated trading workflow. For the first time, it looks like a customer's work, not just logs."
- **Interaction**: Slowly scroll timeline top to bottom → hover own-provider row → point to LLM / DEX / Discord rows in order
- **Motion**: bundle four rows in the same time slot with a subtle vertical guide, own-provider rows get Teal hairline, and related rows get sequential subtle highlights
- **🎯 Climax a (1:32-1:48)**:
  > **The moment where "API usage log" becomes "understanding customer workflow"**

### Scene 5 — Structural reinforcement with co-usage map (1:48-2:14)

- **Screen**: Wallet 360° Co-usage Map + insight cards
- **Narration**:
  > "The map below reinforces that sequence structurally. Price data, LLM, DEX, and notifications are tightly connected. In this wallet, the price API is consistently used as the recurring entry point. Flovia shows not a feeling, but reproducible evidence of where APIs are co-used."
- **Interaction**: Hover lines from center node to LLM / DEX / Discord in order, then open one insight card
- **Motion**: only hovered links increase brightness; others are muted; insight cards fade in 180ms
- **Emotion**: "This is usable for partner strategy and GTM"

### Scene 6 — Upsell insight (climax b) (2:14-2:42)

- **Screen**: Wallet 360° insight cards, especially **Upsell Opportunity Card**
- **Narration**:
  > "This is the revenue opportunity. In the last 7 days this wallet's volume surged, and it is 92% through the free tier. On the workflow path, latency and quota overflow would directly become transaction loss. So for this customer we should propose a 'high-frequency bot plan' with low latency and high quota, not just a generic higher-tier plan. Flovia carries us all the way to deciding who should buy what and why."
- **Interaction**: Hover `Free tier progress` bar → click **Upsell Opportunity** card
- **Motion**: the 92% portion of progress bar softly glows; card shows items like `Suggested next plan: Pro Trading 250M`
- **🎯 Climax b (2:24-2:42)**:
  > **The moment it becomes instantly clear "who to sell to, what to sell, why now"**

### Scene 7 — Close with patterns (2:42-3:00)

- **Screen**: Briefly show Bubble Chart on `/providers/[id]/patterns` to close
- **Narration**:
  > "Finally, this is not only individual-level. Flovia can lift one wallet discovery into population-level patterns. Customer understanding, partner hypotheses, and upsell opportunities are connected on one data foundation. That is how x402 visualization becomes a decision tool tied to revenue, not just observation. That is Flovia."
- **Interaction**: Hover top-right high-frequency cluster and finish
- **Motion**: brief bubble hover only
- **Emotion**: "Not a one-off feature, but a real business product"
