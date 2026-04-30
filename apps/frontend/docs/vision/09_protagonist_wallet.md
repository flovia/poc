---
name: Hero wallet profile
description: Fictional one-wallet persona + Activity Timeline sample + co-used Providers
type: project
---

# Hero wallet profile

> Last updated: 2026-04-28
> Source: [Codex proposal](/tmp/flovia-codex-review/demo_script.md)
> Purpose: Concretize the hero wallet used in the demo script ([08_demo_script.md](08_demo_script.md)) and define mock seed data

## ★ Core profile

| Item | Value |
|---|---|
| Wallet address | `0x7A91...C4E8` (masked display) |
| Active period | 2026-03-31 〜 2026-04-28 (about 28 days) |
| Estimated agent type (UA family) | `Self-hosted DeFi Trading Bot` |
| Interpretation | Repeating hourly 24h bot: price pull → LLM analysis → DEX execution → Discord notification |

### Usage regularity

- Call price API around `00-03` minutes every hour
- 1–2 minutes later call LLM API
- On signal, call DEX aggregator within 1–5 minutes
- Always send a final Discord notification regardless of whether a trade executed
- In the last 7 days both cycle frequency and amount increased

## ★ Activity Timeline sample (12 rows)

The demo story is understandable by reading these 12 rows top-to-bottom.

| Time | Provider | API path | Amount |
|---|---|---|---|
| 2026-04-28 09:00 | **Your Price API** | `/v1/price/history?pair=ETH-USD&window=1h` | `$0.018` |
| 2026-04-28 09:01 | VectorMind AI | `/v1/responses` | `$0.031` |
| 2026-04-28 09:03 | RouteZero DEX | `/quote-and-swap` | `$0.142` |
| 2026-04-28 09:04 | SignalPort | `/api/messages` | `$0.004` |
| 2026-04-28 10:00 | **Your Price API** | `/v1/price/snapshot?pairs=ETH,ARB,SOL` | `$0.022` |
| 2026-04-28 10:01 | VectorMind AI | `/v1/responses` | `$0.036` |
| 2026-04-28 10:02 | RouteZero DEX | `/quote-and-swap` | `$0.158` |
| 2026-04-28 10:03 | SignalPort | `/api/messages` | `$0.004` |
| 2026-04-28 11:00 | **Your Price API** | `/v1/market/ohlcv?pair=SOL-USD&interval=1h` | `$0.028` |
| 2026-04-28 11:01 | VectorMind AI | `/v1/responses` | `$0.042` |
| 2026-04-28 11:02 | RouteZero DEX | `/quote-and-swap` | `$0.211` |
| 2026-04-28 11:03 | SignalPort | `/api/messages` | `$0.004` |

### Storytelling points

- 9 AM is normal operation
- At 10 AM pair count increases and price API unit value rises
- At 11 AM data granularity rises and DEX execution amount grows
- **The pattern remains stable; only intensity increases**
- Therefore this is not a broken bot but a **growing bot**, high quality for upsell

## ★ Six co-used providers (fictional names)

| Name | Type | Role for this wallet |
|---|---|---|
| **VectorMind AI** | LLM API | Market summarization and trade judgment text generation |
| **RouteZero DEX** | DEX Aggregator | Routing and settlement |
| **SignalPort** | Discord / Notification API | Trade notification |
| **VaultLayer** | Wallet / Policy API | Signature policy and execution control |
| **StreamDelta** | On-chain / Mempool Data API | Auxiliary signal before execution |
| **LedgerLake** | Analytics / Logging API | Bot performance logging |

These fictional names are used consistently across the whole doc for demo realism.

## ★ Internal metrics

| Item | Value |
|---|---|
| Monthly spend on own API | `$3,840` |
| 7d usage growth | `+184%` |
| req growth vs start of month | `3.1x` |
| Free-tier progress | `92%` |
| Estimated month-end landing | `over free tier, near pay-as-you-go start` |

### Recommended actions

- Propose a paid plan for high-frequency bots
- Primary value props: **low-latency SLA** and **higher rate limit**

## ★ Insight card copy examples

Short statements shown on demo screen. **Keep them in English with measurable wording** (Codex proposal).

```
This wallet uses your API as the first step in an hourly trading loop.

7d volume accelerated 184% while workflow regularity remained stable.

Free tier usage is at 92%; this wallet is a strong candidate for a
trading-grade plan.
```
