# Sentiment Topography web UI prompt

Use the built-in image_gen tool. Do not write an API script.

Generate a polished 16:9 Japanese SaaS web application screenshot mockup, not an infographic.

Page title: 「Sentiment Topography」
Subtitle: 「営業ログ・サポートログから、中間業者別の温度感を把握」

Purpose: Future-facing UI for combining qualitative feedback with wallet/intermediary analytics.

Layout:
- Left sidebar: Cockpit, Sentiment selected, Feedback, Wallets, Partners, Actions
- Header filters: Intermediary, Sentiment, Theme, Time range
- Top cards: Positive themes, Pain themes, Churn mentions, Upsell mentions
- Main split:
  - Left Macro panel: 「マクロ分析：感情とテーマの地形図」
    - large cluster/topography map with areas: pricing concern, integration friction, high intent, support praise
    - color temperature = sentiment, area size = mention volume
    - tags for Sponge, Dexter, Direct
  - Right Micro panel: 「ミクロ分析：実際の声と対象Wallet」
    - selected cluster: integration friction / Sponge
    - quote cards in Japanese
    - linked wallet/account, spend, last seen, next action
- Bottom: action cards: 「不満解消」, 「アップセル会話」, 「提携改善」

Visual style: polished SaaS insight dashboard, elegant text cards, soft heatmap/topography, white background, readable Japanese, no stock photos.

Save as: tmp/sentiment-topography-ui.png

If image_gen is unavailable, explain clearly and do not create a placeholder image.
