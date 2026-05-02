# Feature Adoption Matrix web UI prompt

Use the built-in image_gen tool. Do not write an API script.

Generate a polished 16:9 Japanese SaaS web application screenshot mockup, not an infographic.

Page title: 「Feature Adoption Matrix」
Subtitle: 「Endpoint / Serviceの利用価値と営業材料を可視化」

Purpose: Feature and endpoint adoption analysis tied to wallets, segments, and upsell candidates.

Layout:
- Left sidebar: Cockpit, Adoption Matrix selected, Endpoints, Services, Wallets, Playbooks
- Header filters: Service, Segment, Intermediary, Usage metric
- Top cards: Most valuable endpoint, Underused feature, Power users, Upsell-ready feature
- Main split:
  - Left Macro panel: 「マクロ分析：機能・Endpointの採用状況」
    - periodic-table-like grid of endpoint cards grouped by service category
    - card saturation = usage volume, border = spend, badge = growth/churn
    - labels: pool_search, simple_price, token_price, token_detail, trending_pools
  - Right Micro panel: 「ミクロ分析：選択Endpointの利用Wallet」
    - selected feature: token_detail
    - top wallets using it, source/intermediary, spend, co-used providers
    - suggested sales angle: Service B bundle
- Bottom: roadmap/action cards: 「伸ばす機能」, 「営業材料化」, 「改善候補」

Visual style: modern product analytics UI, clean grid, colorful but restrained, blue/teal/amber, readable Japanese labels, real web app screenshot.

Save as: tmp/feature-adoption-matrix-ui.png

If image_gen is unavailable, explain clearly and do not create a placeholder image.
