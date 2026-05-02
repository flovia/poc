# Growth Wallet Retention Engine UI prompt

Use the built-in image_gen tool. Do not write an API script.

Generate a polished 16:9 high-fidelity Japanese/English SaaS web application screenshot mockup, not an infographic.

Target user: Growth Lead / Growth Manager at a US company. Avoid sales/CRM language.

Page title: 「Wallet Retention Engine」
Subtitle: 「チャネル・初期行動・Feature adoption別に継続率を見る」

Purpose: Cohort retention engine for wallet users by channel, segment, and first successful behavior.

Layout:
- Left sidebar: Growth, Retention selected, Activation, Channel Quality, Expansion, Experiments
- Header filters: Channel, First action, Feature adopted, Segment, Cohort week
- Top cards: W1 retention, W4 retention, Best retaining channel, At-risk cohort
- Main split:
  - Left Macro panel: 「Macro: Retention cohort heatmap」
    - large triangular cohort heatmap by acquisition week and retention week
    - tabs for Sponge, Dexter, Direct, All channels
    - overlay toggles: Used Provider B, Multi-provider, First paid within 24h
    - comparison mini line: Dexter vs Sponge vs Direct
  - Right Micro panel: 「Micro: Cohort behavior breakdown」
    - selected cell: Sponge / Week 3 decay
    - behavior differences: no second provider, no repeat prompt, price lookup only
    - cohort wallet sample list with anonymized wallets and segments
    - recommended growth lever: W2 retention nudge
- Bottom: Retention insights: 「Dexter users retain 2.1x better」, 「Multi-provider adoption predicts W4 retention」

Visual style: clean data-dense cohort analytics UI, blue heatmap scale, amber/red decay flags, crisp grid, readable Japanese labels and English metrics.

Save as: tmp/png/growth-retention-engine-ui.png

If image_gen is unavailable, explain clearly and do not create a placeholder image.
