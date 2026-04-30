---
name: Design review (alignment with demo script)
description: Re-evaluate existing design and propose fixes for demo-script fit
type: project
---

# Design review (alignment with demo script)

> Last updated: 2026-04-28
> Source: [Codex proposal](/tmp/flovia-codex-review/demo_script.md)
> Purpose: Maximize use of [08_demo_script.md](08_demo_script.md) by re-evaluating existing design (01-07)

## ★ Overall review (Codex)

> The current PoC design is strong. The `Customers → Wallet 360° → Patterns` path already has a natural arc for a 3-minute demo.
>
> To maximize this script, however, we should **strengthen the upper summary and sales-oriented insight language in Wallet 360°, while shifting Setup and Patterns even further into supporting roles**.

---

## ★ Key decision: Wallet 360° hero is Timeline

[01_screens.md](01_screens.md) and [07_moodboard_per_screen.md](07_moodboard_per_screen.md) had been oscillating between "Timeline hero" and "Map hero." We now set it to **Timeline hero fixed**.

### Why

> What we need to sell is not a pretty network shape,
> but the ability to answer:
> 1. **how this API is embedded in customer work** (a)
> 2. **who to sell to and what to sell** (b)
>
> Climax a is achievable **only with Timeline**. The map is reinforcement.

### Ordering (Wallet 360°)

| Priority | Element |
|---|---|
| 1 | Identity bar **business summary** (Monthly spend / 7d growth / Free tier progress) |
| 2 | **Activity Timeline** (hero) |
| 3 | **Upsell insight** card |
| 4 | Co-usage Map (supporting evidence) |
| 5 | Other insight cards |

---

## ★ Five critical UI additions needed

To realize the demo climaxes, these are newly required.

### 1. Free Tier Progress Bar
- Location: Wallet 360° identity bar
- Example: `Free tier: 92%`
- Above 80%, apply subtle emphasis (the relevant segment glows softly)
- **Mandatory for climax b (Scene 6)**

### 2. 7d Volume Sparkline
- Location: right of `7d growth` in identity bar
- A thin sparkline communicates surge faster than text alone
- A number like `+184%` is too weak by itself

### 3. Upsell Opportunity Card
- Location: inside Wallet 360° insight stack
- Not just analytics; include:
  - `Recommended plan` (e.g., `Pro Trading 250M`)
  - `Why now` (rapid surge + free-tier approach)
  - `Projected monthly expansion` (estimated upsell amount)
- **Core for climax b**

### 4. Workflow Summary Strip
- Location: above Activity Timeline
- Example: `Price API → LLM → DEX → Discord`
- Lets viewers understand workflow immediately without reading rows deeply
- Decides speed of comprehension for climax a

### 5. Entry-point Badge
- Location: top of identity bar or top-most insight
- Example: `Your API is step 1 in 87% of observed loops`
- This is the strongest conversion hook for commercial teams

---

## ★ Additional visual support in Activity Timeline

### Workflow Grouping
- Bundle four rows in the same workflow (Price → LLM → DEX → Discord) with a **subtle vertical guide**
- Emphasize only own-provider rows with Teal hairline
- This determines comprehension speed for climax a

### "Your API is the entry point" label
- Short line at top of insight card
- Immediately communicates that our API is the entry point

---

## ★ Removed / muted elements for demo

### Setup
- **Provider Name input** is unnecessary for demo (`pay_to` alone is enough)
- reduce visual weight of **Advanced mode explanation** (presence is okay)

### My Customers
- Reduce excessive filters to `Agent / Sort / Status`
- Position as **"screen that helps you pick the one row to click next"**, not a passive list

### Co-usage Patterns
- **Most supplementary charts** should be light, with Bubble Chart as the primary focus
- Enough to show "it scales to the full cohort" without over-explanation

---

## ★ Re-prioritized screen order by demo script

### `/setup`
1. Registered `pay_to`
2. `Continue to Customers`
3. Add new
4. Advanced mode

→ In demo this is pre-registered, so we optimize for "quick start" over input experience.

### `/providers/[id]/customers`
1. **Hero wallet row**
2. `Status` (Growth Potential, etc.)
3. `Free tier progress`
4. `7d growth`
5. `Co-used with`

→ A screen where the next clickable row is easy and pleasant to find.

### `/providers/[id]/wallet/[addr]` ★ Most important
1. **Identity bar business summary**
2. **Activity Timeline**
3. **Upsell insight**
4. Co-usage Map
5. Other insight

→ Timeline as hero, map as reinforcement, insight to be sales-usable.

### `/providers/[id]/patterns`
1. Bubble Chart
2. High-frequency bot cluster labels
3. One-line common workflows for that cluster
4. Supporting comparison

→ Supporting role, avoid over-explanation.

---

## ★ Documents requiring update

Based on this review, the following docs need updates:

| Document | Required updates |
|---|---|
| [01_screens.md](01_screens.md) | reflect added Wallet 360° UI (Upsell Card / Free Tier Bar / Sparkline / Workflow Strip / Entry-point Badge), confirm Timeline hero |
| [07_moodboard_per_screen.md](07_moodboard_per_screen.md) | update Wallet 360° hero decision to resolved Timeline state |
| [05_decisions_log.md](05_decisions_log.md) | add D14 note: "Wallet 360° hero is Timeline" |
| [03_data_model.md](03_data_model.md) | note that hero wallet mock follows Activity Timeline sample |
