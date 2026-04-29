---
name: 主役ウォレット プロファイル
description: デモで使う架空ウォレット 1 体の人格 + Activity Timeline サンプル + 併用 Provider
type: project
---

# 主役ウォレット プロファイル

> 最終更新: 2026-04-28
> 出典: [Codex 提案](/tmp/flovia-codex-review/demo_script.md)
> 目的: デモ脚本 ([08_demo_script.md](08_demo_script.md)) の主役ウォレットを具体化、モックデータの叩き台

## ★ 基本プロファイル

| 項目 | 値 |
|---|---|
| ウォレットアドレス | `0x7A91...C4E8` (masking 表示) |
| アクティブ期間 | 2026-03-31 〜 2026-04-28 (約 28 日) |
| 推定エージェント種別 (UA family) | `Self-hosted DeFi Trading Bot` |
| 役割の解釈 | 価格取得 → LLM 分析 → DEX 執行 → Discord 通知、を毎時回す 24h bot |

### 利用パターンの規則性

- 毎時 `00-03 分` に価格 API を呼ぶ
- その 1〜2 分後に LLM API
- シグナル発生時のみ 1〜5 分以内に DEX aggregator
- 取引有無にかかわらず最後に Discord 通知
- 直近 7 日でこのサイクル頻度と金額が増加

## ★ Activity Timeline サンプル (12 行)

デモでは下記 12 行を、上から下へ追うだけで物語が分かる並び。

| 時刻 | Provider | API パス | 金額 |
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

### 物語として見せるポイント

- 9 時台は通常運転
- 10 時台で対象ペア数が増え、価格 API の単価も上がる
- 11 時台では市場データの粒度が上がり、DEX 執行額も伸びる
- **規則性は維持したまま、強度だけが増えている**
- つまり「壊れた bot」ではなく **「伸びている bot」** であり、アップセル対象として質が高い

## ★ 併用 Provider 6 社 (架空名)

| 架空名 | 種別 | このウォレットでの役割 |
|---|---|---|
| **VectorMind AI** | LLM API | 市場要約、売買判断文生成 |
| **RouteZero DEX** | DEX Aggregator | ルーティングと約定 |
| **SignalPort** | Discord / Notification API | 取引通知 |
| **VaultLayer** | Wallet / Policy API | 署名ポリシー、実行制御 |
| **StreamDelta** | On-chain / Mempool Data API | 執行前の補助シグナル |
| **LedgerLake** | Analytics / Logging API | bot パフォーマンス記録 |

これらの架空名は **デモのリアリティ** を担保するため、ドキュメント全体で統一して使う。

## ★ 自社視点の数値

| 項目 | 値 |
|---|---|
| 今月の自社 API 支出 | `$3,840` |
| 直近 7 日の利用成長率 | `+184%` |
| 月初比 req 成長 | `3.1x` |
| 無料枠到達状況 | `92%` |
| 推定今月着地 | `無料枠超過 + 従量課金開始直前` |

### 推奨アクション

- 高頻度 bot 向け有料プランを提案
- **低遅延 SLA** と **higher rate limit** を主訴求

## ★ Insight Card 文言例

デモ画面で表示する短文。**英語で計測感を出す** (Codex 提案)。

```
This wallet uses your API as the first step in an hourly trading loop.

7d volume accelerated 184% while workflow regularity remained stable.

Free tier usage is at 92%; this wallet is a strong candidate for a
trading-grade plan.
```
