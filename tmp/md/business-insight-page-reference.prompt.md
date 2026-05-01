# Business Insight Page reference image prompt

Use the built-in image_gen tool. Do not write an API script.

Create one 16:9 Japanese reference mockup image for a single web dashboard page.

Purpose: show a page that clearly feels business-useful, not just a metrics catalog.

Page title:
「Business Opportunity Cockpit」

Core premise:
- Macro analysis and micro analysis are explicitly separated.
- Mock data is acceptable; insight value is more important than data precision.
- Intermediaries are hard-tagged examples: Sponge, Dexter, Direct.
- The page must answer: 「どこに投資するか」「誰に営業するか」「何を提案するか」.

Layout:
1. Top executive summary strip
   - 3 compact decision cards:
     - 「Sponge経由は高支出だが再訪率が低い」
     - 「Dexter経由は継続率が高くアップセル向き」
     - 「高支出・休眠Walletが18件」

2. Left half: Macro Analysis
   Header: 「マクロ分析：市場・チャネル・提携判断」
   Include 3 blocks:
   - Intermediary ranking: Sponge / Dexter / Direct bars with spend, repeat rate, high-value wallet ratio
   - Co-usage opportunity map: Provider A ↔ Provider B, Provider C as next candidate
   - Segment insight: high-value, growing, churn-risk segments
   Business action labels:
   - 「提携強化」
   - 「チャネル投資」
   - 「市場機会発見」

3. Right half: Micro Analysis
   Header: 「ミクロ分析：Wallet別の営業アクション」
   Include 3 blocks:
   - Top target wallets table with wallet, intermediary, spend, last seen, status
   - Next best action card: 「Service Bを提案」 / 「再利用キャンペーン」
   - Upsell / churn flags: high value, dormant, multi-provider
   Business action labels:
   - 「営業リスト化」
   - 「アップセル提案」
   - 「離脱防止」

4. Bottom action queue
   Header: 「今週やること」
   Show three prioritized actions:
   - P1: Sponge高支出休眠Walletへ再訪施策
   - P2: Dexter継続WalletへService B提案
   - P3: Provider A×B併用層にクロスセル

Visual style:
- Clean SaaS analytics dashboard, polished product mockup
- White/light background with blue, teal, and amber accents
- Clear separation between Macro and Micro columns
- Use realistic dashboard cards, charts, small tables, and tags
- Japanese labels must be readable and concise
- Avoid dense text, tiny paragraphs, screenshots, code, or decorative clutter
- Make it look like a reference design for a business demo page

Save the resulting image as: tmp/business-insight-page-reference.png

If image_gen is unavailable, explain clearly and do not create a placeholder image.
