## ADDED Requirements

### Requirement: BFF は Phase B customer intelligence を返す
システムは `GET /customers/:address/intelligence` に対して、指定 customer の prepared customer intelligence read model を read-only に返すことを MUST とする。

#### Scenario: 既知 customer の intelligence を取得する
- **WHEN** client が fixture に存在する customer address で `GET /customers/:address/intelligence` を呼び出す
- **THEN** システムは `200` を返し、customer intelligence response schema で検証できる payload を返す

#### Scenario: 未取得 customer の intelligence を取得する
- **WHEN** client が fixture に存在しない customer address で `GET /customers/:address/intelligence` を呼び出す
- **THEN** システムは `404` を返す

#### Scenario: customer address を正規化する
- **WHEN** client が mixed-case の EVM address で `GET /customers/:address/intelligence` を呼び出す
- **THEN** システムは lowercase normalized address で read model を検索する

### Requirement: Customer intelligence BFF は request path で live source を呼ばない
システムは `GET /customers/:address/intelligence` の request handling 中に live CDP、Bitquery、Zerion、MCP、RPC、または SDK collector を呼び出さないことを MUST とする。

#### Scenario: intelligence endpoint を呼び出す
- **WHEN** client が `GET /customers/:address/intelligence` を呼び出す
- **THEN** システムは prepared customer intelligence read model から response を生成する
- **THEN** システムは external source request を発行しない

### Requirement: Customer intelligence response は provenance を保持する
システムは customer intelligence response 内で `onchain_fact`、`derived_insight`、`demo_label`、`future_sdk_field` の違いを失わないことを MUST とする。

#### Scenario: derived service candidate を返す
- **WHEN** customer intelligence response が x402 service candidate または cross-provider affinity insight を含む
- **THEN** システムは空でない reasons または evidence を含め、利用側が仮説の根拠を追跡できるようにする

#### Scenario: future SDK attribution が未実装である
- **WHEN** customer intelligence response が endpoint attribution、request sequence、correlation id に相当する値を扱う
- **THEN** システムはそれらを実 fact として返さず、未実装または future SDK telemetry 対象として区別する
