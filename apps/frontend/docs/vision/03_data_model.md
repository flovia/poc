---
name: データモデル方針
description: モック JSON の粒度方針と未確定事項
type: project
---

# データモデル方針

> 最終更新: 2026-04-28
> ステータス: 方針のみ確定。具体的なスキーマ設計は次ステップで詰める

## ★ クライアント側データ (localStorage)

ユーザーが入力する pay_to は **すべてブラウザの localStorage に保存**。サーバー側保存はしない (PoC では認証もないため)。

### 保存内容 (想定)

```ts
type StoredProvider = {
  providerId: string;          // 内部生成 (slug or uuid)
  name: string;                 // 任意の Provider 名
  mode: 'simple' | 'advanced';
  // simple モード:
  payTo?: string;               // 単一アドレス
  // advanced モード:
  paths?: Array<{
    apiPath: string;            // 例: '/v1/generate'
    payTo: string;
  }>;
  createdAt: string;
};

// localStorage key: 'flovia:providers'
type StoredProviders = StoredProvider[];
```

### 操作

- 追加: Setup 画面から
- 切替: サイドバー / ヘッダーの Provider セレクター
- 削除: セレクター内の各エントリの × ボタン (即削除、確認ダイアログあり)
- 編集: Setup 画面で再編集

## ★ 確定した方針

### 受取アドレスの粒度 — 両対応

顧客 (API Provider) によって、x402 の受取アドレス設定が異なる:

- **ケースA**: API パスごとに別々の `pay_to` アドレス
- **ケースB**: Provider 全体で 1 つの `pay_to` アドレス

PoC モックは**両ケースを再現**する。

### 識別ロジック

- **ケースA** の場合: `pay_to` アドレスから API パスを一意に逆引き可能
- **ケースB** の場合: `pay_to` は Provider までしか特定できない。API パスは x402 リクエストの resource metadata (URL 等) から補完

### データソース (本番想定)

| 用途 | ソース |
|---|---|
| x402 tx の横断観測 | x402 facilitator 公開 aggregated データ |
| Provider 識別 (`pay_to` → 名前) | x402bazaar のディレクトリ |
| API パス特定 | (ケースA) `pay_to` で逆引き / (ケースB) resource metadata |

PoC ではすべてモック JSON で再現。

## ★ 想定エンティティ (叩き台)

次ステップで詳細設計する際の出発点。

| エンティティ | 主な属性 (想定) |
|---|---|
| Provider | provider_id, name, category, pay_to addresses[], API paths[] |
| Wallet | address, agent_type (Claude Code / Cursor 等), first_seen_at |
| Payment | tx_hash, wallet, provider_id, api_path, amount_usd, timestamp |
| Co-usage Edge | wallet, provider_a, provider_b, frequency, time_proximity |
| Workflow Pattern | pattern_id, sequence[provider_id, ...], wallet_count |

## ★ デモ用モックデータの基準

主役ウォレット 1 体の具体的なデータ ([09_protagonist_wallet.md](09_protagonist_wallet.md)) を**デモ用モックの中心**として実装する。併用 Provider 名 (VectorMind AI / RouteZero DEX / SignalPort / VaultLayer / StreamDelta / LedgerLake) は**ドキュメント全体で統一**。

その他の "脇役" ウォレット (My Customers の他の行 / Patterns のクラスタ等) は、主役の世界観と矛盾しない範囲で複数生成。

## ★ 未確定事項

- API カテゴリの分類体系 (Storage / Compute / Data / Payment / etc. の MECE な定義)
- 時系列的近接度 (= "同セッション") の定義 (5 分以内? 1 時間以内? wallet ごとのアクティブ window?)
- モックデータの規模感 (何 wallet × 何 Provider × 何 tx でリッチ感が出るか)
- リテンション窓 (D14 を踏襲するか PoC では別の見せ方をするか)
- Insight カードの自動生成ロジック (PoC は固定文言で OK か, テンプレ生成か)
