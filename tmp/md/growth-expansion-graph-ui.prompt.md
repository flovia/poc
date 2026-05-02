# Growth Ecosystem Expansion Graph UI prompt

Use the built-in image_gen tool. Do not write an API script.

Generate a polished 16:9 high-fidelity Japanese/English SaaS web application screenshot mockup, not an infographic.

Target user: Growth Lead / Growth Manager at a US company. Avoid sales/CRM language.

Page title: 「Ecosystem Expansion Graph」
Subtitle: 「単一利用からMulti-provider / Multi-feature利用への拡張経路を可視化」

Purpose: Discover expansion paths from initial wallet usage into adjacent providers/features.

Layout:
- Left sidebar: Growth, Expansion selected, Activation, Retention, Features, Experiments
- Header filters: Starting feature, Channel, Segment, Expansion event, Confidence
- Top cards: Multi-provider adoption, Expansion lift, Golden path share, Adjacent feature opportunity
- Main split:
  - Left Macro panel: 「Macro: Expansion network」
    - large node-link graph with nodes: Northwind Price API, Provider B, Provider C, token_price, token_detail, trending_pools, Sponge, Dexter
    - node size = retained wallets, edge thickness = transition rate
    - highlighted golden path: token_price → token_detail → Provider B
  - Right Micro panel: 「Micro: Path conversion details」
    - selected edge: token_detail → Provider B
    - conversion rate, W4 retention lift, expansion revenue proxy, top segments
    - anonymized wallet examples and first-three-event sequences
    - suggested experiment: bundle prompt after token_detail
- Bottom: Growth hypotheses: 「Provider B prompt after token_detail」, 「Dexter users prefer workflow bundle」

Visual style: premium graph analytics UI, dark navy or light premium dashboard, glowing blue/teal nodes, amber opportunity edges, clear Japanese/English labels.

Save as: tmp/png/growth-expansion-graph-ui.png

If image_gen is unavailable, explain clearly and do not create a placeholder image.
