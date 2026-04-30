---
name: PoC document index
description: A consolidated set of pre-development assumptions and direction
type: project
---

# Flovia PoC documents

> Last updated: 2026-04-28
> This directory contains assumptions and direction finalized before PoC development.

## ★ Reading order

| # | File | Content |
|---|---|---|
| 0 | [00_overview.md](00_overview.md) | Goals, users, narrative, data assumptions, scope |
| 1 | [01_screens.md](01_screens.md) | Three-screen structure, layout, and demo narrative |
| 2 | [02_visualization.md](02_visualization.md) | Reasons for choosing network / Sankey / bubble visualizations |
| 3 | [03_data_model.md](03_data_model.md) | Data granularity policy and open items |
| 4 | [04_tech_stack.md](04_tech_stack.md) | Tech stack (decided / undecided) |
| 5 | [05_decisions_log.md](05_decisions_log.md) | Decision log (why each choice was made) |
| 6 | [06_design_direction.md](06_design_direction.md) | Design direction (hybrid: Precision Graph + Ambient Mesh) |
| 7 | [07_moodboard_per_screen.md](07_moodboard_per_screen.md) | Per-screen moodboard instructions (for 4 screens) |
| 8 | [08_demo_script.md](08_demo_script.md) | 3-minute demo script (scene-by-scene narration + climax timing) |
| 9 | [09_protagonist_wallet.md](09_protagonist_wallet.md) | Protagonist wallet profile + timeline sample + co-used providers |
| 10 | [10_design_review.md](10_design_review.md) | Design review vs script + additional UI elements + screen priority |

## ★ One-line summary

**A Next.js + Vercel demo dashboard for API providers to visualize whether their customer wallets are co-using other APIs, using x402 public data.**

## ★ Core commitments

- **Narrative**: Co-usage Discovery (primary) + Retention (secondary)
- **Perspective**: analysis of co-usage, not competitors
- **Access model**: fully flat (no auth, public-directory style)
- **pay_to persistence**: browser localStorage (easy switching / deleting)
- **Screens**: Setup / My Customers / Wallet 360° / Co-usage Patterns (4 screens)
- **Visualizations**: Activity Timeline (primary) / Network diagram / Bubble chart
- **Design**: hybrid (UI shell = Precision Graph, hero areas = Ambient Mesh), dark by default
- **Granularity**: provider-level and API-path-level support
- **Stack**: Next.js + pnpm + Vercel + mock JSON + shadcn/ui + Tailwind
- **Demo script**: 3 minutes, CoinGecko/Nansen-style manager audience, climax a (understanding) + b (upsell opportunity)
- **Protagonist wallet**: DeFi automated trading bot (every hour: Price → LLM → DEX → Discord, 7d +184%, Free tier 92%)

## ★ Next steps

1. Detailed data model design (mock JSON schema)
2. Finalize design direction (review three candidate proposals from Codex)
3. Project scaffold (Next.js setup)

Execution order to be discussed separately.

## ★ Related (reference only; not carried forward into this PoC)

- `../research/sync_meeting/` — historical documents. Their content is not migrated.
