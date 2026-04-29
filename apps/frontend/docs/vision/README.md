---
name: PoC ドキュメント インデックス
description: PoC 開発前に固めた前提・方針のまとめ
type: project
---

# Flovia PoC ドキュメント

> 最終更新: 2026-04-28
> このディレクトリは **PoC 開発を始める前に固めた前提と方針** をまとめたもの

## ★ 読む順序

| # | ファイル | 内容 |
|---|---|---|
| 0 | [00_overview.md](00_overview.md) | ゴール / 利用者 / ナラティブ / データ前提 / スコープ |
| 1 | [01_screens.md](01_screens.md) | 3 画面の構成・レイアウト・デモストーリー |
| 2 | [02_visualization.md](02_visualization.md) | ネットワーク図 / Sankey / バブルの選定理由 |
| 3 | [03_data_model.md](03_data_model.md) | データ粒度方針と未確定事項 |
| 4 | [04_tech_stack.md](04_tech_stack.md) | 技術スタック (確定 / 未確定) |
| 5 | [05_decisions_log.md](05_decisions_log.md) | 意思決定ログ (なぜそう決めたか) |
| 6 | [06_design_direction.md](06_design_direction.md) | デザイン方向 (ハイブリッド: Precision Graph + Ambient Mesh) |
| 7 | [07_moodboard_per_screen.md](07_moodboard_per_screen.md) | 画面別ムードボード指示書 (4 画面の視覚設計指針) |
| 8 | [08_demo_script.md](08_demo_script.md) | 3 分間デモ脚本 (シーン別ナレーション + クライマックス位置) |
| 9 | [09_protagonist_wallet.md](09_protagonist_wallet.md) | 主役ウォレットのプロファイル + Timeline サンプル + 併用 Provider |
| 10 | [10_design_review.md](10_design_review.md) | 脚本に基づく設計レビュー + 追加 UI 要素 + 各画面優先順位 |

## ★ 一行サマリ

**x402 の公開データを使い、自社 API の顧客ウォレットが他にどんな API と併用しているかを可視化する、顧客 API Provider 向けデモダッシュボード**を、Next.js + Vercel で構築する。

## ★ 既決の柱

- **ナラティブ**: Co-usage Discovery (主) + Retention (副)
- **視点**: 競合ではなく併用パターン分析
- **アクセスモデル**: 完全フラット (認証なし、公開ディレクトリ的)
- **pay_to 保存**: ブラウザの localStorage (簡単切替・削除)
- **画面**: Setup / My Customers / Wallet 360° / Co-usage Patterns の 4 画面
- **可視化**: Activity Timeline (主) / ネットワーク図 / バブル
- **デザイン**: ハイブリッド (UI shell = Precision Graph / 主役画面 = Ambient Mesh)、ダーク既定
- **粒度**: Provider 単位 / API パス単位の両対応
- **スタック**: Next.js + pnpm + Vercel + モック JSON + shadcn/ui + Tailwind
- **デモ脚本**: 3 分、CoinGecko/Nansen 系 Manager 向け、クライマックス a (理解獲得) + b (売上機会発見)
- **主役ウォレット**: DeFi 自動取引 bot (毎時 Price → LLM → DEX → Discord、7d +184%、Free tier 92%)

## ★ 次ステップ候補

1. データモデル詳細設計 (モック JSON のスキーマ)
2. デザイン方向決定 (Codex 相談で参照案 3 つ)
3. プロジェクト雛形 (Next.js セットアップ)

進める順序は別途相談。

## ★ 関連 (参考程度、本 PoC は踏襲しない)

- `../research/sync_meeting/` — 旧ドキュメント。内容は引き継がない
