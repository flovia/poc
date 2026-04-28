# Flovia BFF

Flovia のオンチェーン・インテリジェンス投影データを、フロントエンド向けに読み取り専用 HTTP API として公開する BFF（Backend for Frontend）です。

このアプリは PoC 段階では `apps/cli` が構築した SQLite データベースと集計ロジックを再利用し、画面が必要とする DTO を安定した JSON レスポンスとして返します。

## 役割

- CLI 側で生成済みの観測事実、帰属候補、日次メトリクス、ウォレット集計を HTTP 経由で提供する
- フロントエンドが直接 SQLite や CLI 内部実装に依存しないための境界を作る
- すべてのレスポンスに `cache-control: no-store` を付与し、PoC 中のデータ更新を即時確認しやすくする
- 書き込み・取り込み・スコアリングなどの処理を受け付けない読み取り専用面として振る舞う

## 対象外

この BFF は次の処理を行いません。

- live RPC からのデータ取り込み
- スコアリングジョブの実行
- 集計テーブルの再構築
- report ファイルの生成・書き込み
- HTTP リクエストテレメトリやユーザー行動ログからの推論
- `tx.from` を人間ユーザーとして断定すること

取り込み、集計、レポート生成は CLI 側の責務です。BFF は生成済みデータの投影のみを扱います。

## 起動方法

ルートまたは `apps/bff` で依存関係をインストールしてから起動します。

```bash
bun install
cd apps/bff
bun run start
```

デフォルトでは `http://localhost:3001` で待ち受けます。

### 環境変数

| 変数 | 既定値 | 説明 |
| --- | --- | --- |
| `PORT` | `3001` | HTTP サーバーの待ち受けポート |
| `DATABASE_URL` | `./demo.db` | 読み取る SQLite データベースのパス。相対パスは起動時の working directory から解決されます |

例:

```bash
DATABASE_URL=../../apps/cli/demo.db PORT=3001 bun run start
```

## エンドポイント

すべて `GET` のみ対応です。読み取り対象または明示的に禁止している変更系パスに対して `GET` 以外を送ると `405 method_not_allowed` を返します。存在しないパスは `404 not_found` です。

| パス | 内容 |
| --- | --- |
| `GET /health` | BFF の疎通確認。`{ status: "ok", service: "flovia-bff" }` を返す |
| `GET /summary` | レポートサマリー。観測、候補、ウォレット、メトリクスの概要 |
| `GET /observations` | 支払い観測事実の一覧 |
| `GET /attribution-candidates` | provider / middleman / facilitator / service / payee などの帰属候補一覧 |
| `GET /metrics/daily` | 日次集計メトリクス |
| `GET /wallets/payers` | payer ウォレット別の集計プロファイル |
| `GET /wallets/recipients` | recipient ウォレット別の集計プロファイル |
| `GET /wallets/relayers` | relayer ウォレット候補別の集計プロファイル |
| `GET /wallet-usage-graph` | payer / recipient / relayer の関係を表すウォレット利用グラフ |

確認例:

```bash
curl http://localhost:3001/health
curl http://localhost:3001/summary
```

## データの意味論

- Payment observation はオンチェーン由来の観測事実です。
- provider、middleman、facilitator、service、payee などのラベルは、confidence、reasons、evidence refs を持つ帰属候補です。確定事実として扱わないでください。
- `tx.from` は relayer wallet candidate として公開します。人間ユーザーや支払い主体とは限りません。
- endpoint path、resource URL、referrer、HTTP response semantics、agent type、upsell 関連フィールドは、将来の enrichment source が提供されない限り利用できません。
- 金額は原則として atomic unit の文字列として扱い、BFF 側で小数表記や通貨換算へ変換しません。

## 実装境界

PoC 期間中、`apps/bff` は `apps/cli/lib/*` から承認済みの再利用可能な surface を import できます。

- aggregate readers
- DTO mappers
- summary builder
- wallet usage graph builder
- 明示的な database context 型・factory helper

一方で、route 実装から次のものを呼び出してはいけません。

- `apps/cli/scripts/*`
- report file writer
- live RPC 依存の処理
- 取り込み、再集計、スコアリングなどの変更系処理

BFF / frontend の利用が安定してきた DTO validation は、将来的に `packages/api-model` のような共有パッケージへ抽出する想定です。

## 開発・検証

`apps/bff` 単体:

```bash
cd apps/bff
bun run typecheck
bun test
bun run verify:e2e
bun run verify
```

リポジトリ全体:

```bash
bun run verify
```

`verify` は typecheck、unit test、offline e2e 検証を通すための基準です。live RPC や外部サービスに依存する検証は通常の `verify` に含めません。

## ディレクトリ構成

```text
apps/bff/
├── src/
│   ├── db/context.ts          # SQLite database context の生成
│   ├── http.ts                # ルーティングと HTTP レスポンス
│   ├── server.ts              # Bun.serve のエントリポイント
│   ├── services/read-service.ts
│   └── testing/seed.ts        # テスト・検証用 seed helper
├── tests/                     # unit / route tests
├── scripts/                   # e2e 検証スクリプト
└── package.json
```
