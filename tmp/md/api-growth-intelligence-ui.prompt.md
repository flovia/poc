# API Growth Intelligence UI prompt

Use the built-in image_gen tool. Do not write an API script.

Generate a polished 16:9 high-fidelity Japanese/English SaaS web application screenshot mockup, not an infographic.

Target user: Growth Lead / Growth Manager at a US API company. Avoid sales/CRM language. This page is for deciding GTM / marketing focus and product improvements for x402 / Agents.

Page title: 「API Growth Intelligence」
Subtitle: 「どこから来て、何を使い、どのUse caseがx402 / Agentsに向いているか」

Core questions the UI must answer:
1. Where are users coming from? source / medium / intermediary / partner app / agent framework
2. What endpoints do they use and how frequently?
3. What use case can we infer from endpoint flows and repeat behavior?
4. Which source/medium should we double down on for API adoption?
5. Which endpoints or use cases are best suited for x402 / Agents?

Layout:
- Left sidebar: Growth, API Intelligence selected, Channels, Endpoints, Use Cases, x402 Fit, Experiments, Reports
- Header filters: Date range, Source / Medium, Segment, Endpoint, x402 fit, Confidence
- Top executive cards:
  - 「Best adoption channel」 KPI: Agent Frameworks, note: high repeat + high endpoint frequency
  - 「Highest quality medium」 KPI: Dexter, note: 2.1x W2 retention vs Direct
  - 「Top agent-like flow」 KPI: pool_search → token_price, note: 18 sessions / wallet
  - 「Best x402 fit」 KPI: token_detail + paid repeat, note: high automation potential

Main content: three-column analytical workspace plus bottom recommendations.

Column 1: 「Source / Medium Quality」
- Large bubble matrix: X = acquisition volume, Y = repeat quality
- Bubbles: Sponge, Dexter, Direct, Agent SDK, Docs, Partner App
- Bubble size = paid endpoint frequency
- Color = use case mix: agent, research, one-off, execution
- Small ranking table: Source, Wallets, First paid, Repeat, Endpoint freq, Quality score
- Insight chip: 「Agent SDKはvolume中、frequency最高」

Column 2: 「Endpoint & Frequency」
- Endpoint usage table or bar chart:
  - pool_search
  - token_price
  - token_detail
  - simple_price
  - trending_pools
- Columns/labels: wallets, calls / wallet, repeat sessions, paid frequency
- Mini endpoint flow diagram: pool_search → token_price → token_detail
- Highlight: 「repeat flow = agent-like signal」

Column 3: 「Use Case & x402 / Agents Fit」
- Use case inference cards:
  - Trading bot / agent workflow
  - Research agent
  - One-off lookup
  - Execution workflow
- Each card has: source mix, endpoint flow, frequency, x402 fit score, confidence
- A fit matrix: Use case vs Agent fit vs x402 fit vs Product priority
- Highlighted card: 「Trading bot workflow: high x402 fit」

Bottom row: 「GTM & Product Recommendations」
- Recommendation cards:
  1. 「Double down on Agent SDK + Dexter」 reason: high repeat and high endpoint frequency
  2. 「Improve Sponge activation」 reason: high volume, weak W2 repeat
  3. 「Prioritize docs/examples for pool_search → token_price」 reason: strongest agent-like flow
  4. 「Package token_detail as x402-ready workflow」 reason: paid repeat + automation potential

Visual style:
- High-fidelity modern US SaaS analytics dashboard
- White / light gray background, deep navy text
- Blue / teal primary accents, amber for opportunity, red only for weak retention or friction
- Very clear typography and hierarchy
- Realistic dashboard cards, bubble chart, endpoint bars, flow diagram, fit matrix
- Japanese section titles with English product metrics are okay
- Avoid tiny unreadable text, decorative people, stock photos, raw code, or fake browser chrome
- Make it feel immediately useful for a Growth team evaluating API adoption and x402 / Agents strategy

Save as: tmp/png/api-growth-intelligence-ui.png

If image_gen is unavailable, explain clearly and do not create a placeholder image.
