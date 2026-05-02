# Anomaly Sonar web UI prompt

Use the built-in image_gen tool. Do not write an API script.

Generate a polished 16:9 Japanese SaaS web application screenshot mockup, not an infographic.

Page title: 「Anomaly Sonar」
Subtitle: 「商機・離脱・急増をリアルタイムに検知」

Purpose: Detect unusual spikes/drops in spend, repeat usage, endpoint behavior, and intermediary activity.

Layout:
- Left sidebar: Cockpit, Anomaly Sonar selected, Alerts, Wallets, Partners, Logs
- Header filters: Signal type, Intermediary, Severity, Time range
- Top alert cards: Spend spike, Repeat drop, Dormant high-value, Endpoint surge
- Main split:
  - Left Macro panel: 「マクロ分析：全体シグナルの異常検知」
    - large time-series/EKG chart with expected band and glowing anomalies
    - colored markers for Sponge, Dexter, Direct
    - severity legend
  - Right Micro panel: 「ミクロ分析：異常の原因Wallet」
    - selected alert: Sponge high spend dormant spike
    - forensic detail card: wallets, events, last seen, impacted spend
    - timeline of related events
    - suggested response
- Bottom: alert queue with P1/P2/P3 incidents and business action labels

Visual style: premium monitoring dashboard, slightly dark or light with navy panels, neon blue/teal alerts, red/amber severity, readable Japanese labels, no code/raw JSON.

Save as: tmp/anomaly-sonar-ui.png

If image_gen is unavailable, explain clearly and do not create a placeholder image.
