# Scenario Simulator web UI prompt

Use the built-in image_gen tool. Do not write an API script.

Generate a polished 16:9 Japanese SaaS web application screenshot mockup, not an infographic.

Page title: 「Scenario Simulator」
Subtitle: 「施策を動かした時の売上・継続・アップセル影響を試算」

Purpose: A business planning UI for trying what-if scenarios: Sponge retention lift, Dexter upsell, Direct bundle trial.

Layout:
- Left sidebar: Cockpit, Simulator selected, Partners, Wallets, Playbooks, Forecast
- Header filters: Date range, Scenario, Intermediary, Segment, Confidence
- Top cards: Base ARR proxy, Upside case, ARR at risk, Target wallets
- Main area split:
  - Left Macro panel: 「マクロ分析：施策別の将来インパクト」
    - large fan chart with Base / Best / Worst trajectories
    - stacked scenario impact bars: Sponge再訪施策, Dexterアップセル, Direct bundle trial
    - delta readout: +$42K ARR proxy
  - Right Micro panel: 「ミクロ分析：変数と対象Wallet」
    - slider controls: repeat rate, upsell conversion, churn, average spend
    - wallet count affected by each scenario
    - small table of top affected wallets
- Bottom: recommendation cards: 「Spongeは再訪率+8ppで最大効果」, 「Dexterはアップセル効率が高い」

Visual style: high-fidelity SaaS dashboard, white/light gray, navy text, blue/teal accents, amber risk accents, readable Japanese labels, realistic controls and charts, no people/photos/code.

Save as: tmp/scenario-simulator-ui.png

If image_gen is unavailable, explain clearly and do not create a placeholder image.
