# Growth Activation Friction Map UI prompt

Use the built-in image_gen tool. Do not write an API script.

Generate a polished 16:9 high-fidelity Japanese/English SaaS web application screenshot mockup, not an infographic.

Target user: Growth Lead / Growth Manager at a US company. Avoid sales/CRM language.

Page title: 「Activation Friction Map」
Subtitle: 「Wallet接続からAha momentまでの摩擦を特定」

Purpose: Identify where users drop before reaching first value, split by Sponge, Dexter, Direct, and Aggregator X.

Layout:
- Left sidebar: Growth, Activation selected, Channel Quality, Retention, Experiments, Insights
- Header filters: Channel, Segment, Funnel step, Error type, Time range
- Top cards: Activation rate, Median TTV, Biggest drop-off, Recoverable wallets
- Main split:
  - Left Macro panel: 「Macro: Activation flow」
    - large horizontal Sankey/funnel: Visit → Connect wallet → Sign request → First paid action → Repeat action
    - colored paths for Sponge, Dexter, Direct
    - red/amber thick drop-off point around Signature Request / First paid action
    - Time-to-Value labels by channel
  - Right Micro panel: 「Micro: Friction details」
    - selected drop-off: Sponge / Sign request failed
    - cards: affected wallets, median delay, repeat probability loss, top error reasons
    - session snippets summarized as product events, not raw logs
    - proposed experiment: simplify signing prompt
- Bottom: Experiment suggestions: 「Reduce signing copy」, 「Add repeat prompt after first paid action」, 「Provider-specific onboarding」

Visual style: modern product growth analytics dashboard, clean flow visualization, white background, blue/teal successful flow, amber/red friction points, readable Japanese/English labels.

Save as: tmp/png/growth-activation-friction-map-ui.png

If image_gen is unavailable, explain clearly and do not create a placeholder image.
