# Cohort Time Machine web UI prompt

Use the built-in image_gen tool. Do not write an API script.

Generate a polished 16:9 Japanese SaaS web application screenshot mockup, not an infographic.

Page title: 「Cohort Time Machine」
Subtitle: 「中間業者別に、流入後の継続と休眠化を追跡」

Purpose: Retention cohort analysis for Sponge, Dexter, Direct, and Aggregator X.

Layout:
- Left sidebar: Cockpit, Cohorts selected, Partners, Wallets, Retention, Reports
- Header filters: Cohort month, Intermediary, Segment, Metric
- Top cards: Month 1 retention, Month 3 retention, Best cohort, Worst cohort
- Main split:
  - Left Macro panel: 「マクロ分析：コホート継続ヒートマップ」
    - large triangular cohort heatmap with rows by monthly cohort and columns Week 1, Week 2, Month 1, Month 2, Month 3
    - tabs/chips for Sponge, Dexter, Direct
    - line overlay comparing Sponge vs Dexter retention
  - Right Micro panel: 「ミクロ分析：選択コホートのWallet」
    - selected cell: Sponge / Month 2 drop
    - wallet list: active, dormant, high value
    - reasons: price lookup only, no second service, last seen >14d
    - recommended actions
- Bottom: insight cards: 「Dexterは継続品質が高い」, 「Spongeは初期売上は高いがMonth 2で落ちる」

Visual style: high-fidelity SaaS, heatmap-focused, clean typography, blue color scale, amber/red for retention decay, readable Japanese labels.

Save as: tmp/cohort-time-machine-ui.png

If image_gen is unavailable, explain clearly and do not create a placeholder image.
