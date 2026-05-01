# Playbook Builder web UI prompt

Use the built-in image_gen tool. Do not write an API script.

Generate a polished 16:9 Japanese SaaS web application screenshot mockup, not an infographic.

Page title: 「Playbook Builder」
Subtitle: 「分析結果を営業・BD・CSの実行計画に変換」

Purpose: Turn macro signals into micro action playbooks for Sponge, Dexter, Direct and service bundles.

Layout:
- Left sidebar: Cockpit, Playbook Builder selected, Actions, Wallets, Partners, Reports
- Header filters: Persona, Intermediary, Priority, Confidence
- Top cards: Playbooks ready, Target wallets, Estimated ARR proxy, Due this week
- Main split:
  - Left Macro panel: 「マクロ分析：作るべきPlaybook」
    - playbook cards grouped by motion: Retention, Upsell, Cross-sell, Partner
    - examples: Sponge再訪施策, Dexter Service Bアップセル, Provider A×Bクロスセル, Direct bundle trial
    - each card has impact, confidence, target segment
  - Right Micro panel: 「ミクロ分析：対象Walletとメッセージ」
    - selected playbook: Dexter Service Bアップセル
    - wallet table: wallet, source, spend, reason, owner
    - suggested Japanese outreach message
    - buttons: 「営業リストに追加」「CRMに送る」「完了」
- Bottom: execution checklist: audience, message, success metric, owner, due date

Visual style: high-fidelity workflow SaaS UI, CRM + analytics feel, action-oriented, white/light gray, blue/teal/amber, readable Japanese labels, no people/photos/code.

Save as: tmp/playbook-builder-ui.png

If image_gen is unavailable, explain clearly and do not create a placeholder image.
