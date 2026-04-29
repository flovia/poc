# Phase B デモデータポリシー

このドキュメントでは、Phase B のレスポンス向けにデモデータと provenance ラベルを
どのように作成・管理するかを定義します。

## 1. Canonical 契約ポリシー

Phase B のデモレスポンスは、`docs/phase-b/api-contract.md` で定義された
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

## 4. Endpoint attribution gap

Phase B demo では、CoinGecko のような API provider に対して、顧客 wallet の利用状況や
co-usage pattern を見せます。

理想的には、provider の各 endpoint への request と、その request に紐づくオンチェーン決済
transaction を対応付けることで、endpoint 単位の利用分析を行います。

ただし、現時点では SDK / middleware が未実装であり、利用できる実データは主にオンチェーン
transaction だけです。

### 4.1 問題

CoinGecko には demo 上で扱いたい endpoint が複数あります。

現在の demo で扱う CoinGecko x402 endpoint は次の 5 つです。

```text
GET /api/v3/x402/onchain/simple/networks/{id}/token_price/{address}
GET /api/v3/x402/onchain/search/pools
GET /api/v3/x402/onchain/networks/{id}/trending_pools
GET /api/v3/x402/onchain/networks/{id}/tokens/{address}
GET /api/v3/x402/simple/price
```

しかし、これらの endpoint に対する支払いが同じ `payTo` に集約される場合、public/onchain data
だけでは、どの transaction がどの endpoint request に対応しているかを判定できません。

```text
endpoint A ┐
endpoint B ┤
endpoint C ├── same payTo
endpoint D ┤
endpoint E ┘
```

### 4.2 オンチェーンだけで分かること

- payer wallet
- recipient / `payTo`
- transaction hash
- amount
- asset
- network
- timestamp
- payment activity / payment frequency
- provider-level spend

### 4.3 オンチェーンだけでは分からないこと

- どの endpoint を叩いたか
- どの request がどの transaction に対応するか
- endpoint usage frequency
- workflow / use case
- request sequence
- endpoint-level attribution
- endpoint-level retention / upsell signal

### 4.4 理想型

最終的な product では、SDK を middleware 的に導入し、API request と payment transaction を
紐づけます。

```text
user / agent
  └─ request provider endpoint
       ├─ path
       ├─ method
       ├─ request timestamp
       ├─ provider
       ├─ wallet / customer context
       └─ payment intent / correlation id
            │
            ▼
      onchain transaction
       ├─ tx hash
       ├─ payer wallet
       ├─ payTo
       ├─ amount
       ├─ asset
       ├─ network
       └─ block timestamp
```

この状態では、wallet ごとの endpoint usage、endpoint ごとの利用頻度、request sequence、
workflow、retention / upsell / partnership insight を実データとして分析できます。

### 4.5 Phase B demo での仮置き

Phase B では frontend demo の意思決定体験を成立させるため、endpoint attribution を
mock / demo label として補います。

具体的には、次のような仮置きを用意します。

- `txHash -> endpointPath` の mock attribution
- `endpointPath -> workflowLabel` の demo label
- endpoint usage frequency の仮集計
- request sequence / agent behavior の仮ストーリー
- retention / upsell / partnership insight の仮説

ただし、これらは実データではありません。BFF response 上では `demo_label`、
`future_sdk_field`、または `derived_insight` として明示してください。

### 4.6 レイヤー分離

Phase B demo data は、次の 3 レイヤーを混ぜずに管理します。

```text
real onchain layer
  - tx hash
  - payer wallet
  - payTo
  - amount
  - asset
  - network
  - timestamp

mock attribution layer
  - endpoint path
  - endpoint name
  - workflow label
  - request sequence
  - endpoint usage count

derived demo insight layer
  - retention hypothesis
  - upsell candidate
  - partnership opportunity
  - co-usage story
```

この分離により、demo 上では endpoint-level insight を見せつつ、「オンチェーンだけで endpoint が
分かる」と誤解されることを避けます。

### 4.7 将来の SDK 置き換え

将来 SDK / middleware を導入した場合、mock attribution layer は実 telemetry に置き換えます。

想定される telemetry は次の通りです。

- request id
- provider id
- endpoint path
- method
- request timestamp
- wallet / customer context
- payment intent id
- tx hash
- correlation id
- request metadata

置き換え後は、`endpointPath` や `endpointUsageFrequency` を demo label ではなく、SDK 由来の
実データとして扱えるようになります。

### 4.8 現時点の設計結論

現在の BFF が deterministic demo read model を返すのは、Phase B demo を成立させるための
仮置きです。

ただし、今の demo read model は Phase A snapshot から生成されておらず、BFF runtime も
Phase A の `sources` / `intelligence` を呼んでいません。

そのため、次の段階では以下を明確に分ける必要があります。

1. Phase A 由来の onchain facts
2. Phase B demo 用の mock endpoint attribution
3. 将来 SDK に置き換える future telemetry fields
4. それらを組み合わせた derived insights

### 4.9 実装済み capture / projection flow

現時点の CoinGecko Base USDC 観測値は次の通りです。

```text
payTo: 0x110cdbba7fe6434ec4ce3464cc523942ad6fb784
transactionCount: 628
uniqueSenderCount: 75
latestTxHash: 0x6248880ec36541e6783ab756afdb427939f6209551b751cec5a2c97f71176d94
latestSender: 0xac5a07c44a4f971667b3df4b6551fb6991b2142d
latestBlockTimestamp: 2026-04-29T04:11:53Z
```

現在の fixture capture は 2026-01-01 から 2026-04-29 までを対象に、`requestedLimit: 5000` で 1908 件の unique valid transaction facts を保存しています。

実装上のファイル配置は次の通りです。

- `packages/sources/src/bitquery.ts`
  - `fetchPaymentTransfersByPayTo()` が `network`、`asset`、`payTo`、time window、limit を受け取り、Bitquery の transfer list を pagination しながら取得します。default limit は 1000 件で、明示 limit では 1000 件超も許可します。
- `apps/bff/fixtures/phase-a/coingecko-transactions.json`
  - real onchain transaction fact fixture です。
  - `txHash`、`payerWallet`、`payTo`、`amount`、`asset`、`network`、`timestamp` は `onchain_fact` として扱います。
  - `requestedLimit`、`capturedCount`、`timeWindow`、`source` を metadata として保持します。
- `apps/bff/fixtures/phase-b/mock-attribution.json`
  - `txHash -> endpointPath / endpointName / workflowLabel` の mock attribution fixture です。
  - 現在は real transaction fact 全件に対して、5 endpoint を deterministic に割り当てています。
  - endpoint / workflow は `demo_label` または `future_sdk_field` として扱います。
- `apps/bff/src/data/projection-builder.ts`
  - real tx fact と mock attribution を `txHash` で join し、Phase B customer list / profile / wallet usage graph projection を生成します。
  - 生成結果は `packages/contracts` の Phase B validator で検証されます。

fixture を再生成する正式 command は次です。

```sh
bun --cwd apps/cli coingecko:transactions -- \
  --from 2026-01-01T00:00:00Z \
  --to 2026-04-29T23:59:59Z \
  --limit 5000 \
  --page-size 100
```

この command は live Bitquery を使うため、offline verification 用の `bun run verify` には含めません。

BFF request path では CDP、Bitquery、RPC、SDK collector を呼びません。保存済み fixture から生成された projection のみを read-only に返します。

## 5. フィールドレベルの provenance

複合オブジェクト（事実ベースと推定／デモ値が混在するもの）では:

- 利用側でフィールド単位の区別が必要な場合、
  `provenanceByField: Record<string, DataProvenance>` を追加します。
- トップレベル `provenance` は集約された source 判定として保持します。

対象例は、顧客一覧アイテム、プロフィール identity/metrics/provider エントリ、
グラフの入れ子ノードです。

## 6. Evidence / reason ポリシー

- `reasons` / `evidence` の各項目は `EvidenceLabel` の形に一致している必要があります。
  - `provenance` は許可された値のみ
  - `label` は空でないこと
  - `description` は任意
  - `sourceFields` は任意
- デモフィールドと機密性が高い derived フィールドには、実務上可能なら
  `reasons` / `evidence` を含めます。
- `derived_insight` では `reasons` は非空である必要があります。

## 7. Atomic 金額ポリシー

Atomic 単位で表現される金額は、すべて次を満たす必要があります。

- 文字列
- 数字のみ (`^[0-9]+$`)

以下に適用します。

- `spendAtomic`
- `totalSpendAtomic`
- `averageSpendAtomic`
- `sharedSpendAtomic`

`-`、`+`、小数点、桁区切りカンマは無効で、拒否対象です。

## 8. アドレスポリシー

- Phase B 契約の `address`、`payToWallet`、`payTo` フィールドは、
  正規化された小文字の Base/EVM アドレスを使用します。
- `EvmAddressSchema` を使い、不正な形式は拒否してください。

## 9. Scope ポリシー

レスポンス envelope には次を含める場合があります。

- `providerId`
- `network`
- `asset`
- `payTo`

省略された場合、ペイロードは有効なグローバル／デモデータです。

scope フィールドが存在しない状態を根拠に、隠れた provider スコープを
主張してはいけません。

## 10. 移行チェックリスト

- デモフィクスチャは明示的かつ決定論的に保つ。
- スナップショットの安定性のため、`generatedAt` を決定論的に維持する。
- `provenance` と必要に応じて `provenanceByField` で、混在フィールドに
  provenance 付与を追加する。
- 不明な場合は nullable label（`label: null`）を明示的に含める。
- 新規生成デモペイロードと移行アダプターの数値レガシーフィールドでは
  ISO タイムスタンプを使用する。
- endpoint attribution はオンチェーン fact と混ぜず、mock attribution layer として
  分離する。
- `txHash -> endpointPath` の仮紐づけは、将来 SDK telemetry で置き換える前提を明示する。
