# Phase B デモデータポリシー

このドキュメントでは、Phase B のレスポンス向けにデモデータと provenance ラベルを
どのように作成・管理するかを定義します。

## 1. Canonical 契約ポリシー

Phase B のデモレスポンスは、`docs/api-contract.md` で定義された
canonical 契約に一致している必要があります。

フロントエンド移行時の想定:

- 現在のフロントエンドコードは、配列／直接 DTO 形式や古い命名を前提にしている
  場合があります。
- canonical ペイロードは envelope+scope 形状、nullable labels、ISO タイムスタンプ、
  provenance メタデータ付きのネストされたウォレットグラフを使用します。
- 契約検証を緩めるのではなく、アダプター側で移行してください。

## 2. Provenance カテゴリ（必須セット）

次のいずれかを使用してください。

- `onchain_fact`
- `demo_label`
- `future_sdk_field`
- `derived_insight`

## 3. ラベリング規則

### 3.1 `onchain_fact`

オンチェーン投影と決定的なスコアリングで説明可能な値に使用します。

- pay_to / recipient と network / asset
- 観測済み payer ウォレットと件数
- トランザクション活動量および頻度
- provider overlap / co-usage 数値

### 3.2 `demo_label`

現在は直接検証できないデモ用途の値に使用します。

- ソース / medium candidate
- workflow / use-case の candidate ラベル
- endpoint candidate ラベル

### 3.3 `future_sdk_field`

Phase C 以降のテレメトリ向けに設けるプレースホルダーフィールドに使用します。

- endpoint attribution
- workflow sequence
- orchestration metadata

### 3.4 `derived_insight`

複数シグナルを組み合わせた推定仮説に使用します。

- retention / upsell / partnership の仮説
- co-usage パターンのストーリー

`derived_insight` を使用する場合、`reasons` を付与して利用側が入力を追跡できる
ようにしてください。

## 4. フィールドレベルの provenance

複合オブジェクト（事実ベースと推定／デモ値が混在するもの）では:

- 利用側でフィールド単位の区別が必要な場合、
  `provenanceByField: Record<string, DataProvenance>` を追加します。
- トップレベル `provenance` は集約された source 判定として保持します。

対象例は、顧客一覧アイテム、プロフィール identity/metrics/provider エントリ、
グラフの入れ子ノードです。

## 5. Evidence / reason ポリシー

- `reasons` / `evidence` の各項目は `EvidenceLabel` の形に一致している必要があります。
  - `provenance` は許可された値のみ
  - `label` は空でないこと
  - `description` は任意
  - `sourceFields` は任意
- デモフィールドと機密性が高い derived フィールドには、実務上可能なら
  `reasons` / `evidence` を含めます。
- `derived_insight` では `reasons` は非空である必要があります。

## 6. Atomic 金額ポリシー

Atomic 単位で表現される金額は、すべて次を満たす必要があります。

- 文字列
- 数字のみ (`^[0-9]+$`)

以下に適用します。

- `spendAtomic`
- `totalSpendAtomic`
- `averageSpendAtomic`
- `sharedSpendAtomic`

`-`、`+`、小数点、桁区切りカンマは無効で、拒否対象です。

## 7. アドレスポリシー

- Phase B 契約の `address`、`payToWallet`、`payTo` フィールドは、
  正規化された小文字の Base/EVM アドレスを使用します。
- `EvmAddressSchema` を使い、不正な形式は拒否してください。

## 8. Scope ポリシー

レスポンス envelope には次を含める場合があります。

- `providerId`
- `network`
- `asset`
- `payTo`

省略された場合、ペイロードは有効なグローバル／デモデータです。

scope フィールドが存在しない状態を根拠に、隠れた provider スコープを
主張してはいけません。

## 9. 移行チェックリスト

- デモフィクスチャは明示的かつ決定論的に保つ。
- スナップショットの安定性のため、`generatedAt` を決定論的に維持する。
- `provenance` と必要に応じて `provenanceByField` で、混在フィールドに
  provenance 付与を追加する。
- 不明な場合は nullable label（`label: null`）を明示的に含める。
- 新規生成デモペイロードと移行アダプターの数値レガシーフィールドでは
  ISO タイムスタンプを使用する。
