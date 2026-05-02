# Market Map web UI prompt

Use the built-in image_gen tool. Do not write an API script.

Generate a polished 16:9 Japanese SaaS web application screenshot mockup, not an infographic.

Page title: 「Market Map」
Subtitle: 「Walletセグメント別に、どの市場を取りに行くか決める」

Purpose: Market segmentation map for trading bots, research agents, execution wallets, one-off users, and intermediary distribution.

Layout:
- Left sidebar: Cockpit, Market Map selected, Segments, Partners, Wallets, Playbooks
- Header filters: Segment, Intermediary, Service, Growth
- Top cards: Largest segment, Fastest growing, Highest spend, Highest churn risk
- Main split:
  - Left Macro panel: 「マクロ分析：市場セグメント配置」
    - 2D bubble map: Spend potential vs Repeat quality
    - bubbles: Trading bots, Research agents, Execution wallets, One-off users
    - internal colors showing Sponge, Dexter, Direct mix
    - arrows showing growth direction
  - Right Micro panel: 「ミクロ分析：選択市場の代表Wallet」
    - selected segment: Trading bots
    - top wallets, intermediary, spend, service usage, next action
    - service bundle recommendation
- Bottom: go-to-market recommendations: 「Trading botsにcommitted tier」, 「Research agentsにbundle discount」

Visual style: strategy analytics web UI, polished, spacious, executive but practical, white background, blue/teal bubbles, amber risk labels, readable Japanese.

Save as: tmp/market-map-ui.png

If image_gen is unavailable, explain clearly and do not create a placeholder image.
