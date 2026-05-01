# Dependency Web web UI prompt

Use the built-in image_gen tool. Do not write an API script.

Generate a polished 16:9 Japanese SaaS web application screenshot mockup, not an infographic.

Page title: 「Dependency Web」
Subtitle: 「中間業者・Wallet・Providerの関係から商機を発見」

Purpose: Network graph showing how intermediaries bring wallets and how wallets co-use providers.

Layout:
- Left sidebar: Cockpit, Dependency Web selected, Partners, Providers, Wallets, Actions
- Header filters: Intermediary, Provider, Segment, Relationship strength
- Top cards: Connected wallets, Shared spend, Strongest bridge, Cross-sell candidates
- Main split:
  - Left Macro panel: 「マクロ分析：エコシステム依存関係」
    - large node-link graph: Sponge, Dexter, Direct → wallet clusters → Provider A/B/C
    - node size = spend, edge thickness = shared usage
    - highlighted bridge: Dexter → high-repeat wallets → Service B
  - Right Micro panel: 「ミクロ分析：選択ノードの詳細」
    - selected node: Sponge
    - representative wallets, co-used services, last seen distribution
    - recommended motion: retention campaign, partner playbook
- Bottom: relationship insights cards: 「強い橋渡し」, 「弱いが伸びる接点」, 「クロスセル余地」

Visual style: high-fidelity web analytics UI, graph-centered, white/light background, blue/teal nodes, amber opportunity edges, clear readable labels.

Save as: tmp/dependency-web-ui.png

If image_gen is unavailable, explain clearly and do not create a placeholder image.
