## Context

Customer intelligence は現在、`portfolioSummary`、`defiPositions`、portfolio `sourceCoverage` を持つ prepared read model を生成できる。ただし portfolio source は未取得として表現されている。BFF は prepared JSON だけを読むため、live source access は CLI capture と source adapter に閉じる必要がある。

Zerion は wallet portfolio と DeFi position context を提供できるが、credential、rate limit、availability、scope ambiguity のリスクを増やす。そのため、この change では MCP や汎用 portfolio-source framework を追加せず、既存の customer intelligence capture path を狭く拡張する。

## Goals / Non-Goals

**Goals:**

- `packages/sources` に直接 Zerion HTTP source adapter を追加し、deterministic offline tests のために injected fetch を使えるようにする。
- Zerion portfolio data を `packages/intelligence` に渡す前に repository-owned summary / position DTO へ正規化する。
- `customer:intelligence` が任意で Zerion portfolio / DeFi data を generated read model JSON に含められるようにする。
- `sourceCoverage` で available、partial、unavailable、no-position outcome を明示的に保持する。
- `ZERION_API_KEY` は Zerion capture を明示的に有効化した場合だけ必須にする。
- default `bun run verify` を offline のまま維持する。

**Non-Goals:**

- この change では MCP abstraction を追加しない。
- BFF から live Zerion call を行わない。
- product payload に raw Zerion API response を公開しない。
- frontend UI は変更しない。
- 汎用 plugin framework、scheduler、cache、retry system は導入しない。
- Zerion が成功して空結果を返した場合を除き、Zerion capture failure を「DeFi activity なし」として扱わない。

## Decisions

### 1. MCP ではなく直接 Zerion adapter を使う

`packages/sources/zerion.ts` は既存の CDP / Bitquery source pattern に合わせ、直接 HTTP、normalized output、test 用 injected `FetchLike` を使う。

- 採用理由: 現在の repository と一貫しており、単純でテストしやすい。portfolio backend が複数ない段階で MCP を挟むと抽象化が早すぎる。
- 代替案: MCP-backed adapter。複数 portfolio provider や tool discovery が必要になった時点まで延期する。

### 2. 既存の customer intelligence response shape を維持する

public BFF response は引き続き `portfolioSummary`、`defiPositions`、`sourceCoverage`、`provenance`、`evidence`、`reasons` を使う。Zerion 固有情報は `sourceKind: "zerion"` や source name などの provenance で表現し、raw payload field は公開しない。

- 採用理由: BFF と client の shape を安定させつつ、source detail は追跡できる。
- 代替案: product payload に `zerion` section を追加する。provider 固有 shape が漏れ、将来の置き換えが難しくなるため採用しない。

### 3. Zerion は CLI capture の opt-in とする

`customer:intelligence` は Zerion なしでも valid output を生成し続ける。Zerion capture は `--portfolio-source zerion` などで明示的に有効化する。

- 採用理由: 既存の Bitquery / CDP capture path が `ZERION_API_KEY` を要求し始めないようにする。
- Zerion 有効時に key がない場合は configuration error とし、output write 前に失敗する。
- network / timeout / 429 / 5xx は、mandatory mode を別途作らない限り、明示的な unavailable / partial source coverage として扱う。

### 4. 「Zerion が positions なしを返した」と「Zerion が利用不能」を区別する

Zerion が成功 response として no positions を返した場合、read model は DeFi inactive と分類できる。Zerion が unavailable の場合は inactive と断定せず、portfolio coverage を unavailable または partial として表現する。

- 採用理由: customer intelligence が誤解を招くことを避ける。
- 代替案: error 時も empty positions として扱う。source failure を隠すため採用しない。

### 5. Wallet-wide data の scope を明示する

Zerion は all-chain / wallet-wide data を返す可能性がある一方、現在の customer intelligence scope は x402 payment 用の network / asset を含む。portfolio coverage は chain exposure を正規化するか、reasons で wallet-wide data であることを説明する。

- 採用理由: Base / USDC payment scope と portfolio scope の混同を防ぐ。

## Risks / Trade-offs

- [Risk] Zerion response shape が変わる → source boundary で正規化し、安定した repository-owned contract と fixtures で検証する。
- [Risk] credential leakage → `ZERION_API_KEY`、auth headers、raw request metadata を fixture に書き出さない。
- [Risk] rate limit や partial API failure → partial / unavailable source coverage を明示し、default verify は offline に保つ。
- [Risk] DeFi activity の過剰判定 → successful position facts からのみ active DeFi と分類し、failed source は inactivity と扱わない。
- [Risk] MCP / provider framework への scope creep → この change は direct Zerion adapter と customer intelligence integration に限定する。

## Migration Plan

1. provenance contract を拡張し、`zerion` source kind と必要な normalized portfolio source DTO を追加する。
2. Zerion fixture parse tests を追加し、`packages/sources/zerion.ts` を実装する。
3. `classifyDefiActivity()` の tests / implementation を更新し、available / partial / unavailable の Zerion normalized result を扱う。
4. optional Zerion capture 用の CLI option parse と orchestration を追加する。
5. mocked Zerion response を使った offline CLI flow tests を追加する。
6. demo Zerion fixture を含める場合は prepared fixture / docs を更新する。
7. root で `bun run verify` を実行し、default verification が offline のまま通ることを確認する。
8. `.env` の `ZERION_API_KEY` を使う explicit live command で対象 wallet の portfolio / DeFi 情報が取得できることを確認する。
9. live capture 結果を prepared fixture に反映する場合は、raw Zerion response、API key、auth header、request metadata を含めず、contract validation と BFF route test を offline で通す。

Rollback は、CLI option と source adapter wiring を外せばよい。BFF は read-only のままなので、既存 fixture の portfolio unavailable coverage を返し続けられる。

## Open Questions

- 初期 summary / position normalization で使う Zerion endpoint version と field はどれにするか？
- 初期実装で Zerion positions を network filter するか、それとも wallet-wide coverage として reasons に明示するか？
- Zerion failure は default で unavailable coverage として許容し、strict mode は後続で追加するか？
