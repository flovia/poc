# Flovia PoC Frontend — ドキュメント一覧

このディレクトリは、現状の実装に関するドキュメントと、PoC 開発前に固めた当初ビジョンの両方を保管しています。

## 現状

| ファイル | 内容 |
| --- | --- |
| [current-capabilities.md](current-capabilities.md) | 現在の実装で何が表示できるか・各画面が叩いている BFF endpoint・PoC 射程外として落とした項目 |
| [vision-vs-bff-gap.md](vision-vs-bff-gap.md) | 当初ビジョン (`vision/`) と BFF 提供データの乖離分析・現実的に表現可能な範囲・推奨される進め方 |

## 当初ビジョン (`vision/`)

PoC 開発を始める前に固めた前提・脚本・デザイン方針。`~/Documents/MOTHER BASE/Flovia/poc/docs/` から複製したもの。

| # | ファイル | 内容 |
| --- | --- | --- |
| - | [vision/README.md](vision/README.md) | 当初ビジョン側のインデックス（オリジナルそのまま） |
| 0 | [vision/00_overview.md](vision/00_overview.md) | ゴール / 利用者 / ナラティブ / データ前提 / スコープ |
| 1 | [vision/01_screens.md](vision/01_screens.md) | 4 画面の構成・レイアウト・デモストーリー |
| 2 | [vision/02_visualization.md](vision/02_visualization.md) | Activity Timeline / Network 図 / バブルの選定理由 |
| 3 | [vision/03_data_model.md](vision/03_data_model.md) | データ粒度方針と想定エンティティ |
| 4 | [vision/04_tech_stack.md](vision/04_tech_stack.md) | 技術スタック (確定 / 未確定) |
| 5 | [vision/05_decisions_log.md](vision/05_decisions_log.md) | 意思決定ログ (D1〜D15) |
| 6 | [vision/06_design_direction.md](vision/06_design_direction.md) | デザイン方向 (Precision Graph + Ambient Mesh ハイブリッド) |
| 7 | [vision/07_moodboard_per_screen.md](vision/07_moodboard_per_screen.md) | 画面別ムードボード指示書 |
| 8 | [vision/08_demo_script.md](vision/08_demo_script.md) | 3 分間デモ脚本 (シーン 1〜7、クライマックス a / b) |
| 9 | [vision/09_protagonist_wallet.md](vision/09_protagonist_wallet.md) | 主役ウォレット (DeFi trading bot) のプロファイル + Activity Timeline サンプル |
| 10 | [vision/10_design_review.md](vision/10_design_review.md) | 脚本に基づく設計レビュー + クリティカル UI 5 要素 |

## 読み始める順序の目安

- **実装の現状を知りたい** → [current-capabilities.md](current-capabilities.md)
- **当初の意図と現実のずれを知りたい** → [vision-vs-bff-gap.md](vision-vs-bff-gap.md)
- **当初ビジョンを通読したい** → [vision/README.md](vision/README.md) → 00 → 01 → ... の順
