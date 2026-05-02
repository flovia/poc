# Current Data Reality Dashboard prompt

Use the built-in image_gen tool. Do not write an API script.

Generate a polished 16:9 Japanese SaaS dashboard screenshot mockup.

Theme: Current data reality. It should look honest about available demo data and should not invent CRM fields.

Page title: 「Current Data Reality Dashboard」
Subtitle: 「今ある利用データから作れるビジネス示唆」

Use these dimensions visibly:
- Wallet segments: trading_bot, research_agent, execution_wallet, one_off
- Sources: Claude Code, Cursor, n8n, API relay, curl
- Intermediaries: Privy, Circle Wallets, Coinbase CDP, Safe, Direct
- Services: Northwind Price API, VectorMind, RouteZero, StreamDelta, LedgerLake

Layout:
- Left sidebar: Overview, Macro Metrics, Current Reality selected, Wallets, Services, Catalog
- Top summary cards: Paid active wallets, Total spend, Repeat wallet rate, Top service candidate
- Two main columns with explicit headers:
  - 「マクロ分析：集計で見る利用構造」
  - 「ミクロ分析：Wallet別の利用実績」
- Macro cards:
  - Source / intermediary ranking table
  - Other service candidates table
  - Endpoint flow mini Sankey
- Micro cards:
  - Top wallets by spend table
  - Repeat segment bars
  - Recent wallet activity list
- Bottom note: 「Demo data / directional proxy」

Visual style:
- Realistic SaaS product screenshot, high fidelity
- White/light gray, navy text, blue/teal accents
- Clean cards, dense but readable tables
- Honest, practical, not futuristic
- Japanese labels readable and concise

Save as: tmp/current-data-reality-ui.png

If image_gen is unavailable, explain clearly and do not create a placeholder image.
