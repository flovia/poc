# Flovia PoC のあるべき姿

この文書は、`docs/overview.md`、`../poc-frontend/docs/vision`、現行 `apps/cli` / `packages` / `apps/bff` の実装構成をもとに、PoC と repository の目指す姿を再定義するものです。

## 1. PoC の再定義

Flovia PoC は、x402 payment ecosystem を **onchain-first に観測し、API provider が自分の顧客 wallet と周辺利用を理解するための market intelligence product** です。

PoC では、この構想を次のように段階化します。

```text
PoC scope
  Phase A: data foundation
    apps/cli + packages で market snapshot / intelligence 基盤を作る

  Phase B: demo BFF
    demo data / snapshot / projection を BFF が返し、
    frontend で partner desire に沿った product 体験を検証する

Future scope
  Phase C: SDK telemetry integration
    provider middleware で API request telemetry を取得し、
    onchain settlement と紐付ける
```

つまり、今の PoC は SDK telemetry 統合そのものではなく、**Phase A の data foundation と Phase B の demo BFF によって、SDK 統合後に成立させたい product 体験を先に検証するもの** と位置付けます。SDK telemetry 統合は Phase C 以降の将来拡張です。

## 2. Product としてのあるべき姿

### 2.1 Core value

Flovia が提供する価値は、API provider に対して次を見せることです。

- 自分の `pay_to` / recipient に支払っている payer wallet は誰か
- その payer wallet は他にどの x402-like product / recipient / provider candidate を使っているか
- どの settlement pattern、relayer、facilitator、middleman candidate が使われているか
- 自社顧客と他 product の co-usage から、どの wallet が upsell / partnership / retention signal を持つか
- onchain だけで言えることと、SDK telemetry が必要なことを confidence 付きで分離すること

### 2.2 Partner demo goal

この PoC は、partner に product vision を見せるための demo です。partner から受け取った desire は次です。

```text
where the user is coming from, and use case if possible
what endpoints they use and the frequency

why this matters:
  know what source / medium to double down on for GTM or marketing
  know what use case / endpoint is most suitable for x402 / Agents
  improve the API or x402 offerings
```

したがって Phase B の demo BFF / frontend では、実データとして endpoint telemetry を取得できていなくても、**partner が見たい意思決定体験**を demo data で表現します。

| Partner が見たいもの | Phase B demo での表現 | 実データ化に必要なもの |
| --- | --- | --- |
| where user is coming from | source / medium candidate、referrer-like label、campaign-like label を demo data として表示 | SDK telemetry、provider attribution data、referrer / campaign metadata |
| use case | workflow / use case candidate を demo label として表示 | request path、resource、request context、provider-side event |
| endpoints they use | endpoint candidate と usage frequency を demo projection として表示 | SDK middleware による endpoint-level request telemetry |
| frequency | payment frequency / wallet activity は data foundation で表現し、endpoint frequency は demo label として表現 | onchain frequency + SDK request frequency |
| GTM / marketing double-down | source / medium × payer quality × co-usage の仮説を表示 | attribution data と conversion / usage data |
| suitable endpoint / use case for x402 / Agents | endpoint / use case ranking を demo insight として表示 | endpoint usage、payment conversion、agent/workflow signal |

重要なのは、Phase B で **partner desire に対する product answer を見せる**ことです。一方で、source / medium、endpoint usage、use case attribution は onchain-only では取得できないため、PoC 内では `demo label` または `future SDK telemetry field` と明示します。

### 2.3 PoC で守る制約

PoC は、最初からすべてを実データで解決しません。

- HTTP telemetry は現時点では前提にしない
- BFF は request ごとに live CDP / Bitquery / RPC を叩かない
- BFF は prepared demo data、snapshot、projection を返す read-only product API とする
- endpoint / workflow / agent type / plan / MRR などは demo label または future SDK field として扱う
- onchain-only で確信できるものと、推定・演出・将来拡張を明確に分ける

### 2.4 Product narrative

デモで伝えるべき物語は、従来の「一般的な API analytics」ではなく、次の流れです。

```text
1. API provider が自社の pay_to を登録する
2. Flovia が payer wallet と settlement activity を検出する
3. 顧客 wallet 一覧から、重要 wallet を選ぶ
4. Wallet 360° で、その wallet の支払い履歴と co-usage を見る
5. Patterns で、自社顧客が他に使う product cluster を俯瞰する
6. provider は、source / medium、use case、endpoint frequency、retention / upsell / partnership の仮説を得る
```

旧 vision の 4 画面構成は維持します。

| 画面　　　　　　　| 役割　　　　　　　　　　　| 現 PoC での位置付け　　　　　　　　　　　　　　　　　　　　　 |
| -------------------| ---------------------------| ---------------------------------------------------------------|
| Setup　　　　　　 | provider の `pay_to` 登録 | demo data の entry point。将来は SDK / provider config と接続 |
| My Customers　　　| payer wallet 一覧　　　　 | BFF demo API から返す customer projection を表示　　　　　　　|
| Wallet 360°　　　 | wallet 単位の理解　　　　 | timeline / co-usage / insight を主役化　　　　　　　　　　　　|
| Co-usage Patterns | market 俯瞰　　　　　　　 | payer overlap と product candidate cluster を可視化　　　　　 |

## 3. BFF のあるべき姿

### 3.1 役割

BFF は frontend demo のための **product API boundary** です。

現時点の BFF は最小 HTTP app ですが、あるべき姿では次を担います。

- frontend が直接 `apps/cli` や `packages/sources` に依存しないための境界
- demo data / generated snapshot / projection の read-only 配信
- UI が必要とする shape への変換
- live source と demo source を差し替え可能にする adapter 境界
- 将来 SDK telemetry が入った後も壊れにくい API contract の維持

### 3.2 BFF がしないこと

BFF は collector でも batch job runner でもありません。

- user request ごとに CDP / Bitquery / RPC を呼ばない
- heavy aggregation や scoring を request path に置かない
- `apps/cli` の内部実装を import しない
- source-specific DTO をそのまま frontend に漏らさない
- write operation を持たない

### 3.3 BFF data source

当面は demo data を返します。

```text
prepared demo dataset
  -> BFF read model / projection
  -> /customers
  -> /customers/:address/profile
  -> /wallet-usage-graph
  -> /patterns
```

将来は CLI が生成した snapshot、永続化 projection、SDK telemetry を取り込んだ read model に差し替えます。

```text
apps/cli batch output
  -> snapshot / projection store
  -> apps/bff read-only API
  -> frontend
```

## 4. Data foundation のあるべき姿

データ収集基盤は一掃され、現在は `apps/cli` と `packages` に再構築されています。この方向を repository の標準とします。

```text
apps/cli
  -> packages/sources
  -> packages/contracts
  -> packages/intelligence
  -> JSON / Markdown report
```

### 4.1 packages の責務

| Package                 | 責務　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 | 持たない責務　　　　　　　　　　　 |
| -------------------------| --------------------------------------------------------------------------| ------------------------------------|
| `packages/contracts`    | Zod schema、TypeScript 型、正規化 helper、DTO contract　　　　　　　　　 | source fetch、ranking、UI shape　　|
| `packages/sources`      | CDP Discovery、Bitquery、pagination、response parse、contract への正規化 | scoring、ranking、product decision |
| `packages/intelligence` | scope filtering、join、active 判定、ranking、discrepancy、snapshot 生成　| external API call、HTTP serving　　|

### 4.2 apps の責務

| App        | 責務　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| ------------| ------------------------------------------------------------------------------|
| `apps/cli` | batch orchestration、引数処理、sources と intelligence の接続、report 出力　 |
| `apps/bff` | read-only product API、demo data / projection 配信、frontend 向け shape 変換 |

### 4.3 依存方向

依存方向は固定します。

```text
apps/cli ─┐
          ├──▶ packages/*
apps/bff ─┘

packages/sources ─────▶ packages/contracts
packages/intelligence ▶ packages/contracts
```

禁止事項は次です。

- `packages/*` から `apps/*` への import
- `packages/sources` から `packages/intelligence` への import
- `packages/intelligence` から `packages/sources` への import
- `apps/bff` から `apps/cli` への import
- frontend / BFF が external source implementation に直接依存すること

## 5. Data model の再整理

### 5.1 現 PoC で扱う data layers

```text
source facts
  CDP resource / payment option
  Bitquery payTo aggregate
  future onchain observation

normalized contracts
  network
  asset
  payTo
  aggregate
  market snapshot

intelligence projections
  active resources
  top resources
  top payment options
  discrepancy
  customer wallet projection
  wallet profile projection
  co-usage graph projection

product API shapes
  customers
  wallet 360 profile
  usage graph
  patterns
```

### 5.2 将来 SDK telemetry で増える data

SDK / middleware integration は将来層です。追加される情報は onchain data と区別して扱います。

```text
provider_id
api_request_id
request_time
request_host
request_path
resource
agent_type_candidate
workflow_label
response_status
payment_header
settlement_tx_hash
pay_to
payer
```

これにより、現在は demo / weak inference でしか表現できない次が強くなります。

- endpoint attribution
- workflow sequence
- agent type inference
- activation / retention loop
- provider-specific funnel
- plan / monetization context

## 6. Repository のあるべき姿

### 6.1 原則

- contract-first にする
- source adapter と intelligence logic を分離する
- CLI は batch orchestration、BFF は read API に限定する
- demo data は再生成可能な fixture / seed として管理する
- generated reports、DB、`.env`、`dist` は repository に含めない
- live verification は通常の `verify` に混ぜない
- import boundary は prompt ではなく script / linter / ast-grep で検査する

### 6.2 推奨構成

```text
docs/
  overview.md
  desired-state.md
  api-contract.md                # BFF contract を置く場合
  demo-data.md                   # demo dataset の意味論を置く場合

packages/
  contracts/
  sources/
  intelligence/

apps/
  cli/
    scripts/analytics/
    tests/
    reports/                     # generated, git ignored

  bff/
    src/
      http.ts
      server.ts
      routes/                    # endpoint が増えたら分離
      data/                      # demo read model adapter
      projections/               # UI 向け変換
    tests/
```

### 6.3 BFF 拡張時の順序

BFF は実装を急いで太らせず、次の順で拡張します。

1. frontend が必要な API contract を `packages/contracts` または `apps/bff` 内の境界として定義する
2. demo dataset の fixture を用意する
3. BFF route は fixture / projection を read-only に返す
4. frontend の 4 画面が demo flow を完走できるようにする
5. CLI snapshot から同じ projection を生成できるか検証する
6. SDK telemetry が入る場合は、新 source として追加し、既存 projection contract を壊さない

## 7. PoC scope の再定義

### 7.1 今やること

- `apps/cli` と `packages` による market snapshot pipeline を安定させる
- BFF に demo data read model を追加する
- frontend vision の 4 画面に必要な API shape を返す
- Wallet 360° と Co-usage Patterns を demo の主役にする
- onchain-only / demo label / future SDK field の区別を文書化する

### 7.2 今やらないこと

- BFF request path での live CDP / Bitquery / RPC call
- SDK middleware の本実装
- endpoint / workflow / MRR の実データ推定
- Solana parser
- provider dashboard の認証・課金・本番 multi tenant 化

### 7.3 将来やること

- SDK / middleware で API request と settlement tx を紐付ける
- generated snapshot を BFF read model に変換する
- onchain observation、catalog join、payer wallet profile を強化する
- confidence scoring を UI に明示する
- provider-specific customer intelligence に拡張する

## 8. 成功条件

PoC としての成功条件は次です。

- frontend demo が 3 分で product value を説明できる
- BFF が demo data によって 4 画面を安定して支える
- data foundation が `contracts / sources / intelligence` に分離されている
- `bun run verify` が offline で通る
- live source の有無に関係なく、demo と tests が再現可能である
- onchain-only で言えること、demo data で演出していること、SDK telemetry が必要なことが混ざらない

## 9. 一文での位置付け

Flovia PoC は、SDK telemetry 統合後の provider intelligence product を見据えつつ、現段階では **再構築した CLI/packages data foundation と BFF demo data によって、payer wallet co-usage と x402 market intelligence の体験価値を検証する PoC** である。
