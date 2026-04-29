# Flovia 260427 CLI

## この CLI でできること

- CDP x402 Discovery の metadata と Bitquery の onchain activity を使って market snapshot を生成します。
- JSON (`x402-market-snapshot.json`) と Markdown summary (`x402-market-summary.md`) の両方を書き出します。
- `--network` / `--asset` による scope 指定、CDP 取得件数の `--limit`、明示的な全件取得 `--all` に対応します。
- Bitquery enrichment には環境変数 `BITQUERY_TOKEN` を使います。

## 主なコマンド

- リポジトリルートで依存関係を導入: `bun install`
- 環境変数の雛形を作成: `cp -n .env.example .env`
- snapshot を生成: `bun run market:snapshot`
- offline pipeline を検証: `bun run verify`

## 注意

- 旧 self-implemented discovery / probe / onchain pipeline は `v0-self-implemented-x402` branch に保存済みです。
- この branch では CDP + Bitquery を primary path とし、旧 pipeline は意図的に含めていません。
