# Flovia PoC Frontend — Document index

This directory stores both documentation for the current implementation and the initial vision prepared before PoC development.

## Current state

| File | Content |
| --- | --- |
| [current-capabilities.md](current-capabilities.md) | What can be shown in the current implementation, which BFF endpoints each screen calls, and items excluded as out of PoC scope |
| [vision-vs-bff-gap.md](vision-vs-bff-gap.md) | Gap analysis between initial vision (`vision/`) and BFF-provided data, feasible expression range, and recommended next steps |

## Original vision (`vision/`)

Assumptions, scripts, and design direction defined before PoC development. Copied from `~/Documents/MOTHER BASE/Flovia/poc/docs/`.

| # | File | Content |
| --- | --- | --- |
| - | [vision/README.md](vision/README.md) | Original vision index (kept as-is) |
| 0 | [vision/00_overview.md](vision/00_overview.md) | Goals / users / narrative / data assumptions / scope |
| 1 | [vision/01_screens.md](vision/01_screens.md) | Four-screen structure, layout, and demo story |
| 2 | [vision/02_visualization.md](vision/02_visualization.md) | Activity Timeline / network diagram / bubble selection rationale |
| 3 | [vision/03_data_model.md](vision/03_data_model.md) | Data granularity policy and expected entities |
| 4 | [vision/04_tech_stack.md](vision/04_tech_stack.md) | Tech stack (decided / undecided) |
| 5 | [vision/05_decisions_log.md](vision/05_decisions_log.md) | Decision log (D1〜D15) |
| 6 | [vision/06_design_direction.md](vision/06_design_direction.md) | Design direction (Precision Graph + Ambient Mesh hybrid) |
| 7 | [vision/07_moodboard_per_screen.md](vision/07_moodboard_per_screen.md) | Screen-level moodboard guidelines |
| 8 | [vision/08_demo_script.md](vision/08_demo_script.md) | 3-minute demo script (scenes 1〜7, climax a / b) |
| 9 | [vision/09_protagonist_wallet.md](vision/09_protagonist_wallet.md) | Protagonist wallet (DeFi trading bot) profile + Activity Timeline sample |
| 10 | [vision/10_design_review.md](vision/10_design_review.md) | Design review based on the script + 5 critical UI elements |

## Suggested reading order

- **To understand implementation status** → [current-capabilities.md](current-capabilities.md)
- **To understand the original vision vs current reality** → [vision-vs-bff-gap.md](vision-vs-bff-gap.md)
- **To read the original vision fully** → [vision/README.md](vision/README.md) → 00 → 01 → ...
