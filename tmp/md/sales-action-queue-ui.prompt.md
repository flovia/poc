# Sales Action Queue UI prompt

Use the built-in image_gen tool. Do not write an API script.

Generate a polished 16:9 Japanese SaaS dashboard screenshot mockup.

Theme: Sales / BD / CS action queue. Analytics translated into who to contact today and why.

Page title: 「Revenue Action Queue」
Subtitle: 「今日動くべきWalletと提案理由」

Layout:
- Left sidebar: Cockpit, Action Queue selected, Wallets, Partners, Playbooks, Reports
- Header filters: owner, priority, intermediary, action type
- Top macro strip:
  - Open opportunities
  - Estimated ARR proxy
  - Churn-risk wallets
  - Upsell candidates
- Main area:
  - Large prioritized queue table/list
  - Each row includes Priority, Wallet/Account, Intermediary, Signal, Why now, Suggested action, Owner, Due
  - Example intermediaries: Sponge, Dexter, Direct
  - Row examples:
    - P1 Sponge high spend dormant → 再訪キャンペーン
    - P1 Dexter repeat active → Service Bアップセル
    - P2 Direct multi-provider → bundle trial
- Right panel:
  - Selected wallet detail
  - Usage timeline sparkline
  - Reason cards
  - Suggested message in Japanese
  - Buttons: 「営業リストに追加」「Playbook作成」「完了」
- Bottom:
  - Macro/Micro explanation chips: Channel signal → Wallet action

Visual style:
- Workflow product UI, like CRM + analytics
- High fidelity, clean, action-oriented
- Status colors red/amber/green but refined
- Dense but scannable
- Japanese text readable

Save as: tmp/sales-action-queue-ui.png

If image_gen is unavailable, explain clearly and do not create a placeholder image.
