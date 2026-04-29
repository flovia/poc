---
name: 技術スタック
description: フレームワーク・デプロイ先・依存方針
type: project
---

# 技術スタック

> 最終更新: 2026-04-28

## ★ 確定事項

| 項目 | 選定 | 備考 |
|---|---|---|
| フレームワーク | Next.js (App Router) | |
| パッケージマネージャ | pnpm | |
| デプロイ先 | Vercel | URL 共有でデモ配信 |
| 言語 | TypeScript | |
| データソース | モック JSON | バックエンド差し替え可能な構造 |
| デザイン | Codex 相談で最新 SaaS 風 | ゼロベース |

## ★ 未確定 (実装ステップで検討)

| 項目 | 候補 |
|---|---|
| UI コンポーネント | shadcn/ui / Tremor / 自作 |
| スタイリング | Tailwind CSS (ほぼ確定) / CSS Modules |
| ネットワーク図 | react-force-graph / visx / D3 直接 / cytoscape.js |
| Sankey | visx / D3 |
| バブル / 一般チャート | Recharts / visx / Tremor |
| 状態管理 | React 標準 (useState/Context) / Zustand / Jotai |
| データフェッチ | fetch + Server Components (モック JSON は静的読み込みで OK) |
| アイコン | lucide-react / heroicons |
| フォント | Inter / Geist |
| ダークモード | 採用検討 (デモ映えで有利) |

## ★ ディレクトリ構造 (想定)

```
poc/
├── docs/                    # 本ドキュメント群
├── app/                     # Next.js App Router
│   ├── (dashboard)/
│   │   ├── customers/       # 画面1
│   │   ├── wallet/[id]/     # 画面2
│   │   └── patterns/        # 画面3
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── charts/              # ネットワーク図 / Sankey / バブル
│   ├── ui/                  # shadcn 等
│   └── layout/
├── lib/
│   ├── data/                # モック JSON
│   └── types/               # TypeScript types
├── public/
├── package.json
└── ...
```

実装に入る段階で正式に確定する。
