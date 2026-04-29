# Flovia POC

Flovia 260427 の x402 マーケットインテリジェンス実験用 Bun ワークスペースです。

現在の主経路は、パッケージ化された CDP x402 Discovery + Bitquery パイプラインです。 リソースメタデータを正規化し、Base USDC の支払いアクティビティと結合して、 CLI からマーケットスナップショットレポートを生成します。

## ワークスペース

- `apps/cli/`: CLI エントリポイント、マーケットスナップショット生成、テスト、レポート
- `apps/bff/`: 将来のプロダクト API 境界。現時点では最小 health API のみ
- `packages/contracts/`: Zod スキーマと共有マーケットインテリジェンス契約
- `packages/sources/`: CDP Discovery / Bitquery のソースクライアントと正規化処理
- `packages/intelligence/`: マーケットスナップショットの結合、ランキング、集計

## 前提条件

- Bun `>=1.3.13`

## セットアップ

```sh
bun install
cp -n .env.example .env
```

環境変数は基本的にリポジトリルートの `.env` に置きます。ルートの `.env.example` を雛形として使ってください。Bitquery を使う live snapshot には `BITQUERY_TOKEN` が必要です。

## よく使うコマンド

特に指定がない限り、リポジトリルートから実行します。

```sh
bun run verify        # typecheck、テスト
bun run test          # テストスイート
bun run typecheck     # TypeScript strict typecheck
bun run format        # Biome で TypeScript / JSON をフォーマット
bun run format:check  # フォーマット確認
```

CLI パイプラインのコマンドは `apps/cli` から利用できます。

```sh
bun run market:snapshot -- --limit 100 --network base --asset USDC
bun run market:snapshot -- --all
```

`market:snapshot` はスコープ対象の支払いオプションに Bitquery アクティビティを要する場合、
`BITQUERY_TOKEN` を要求します。デフォルトでは次のファイルを書き出します。

- `apps/cli/reports/x402-market-snapshot.json`
- `apps/cli/reports/x402-market-summary.md`

`--all` を付けない場合は、`X402_MARKET_FETCH_LIMIT`（デフォルト: 100）で上限制御します。デフォルト値は安全側に収めるため、必要なら `--all` を明示してください。

旧 self-implemented discovery/probe/onchain attribution 基盤は `v0-self-implemented-x402` branch に保存済みです。この branch には意図的に含めません。

## 検証ポリシー

`bun run verify` は意図的に offline-only です。ウォレットアクセス、有料 API、 live RPC 呼び出しなしで成功する必要があります。Live 検証が必要な場合は、 `market:snapshot` のような明示的なコマンドとして実行します。

## 生成物とローカルファイル

ローカル環境ファイル、データベース、ビルド出力、依存関係、生成レポートは git の 管理対象外です。生成物はコミットせず、フィクスチャとスクリプトから再生成できる 状態を保ちます。
