# Growth Experiment Control UI prompt

Use the built-in image_gen tool. Do not write an API script.

Generate a polished 16:9 high-fidelity Japanese/English SaaS web application screenshot mockup, not an infographic.

Target user: Growth Lead / Growth Manager at a US company. Avoid sales/CRM language.

Page title: 「Growth Experiment Control」
Subtitle: 「Growth leverを仮説・実験・判定・Rolloutまで管理」

Purpose: Convert analytics signals into growth experiments around onboarding, retention nudges, provider prompts, and bundle adoption.

Layout:
- Left sidebar: Growth, Experiments selected, Insights, Activation, Retention, Expansion, Reports
- Header filters: Status, Metric, Channel, Segment, Owner
- Top cards: Running experiments, Expected lift, Shipped wins, Inconclusive tests
- Main split:
  - Left Macro panel: 「Macro: Experiment pipeline」
    - kanban board columns: Backlog, Running, Analyzing, Shipped
    - cards: Sponge W2 retention nudge, Dexter bundle prompt, Direct onboarding copy, Multi-provider education
    - each card shows target metric, expected lift, sample progress
  - Right Micro panel: 「Micro: Experiment readout」
    - selected experiment: Dexter bundle prompt
    - variant A/B chart, probability to beat control, confidence interval, lift by segment
    - success metric: multi-provider adoption, guardrail metric: churn
    - rollout recommendation: ship to 50%
- Bottom: Hypothesis queue: 「Activation」, 「Retention」, 「Expansion」 lanes

Visual style: modern experimentation platform UI, clean lab-like SaaS, white/light gray, blue/teal positive, amber inconclusive, red guardrail warning, readable labels.

Save as: tmp/png/growth-experiment-control-ui.png

If image_gen is unavailable, explain clearly and do not create a placeholder image.
