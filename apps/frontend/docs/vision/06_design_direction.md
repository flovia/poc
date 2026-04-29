---
name: デザイン方向
description: ハイブリッド方針 (Precision Graph shell + Ambient Mesh 主役画面) の確定
type: project
---

# デザイン方向

> 最終更新: 2026-04-28
> 決定根拠: [Codex 相談ログ](/tmp/flovia-codex-review/design_directions.md)

## ★ 採用方針: ハイブリッド

**UI shell は "Precision Graph" / 主役画面は "Ambient Mesh"** の組み合わせ。

| 適用範囲 | 採用案 | 理由 |
|---|---|---|
| **UI shell** (サイドバー, ヘッダー, テーブル, Setup, Card 共通スタイル) | Precision Graph | 端正・信頼感・実装難度低 |
| **主役画面のビジュアル** (Wallet 360° の Co-usage Map / Co-usage Patterns のバブル) | Ambient Mesh | ネットワーク性・デモ映え・Flovia の独自性 |

### なぜハイブリッドか

- **案1 (Precision Graph) 単独**: 堅実だが Flovia の独自性 (= ネットワーク発見の驚き) が出にくい
- **案3 (Ambient Mesh) 単独**: 美しいが演出過多で crypto 風に振れるリスク + 実装難度高
- **ハイブリッド**: 定型 UI は端正に素早く、デモの "見せ場" だけ Ambient Mesh の世界観で映えさせる → コスト/効果バランスが最適

---

## ★ 配色パレット (確定)

UI shell ベース (Precision Graph) を採用し、主役画面で Ambient Mesh のアクセント (深ネイビー + 青発光) を局所的に重ねる。

### Light Mode

| 用途 | HEX |
|---|---|
| Primary (text on bg) | `#0F172A` |
| Secondary | `#334155` |
| Background | `#F8FAFC` |
| Accent | `#14B8A6` (Teal) |
| Text | `#0B1220` |
| **Mesh accent** (主役画面用) | `#2563EB` (Blue) |

### Dark Mode

| 用途 | HEX |
|---|---|
| Primary | `#E2E8F0` |
| Secondary | `#94A3B8` |
| Background | `#020617` (UI shell) |
| **Background (主役画面)** | `#0A0F1E` (深ネイビー) |
| Accent | `#2DD4BF` (Teal) |
| **Mesh accent** | `#60A5FA` (青発光) |
| Text | `#F8FAFC` |

ダークモードを **デモ既定** とする (デモ映え重視)。ライトモードも実装はするが二次優先。

---

## ★ タイポグラフィ

- **見出し**: `Geist Sans` (28〜36px, weight 600〜700, 字間やや詰め)
- **本文**: `Geist Sans` (14〜15px)
- **数値 / 軸ラベル / 計測値**: `Geist Mono` (限定使用で "計測感" を演出)

主役画面 (Wallet 360° / Patterns) で **見出しのみ `Space Grotesk`** を使い、未来感を局所的に出すかは実装時に判断 (PoC ではまず Geist 統一で開始)。

---

## ★ レイアウト原則

- 12 カラム、最大幅 **1440px**
- サイドバー幅 **264px** (固定)
- 余白は **8pt ベース**、主要セクション間 24〜32px
- 密度は **中高** (情報量があるのに静か)
- Wallet 360° は **「左 タイムライン / 中央 ネットワーク / 右 インサイト」の 3 ペイン**
- 主役画面は **背景にネガティブスペース** を取り、Mesh の世界観を活かす

---

## ★ コンポーネント方針

| 要素 | 方針 |
|---|---|
| ベース | **shadcn/ui** |
| 可視化 | 自作 (D3 / visx / react-force-graph 等を実装時に選定) |
| カード角丸 | **16px** (UI shell), **18px** (主役画面で半透明グラス感) |
| 影 | 極小 (UI shell) / 半透明オーラ (主役画面) |
| ボタン | 基本 トーナル / ゴースト、CTA のみソリッド Accent |
| テーブル | 行高やや低め、列整列を厳密に |
| アニメーション | UI shell 150〜220ms (速く短く) / 主役画面 250〜400ms (ambient motion) |

---

## ★ 可視化の世界観

### Activity Timeline (UI shell 寄り)
- 時系列リスト、Mono フォントで時刻 / 金額を整列
- 自社 Provider 行は Teal で hairline highlight

### Co-usage Map (Ambient Mesh 主役)
- 深ネイビー背景 (`#0A0F1E`)
- ノードはグレースケール、**重要ノードのみ青発光** (`#60A5FA`)
- リンクは半透明、重要経路は輝度アップ
- ノードがフォースで配置される ambient motion

### Bubble Chart (Co-usage Patterns / Ambient Mesh 主役)
- 青〜シアンの連続色グラデ
- クラスタには薄いオーラ
- ホバーでバブル拡大 + ツールチップ

---

## ★ 参考にした既存 SaaS

- **Stripe Dashboard** — 金融的信頼感、サイドバー構造
- **Vercel Dashboard / Geist** — 高コントラストで静かなダーク UI
- **Linear** — 密度の高い情報を上品に見せるバランス
- (主役画面のみ) **Vercel / Geist のグラフィック演出** — ネットワーク表現

---

## ★ 避けるもの

- 安っぽい crypto 感 (ネオングリーン, 過剰なグラデ, blockchain アイコン乱用)
- 過度なアニメーション (= プロダクト感の毀損)
- 装飾としての絵文字 / イラスト

---

## ★ 次ステップ

1. Codex に **各画面のムードボード指示書** を依頼
2. Codex に **shadcn/ui ベースの初期コンポーネントセット** を提案させる
3. プロジェクト雛形 (Next.js セットアップ) に進む
