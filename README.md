# Flovia POC

Flovia 260427 の x402 マーケットインテリジェンス / customer intelligence 実験用 Bun ワークスペースです。

現在の主経路は、`packages/*` に分離した contract / source / intelligence 層を、`apps/cli`、`apps/bff`、`apps/frontend` から利用する構成です。CLI では CDP x402 Discovery と Bitquery を結合した market snapshot / customer intelligence を生成し、BFF は保存済み read model を read-only product API として返し、frontend はその projection を Next.js UI として表示します。

## ワークスペース

- `apps/cli/`: CLI エントリポイント、market snapshot / customer intelligence 生成、fixture capture、レポート
- `apps/bff/`: frontend demo 向け read-only product API。prepared fixture / projection を canonical envelope で返す
- `apps/frontend/`: Next.js 15 / React 19 の x402 Co-usage Discovery プロトタイプ UI
- `packages/contracts/`: Zod スキーマと共有 contract。market intelligence と Phase B product API schema を定義
- `packages/sources/`: CDP Discovery / Bitquery のソースクライアントと正規化処理
- `packages/intelligence/`: market snapshot / customer intelligence の結合、ランキング、projection 補助

## 前提条件

- Bun `>=1.3.13`
- frontend を動かす場合は Node.js `>=20`

## セットアップ

```sh
bun install
cp -n .env.example .env
```

環境変数は基本的にリポジトリルートの `.env` に置きます。ルートの `.env.example` を雛形として使ってください。CLI は `../../.env` と `apps/cli/.env` を dotenvx 経由で読み込みます。Bitquery を使う live capture / snapshot / customer intelligence には `BITQUERY_TOKEN` が必要です。

## よく使うコマンド

特に指定がない限り、リポジトリルートから実行します。

```sh
bun run verify        # import boundary、typecheck、テスト、offline 検証
bun run test          # テストスイート
bun run typecheck     # TypeScript strict typecheck
bun run format        # Biome で TypeScript / JSON をフォーマット
bun run format:check  # フォーマット確認
```

アプリ単位の主なコマンドは Bun workspace filter で実行できます。

```sh
bun --filter bff start       # read-only product API を起動（既定: localhost:3001）
bun --filter frontend dev    # frontend dev server を起動（既定: localhost:3000）
docker compose up --build    # BFF と frontend をまとめて起動
```

CLI パイプラインのコマンドは `apps/cli` workspace から利用できます。

```sh
bun --cwd apps/cli market:snapshot -- --limit 100 --network base --asset USDC
bun --cwd apps/cli market:snapshot -- --all
bun --cwd apps/cli customer:intelligence -- --address 0x... --network base --asset USDC
bun --cwd apps/cli coingecko:transactions -- --from 2026-01-01T00:00:00Z --to 2026-04-29T23:59:59Z
```

`market:snapshot` はスコープ対象の支払いオプションに Bitquery アクティビティを要する場合、`BITQUERY_TOKEN` を要求します。デフォルトでは次のファイルを書き出します。

- `apps/cli/reports/x402-market-snapshot.json`
- `apps/cli/reports/x402-market-summary.md`

`--all` を付けない場合は、`X402_MARKET_FETCH_LIMIT`（デフォルト: 100）で上限制御します。デフォルト値は安全側に収めるため、必要なら `--all` を明示してください。

`customer:intelligence` と `coingecko:transactions` は live Bitquery / CDP Discovery を使う fixture / read model 再生成用コマンドです。通常の `verify` には含めません。詳細は `apps/cli/scripts/README.md` を参照してください。

## BFF / frontend

BFF は request path で live CDP / Bitquery / RPC / SDK collector call を発行せず、`apps/bff/src/data/phase-b-demo.ts` の deterministic fixture / read model を返します。主な endpoint は次の通りです。

- `GET /` / `GET /health`
- `GET /customers`
- `GET /customers/:address/profile`
- `GET /customers/:address/intelligence`
- `GET /wallet-usage-graph`

Frontend は Server Component から BFF を fetch します。接続先は `BFF_URL`（既定: `http://localhost:3001`）と `NEXT_PUBLIC_BFF_URL`（既定: `/api`）で上書きできます。

```sh
bun --filter bff start
BFF_URL=http://localhost:3001 NEXT_PUBLIC_BFF_URL=/api bun --filter frontend dev
```

API contract は `docs/phase-b/api-contract.md` と `packages/contracts` の Phase B schema を基準にします。

旧 self-implemented discovery/probe/onchain attribution 基盤は `v0-self-implemented-x402` branch に保存済みです。この branch には意図的に含めません。

## 検証ポリシー

`bun run verify` は意図的に offline-only です。ウォレットアクセス、有料 API、 live RPC 呼び出しなしで成功する必要があります。Live 検証が必要な場合は、 `market:snapshot` のような明示的なコマンドとして実行します。

## 生成物とローカルファイル

ローカル環境ファイル、データベース、ビルド出力、依存関係、生成レポートは git の 管理対象外です。生成物はコミットせず、フィクスチャとスクリプトから再生成できる 状態を保ちます。
