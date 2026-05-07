# Machine payment routes P0 要件メモ

## 背景

- Flovia を `x402` 専用 analytics ではなく、machine-payment API の route / rail / workflow analytics layer として見せる。
- 目的は「流入元を完全特定する」ことではなく、payment context と API Provider 側 usage context を join し、どの route / rail / workflow が継続的な API 需要を生んだかを可視化すること。
- 既存の x402 / onchain データは捨てず、`x402` を machine payment rail の一種として扱う。
- Demo Night では Stripe MPP / HitPay MPP / x402 を横断する narrative を優先し、実 ingestion の全面作り替えは避ける。

## P0 ゴール

1. 既存の x402 dashboard を visible product 上は `Machine Payment Routes` として再位置づける。
2. x402 / Stripe MPP / HitPay MPP を同じ route analytics model に載せる。
3. Sankey と KPI で `source route → payment rail → API workflow` の performance を見せる。
4. public onchain と provider-attested の違いを provenance / visibility として明示する。
5. 既存 x402 provider/customer drilldown は壊さず、互換 route と schema を残す。

## P0 で追加する概念

### Payment rail

最低限以下を扱う。

- `x402`
- `stripe_mpp`
- `hitpay_mpp`
- `api_key` / `subscription` は P0 では将来拡張扱いでもよい
- `other`

### Visibility / provenance

最低限以下を区別する。

- `public_onchain`: x402 / onchain tx hash で検証可能
- `provider_attested`: Stripe PaymentIntent、HitPay charge、MPP receipt など provider artifact に依存
- `first_party`: Provider 側 SDK / API log 由来
- `demo_label`: demo fixture / synthetic row
- `derived_insight`: 集計・推定

### Settlement reference

tx hash 前提をやめ、以下のような provider-agnostic reference にする。

- `onchain_tx`
- `stripe_payment_intent`
- `hitpay_charge`
- `provider_receipt`
- `session`

## P0 schema 要件

`packages/contracts/src/index.ts` に既存 schema を壊さず generic route analytics 用 schema を追加する。

候補フィールド:

- `routeId`
- `workflowId`
- `sessionId?`
- `rail`
- `protocol`: `x402` / `mpp` / `legacy` など
- `sourceRoute?`
- `sourcePlatform?`
- `router?`
- `providerId`
- `endpointGroup?`
- `useCase?`
- `payerIdentity?`
- `payeeIdentity?`
- `amountUsd?`
- `currency`
- `status`: `requested` / `paid` / `settled` / `failed` / `abandoned`
- `settlementRef?`
- `visibility`
- `provenance`
- `timestamp`
- `latencyMs?`

P0 では既存の `X402*` schema を削除しない。必要なら deprecated wrapper / alias として残す。

## P0 BFF 要件

対象候補:

- `apps/bff/src/http.ts`
- `apps/bff/src/data/analytics-source.ts`
- `apps/bff/src/data/projection-builder.ts`
- `apps/bff/src/data/postgres-live-read-model.ts`

### 追加する endpoint

最低限どちらか、可能なら両方を追加する。

- `GET /analytics/routes/summary`
- `GET /analytics/routes/sankey`

### projection 方針

- 既存 x402 / CoinGecko / payTo データは `rail = x402` として route analytics に変換する。
- Stripe MPP / HitPay MPP は P0 では sandbox capture または generated demo rows でもよい。
- `stripe_mpp` は `settlementRef.type = stripe_payment_intent` を想定する。
- `hitpay_mpp` は `settlementRef.type = hitpay_charge` または `provider_receipt` を想定する。
- `visibility` は x402 を `public_onchain`、Stripe / HitPay を `provider_attested` として表示する。

### P0 KPI

最低限以下を返せるようにする。

- route count
- paid workflow count
- settled USD
- success rate
- repeat usage または repeat calls
- payment → access conversion が作れるなら追加
- rail 別 count / revenue / repeat usage

## P0 frontend 要件

対象候補:

- `apps/frontend/lib/x402-analysis/types.ts`
- `apps/frontend/lib/x402-analysis/transform.ts`
- `apps/frontend/lib/x402-analysis/live-data.ts`
- `apps/frontend/components/x402/X402AnalysisDashboard.tsx`
- `apps/frontend/components/x402/X402SankeySection.tsx`
- `apps/frontend/components/x402/X402SankeyChart.tsx`
- `apps/frontend/lib/macro-metrics/route-sankey.ts`

### visible copy の変更

- `x402 analysis` → `Machine payment routes`
- `Settled USDC` → `Settled USD`
- `buyer wallet` → `payer identity`
- `seller wallet` → `provider / payee identity`
- `intermediary` → `rail / router / distribution route`
- `x402 provider URLs` → `machine-payment routes` または `paid API routes`

### Sankey の変更

既存 Sankey UI を再利用し、表示 layer を以下に寄せる。

- `source route`
- `payment rail`
- `API workflow` / `paid endpoint`

例:

```txt
Direct / Marketplace / MCP directory
  → x402 / Stripe MPP / HitPay MPP
  → Forecast API / Enrichment API / Research workflow
```

### UI 表示要件

- rail badge/filter を表示する。
- `x402`, `Stripe MPP`, `HitPay MPP` を横並びで比較できる。
- visibility badge を表示する。
  - `public onchain`
  - `provider attested`
  - `first party`
- tx hash がない Stripe / HitPay row を壊さない。

## P0 demo narrative

Demo では以下の主張に寄せる。

> Stripe and HitPay record machine payments. Flovia connects those payment receipts to API usage outcomes, showing which routes, rails, and workflows create retained API demand.

補助説明:

- x402 は public onchain settlement proof に強い。
- MPP は provider/session/payment lifecycle context に強い。
- Flovia は両方を同じ route analytics model に載せる。
- Flovia は complete attribution oracle ではなく、payment context と usage context を join する analytics layer。

## P0 でやらないこと

- 既存 x402 schema / route / UI の全面削除。
- frontend directory の大規模 rename。
- Postgres live table の全面 migration。
- Bitquery / Goldsky ingestion の作り直し。
- Stripe / HitPay を onchain tx として無理に表現すること。
- Stripe / HitPay の refund / dispute / chargeback lifecycle 実装。
- source attribution を 100% 自動特定できると主張すること。

## Acceptance criteria

- UI 上で `Machine payment routes` として表示される。
- x402 / Stripe MPP / HitPay MPP の rail が同じ dashboard または response に出る。
- Sankey が `source route → payment rail → API workflow` の構造で見える。
- `settled_usdc` だけでなく `settled USD` / multi-currency を許容する表現になっている。
- Stripe / HitPay の row に tx hash がなくても表示が壊れない。
- x402 row は `public_onchain`、Stripe / HitPay row は `provider_attested` として区別される。
- 既存 x402 provider/customer ページは互換維持される。
- `bun run verify` が通る。

## 推奨実装順

1. contracts に generic route analytics schema を追加する。
2. BFF projection に route analytics payload を追加する。
3. x402 既存データを `rail = x402` に変換する adapter を作る。
4. Stripe MPP / HitPay MPP の demo rows を追加する。
5. `/analytics/routes/summary` / `/analytics/routes/sankey` の少なくとも一方を追加する。
6. frontend の visible copy を `Machine payment routes` に寄せる。
7. Sankey layer を `source route → payment rail → API workflow` に変更する。
8. rail / visibility badge を表示する。
9. `bun run verify` で確認する。
