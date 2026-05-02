# ROI Waterfall web UI prompt

Use the built-in image_gen tool. Do not write an API script.

Generate a polished 16:9 Japanese SaaS web application screenshot mockup, not an infographic.

Page title: 「ROI Waterfall」
Subtitle: 「チャネル投資が売上・離脱・アップセルにどう効いたかを見る」

Purpose: Channel ROI analysis for Sponge, Dexter, Direct, campaigns, retention, and upsell.

Layout:
- Left sidebar: Cockpit, ROI Waterfall selected, Partners, Campaigns, Wallets, Forecast
- Header filters: Channel, Campaign, Time range, Scenario
- Top cards: ROI, Spend invested, Revenue recovered, ARR uplift proxy
- Main split:
  - Left Macro panel: 「マクロ分析：投資対効果ウォーターフォール」
    - large waterfall chart: starting budget → Sponge campaign cost → recovered repeat → Dexter upsell → churn loss → net ROI
    - positive bars blue/teal, negative bars red/amber
    - efficiency ratio: $1 in → $3.4 out
  - Right Micro panel: 「ミクロ分析：ROIを作ったWallet」
    - selected bar: Dexter upsell
    - table of wallets/accounts, spend, uplift, action, confidence
    - cost leakage list
- Bottom: investment recommendations: 「Dexterに追加投資」, 「Spongeは再訪施策に限定」, 「Directはbundle trial」

Visual style: executive finance SaaS dashboard, crisp charts, white/light gray, navy text, blue/teal positive, amber/red negative, readable Japanese labels.

Save as: tmp/roi-waterfall-ui.png

If image_gen is unavailable, explain clearly and do not create a placeholder image.
