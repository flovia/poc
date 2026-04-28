# 開発スタイル

TDD で開発する（探索 → Red → Green → Refactoring）。
KPI やカバレッジ目標が与えられたら、達成するまで試行する。
不明瞭な指示は質問して明確にする。

# コード設計

- 関心の分離を保つ
- 状態とロジックを分離する
- 可読性と保守性を重視する
- コントラクト層（API/型）を厳密に定義し、実装層は再生成可能に保つ
- 静的検査可能なルールはプロンプトではなく、その環境の linter か ast-grep で記述する

# ツール

- タスク: bun script
- Bun
- Typescript 6

# リポジトリ構成

- Bun workspaces を使う（`apps/*`, `packages/*`）。
- 現在の主要実装は `apps/cli`。

# セットアップ

- 依存関係の導入: `bun install`
- `.env` が必要な場合は `apps/cli/.env.example` を参照する。

# 検証

- 変更後は原則としてルートで `bun run verify` を実行する。
- `verify` は typecheck、test、offline 検証を通すための基準とする。
- フォーマット確認が必要な場合は `bun run format:check` を実行する。
- テストは Bun test を使う。
- TypeScript は strict 前提で扱う。

# フォーマット

- Biome を formatter として使う。
- 初期段階では lint は無効にする。
- 対象は TypeScript と JSON を基本にし、Markdown/docs や report 生成物は巻き込まない。
- 変更後は必要に応じて `bun run format` を実行する。
- PoC の速度を優先し、`verify` にはまだ組み込まない。

# 実行ポリシー

- デフォルトの検証は offline を維持する。
- live RPC や外部サービス依存の検証を通常の `verify` に混ぜない。
- live 検証が必要な場合は明示的な別コマンドに分離する。

# 生成物・秘匿情報

- `.env`、DB ファイル、report 出力、`dist`、`node_modules` は git に含めない。
- 生成物を前提にせず、必要なら再生成できる形にする。

# コミット

- コミットメッセージは Conventional Commits を使う。
- Co-Authored-By は付けない（ユーザーが明示的に求めない限り）。
- 形式: `<type>: <short description>`
- scope は任意で、type ではなく括弧で表す。例: `feat(cli): add fixture capture`
- `cli:` のような独自 type は使わず、`feat(cli):` / `fix(cli):` のように scope として扱う。
- 破壊的変更は `!` または `BREAKING CHANGE:` footer で示す。
- subject line は lowercase、命令形、ピリオドなし、72文字以内にする。
- body は任意。書く場合は subject の後に空行を入れ、72文字で折り返す。

Types:

- `feat`: 新機能
- `fix`: バグ修正
- `refactor`: リファクタリング（振る舞い変更なし）
- `chore`: メンテ、設定、依存、CI
- `docs`: ドキュメントのみ
- `test`: テスト追加・修正
- `perf`: パフォーマンス改善
- `style`: フォーマット、空白（ロジック変更なし）
- `revert`: 以前のコミットを取り消す
