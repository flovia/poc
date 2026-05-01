# Business Opportunity Cockpit web UI mockup prompt

Use the built-in image_gen tool. Do not write an API script.

Generate a polished 16:9 desktop web application screenshot mockup in Japanese.

This is not an infographic. It should look like an actual SaaS analytics web page UI.

Page name: 「Business Opportunity Cockpit」

Product context: Web dashboard for a provider analyzing wallet usage, intermediary channels, and next business actions.

Core goal:
- Make macro analysis and micro analysis visibly separated.
- Make the page feel immediately useful for business decisions.
- Prioritize demo value and insight storytelling over data precision.
- Use mocked intermediary tags: Sponge, Dexter, Direct.

Overall layout:
- Browser-like SaaS dashboard view, 16:9 landscape.
- Left sidebar navigation with items:
  - Overview
  - Macro Metrics
  - Business Cockpit selected
  - Wallets
  - Providers
  - Reports
- Top header:
  - Breadcrumb: Provider / Business Cockpit
  - Page title: Business Opportunity Cockpit
  - Subtitle: 「どこに投資するか・誰に営業するか・何を提案するか」
  - Date range filter, Intermediary filter, Export button

Main content structure:

1. Top row: three executive insight cards
   Card 1:
   - Title: 「Sponge経由は高支出・低再訪」
   - KPI: "$128K spend"
   - Small text: 「Repeat rate 22%」
   - Action tag: 「再訪施策」
   Card 2:
   - Title: 「Dexterは継続率が高い」
   - KPI: "68% repeat"
   - Small text: 「Service Bアップセル候補」
   - Action tag: 「アップセル」
   Card 3:
   - Title: 「高支出・休眠Wallet」
   - KPI: "18 wallets"
   - Small text: 「last seen > 14 days」
   - Action tag: 「営業リスト化」

2. Main grid: two large columns

Left column header:
「マクロ分析：市場・チャネル・提携判断」
Blocks inside:
- Intermediary Performance card:
  horizontal bars for Sponge, Dexter, Direct
  columns/labels: Spend, Repeat, High-value ratio
- Co-usage Opportunity card:
  simple network/flow diagram: Provider A ↔ Provider B, Provider C as next candidate
  tag: 「クロスセル機会」
- Segment Insight card:
  small segmented chart with labels: High value, Growing, Churn risk
  recommended action chips: 「提携強化」「チャネル投資」「市場機会発見」

Right column header:
「ミクロ分析：Wallet別の営業アクション」
Blocks inside:
- Target Wallets table:
  columns: Wallet, Source, Spend, Last seen, Status, Next action
  rows:
  0xA91... Sponge $18.2K 21d dormant 再訪施策
  0xF33... Dexter $9.8K 3d active Service B提案
  0xC02... Direct $7.1K 9d active クロスセル
- Next Best Action card:
  large recommendation: 「Service Bを提案」
  reason: 「Provider A×B併用Walletは購入確率が高い」
- Flags card:
  chips: High value, Dormant, Multi-provider, Churn risk, Upsell candidate

3. Bottom row: Action Queue
   Header: 「今週やること」
   Three task cards:
   - P1 「Sponge高支出休眠Walletへ再訪キャンペーン」
   - P2 「Dexter継続WalletへService Bアップセル」
   - P3 「Provider A×B併用層へクロスセル」

Visual design:
- High-fidelity modern SaaS dashboard UI, not wireframe
- White/light gray background, deep navy text, blue/teal primary accents, amber warning accents
- Rounded cards, soft shadows, clear typography, realistic spacing
- Make Macro and Micro sections visually distinct, with colored section labels
- Use readable Japanese text; avoid tiny illegible paragraphs
- Use realistic charts and tables, but keep content concise
- No decorative people, no stock photos, no code, no fake browser toolbar unless subtle

Save the resulting image as: tmp/business-opportunity-web-ui.png

If image_gen is unavailable, explain clearly and do not create a placeholder image.
