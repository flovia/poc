# Funnel Engine web UI prompt

Use the built-in image_gen tool. Do not write an API script.

Generate a polished 16:9 Japanese SaaS web application screenshot mockup, not an infographic.

Page title: 「Funnel Engine」
Subtitle: 「流入から継続・アップセルまでの落ちどころを特定」

Purpose: Show wallet conversion and retention funnel by intermediary.

Layout:
- Left sidebar: Cockpit, Funnel selected, Wallets, Partners, Actions, Reports
- Header filters: Intermediary, Segment, Service, Time range
- Top cards: New wallets, First paid usage, Repeat wallets, Upsell candidates
- Main split:
  - Left Macro panel: 「マクロ分析：チャネル別ファネル」
    - large horizontal funnel/Sankey: Acquired → First paid → Repeat → Multi-provider → Upsell
    - colored paths for Sponge, Dexter, Direct
    - red leakage labels at biggest drop-off
  - Right Micro panel: 「ミクロ分析：離脱Walletと理由」
    - selected drop-off: Sponge Repeat step
    - table: Wallet, source, last seen, spend, reason, next action
    - suggested actions: 再訪キャンペーン, bundle trial, onboarding playbook
- Bottom: 「改善インパクト」 cards showing estimated recovered wallets and ARR proxy

Visual style: modern SaaS analytics UI, clear funnel visualization, white background, blue/teal main colors, red/amber leakage warnings, readable Japanese labels.

Save as: tmp/funnel-engine-ui.png

If image_gen is unavailable, explain clearly and do not create a placeholder image.
