# Growth Channel Quality Matrix UI prompt

Use the built-in image_gen tool. Do not write an API script.

Generate a polished 16:9 high-fidelity Japanese/English SaaS web application screenshot mockup, not an infographic.

Target user: Growth Lead / Growth Manager at a US company. Avoid sales/CRM language.

Page title: 「Growth Channel Quality Matrix」
Subtitle: 「Acquisition volumeではなく、Retention・Expansionにつながるチャネルを見つける」

Purpose: Compare intermediary/distribution channels such as Sponge, Dexter, Direct, Aggregator X by quality, not just volume.

Layout:
- Left sidebar: Growth, Channel Quality selected, Activation, Retention, Expansion, Experiments, Reports
- Header filters: Date range, Segment, Channel, Success metric, Confidence
- Top cards: Qualified wallets, W2 retention, Multi-provider adoption, Expansion revenue proxy
- Main split:
  - Left Macro panel: 「Macro: Channel quality portfolio」
    - large 2x2 bubble matrix: X = Acquisition volume, Y = Retention quality
    - bubbles: Sponge, Dexter, Direct, Aggregator X
    - bubble size = expansion revenue proxy, color = activation rate
    - quadrant labels: Scale, Fix retention, Niche quality, Deprioritize
  - Right Micro panel: 「Micro: Channel cohort drilldown」
    - selected channel: Dexter
    - mini cohort stats: activation, W2 retention, expansion, feature adoption
    - table: cohort, wallets, first action, retained, expansion signal
    - insight card: 「Dexterは低ボリュームだが継続品質が高い」
- Bottom: Growth lever recommendations: 「Scale Dexter」, 「Improve Sponge W2 retention」, 「Test Direct onboarding prompt」

Visual style: premium product analytics UI, clean US SaaS aesthetic, white/light gray background, navy text, blue/teal primary, amber warnings, crisp charts, readable Japanese labels with English metric names.

Save as: tmp/png/growth-channel-quality-matrix-ui.png

If image_gen is unavailable, explain clearly and do not create a placeholder image.
