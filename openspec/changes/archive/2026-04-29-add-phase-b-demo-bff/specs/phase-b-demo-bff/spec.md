## ADDED Requirements

### Requirement: BFF は Phase B customer list を返す

システムは `GET /customers` に対して、Phase B canonical contract に従う customer list projection を read-only に返すことを MUST とする。

#### Scenario: customer list を取得する

- **WHEN** client が `GET /customers` を呼び出す
- **THEN** システムは `200` を返し、`generatedAt`、`generatedFrom`、`customerCount`、`customers`、`provenance` を含む envelope response を返す
- **THEN** response は `packages/contracts` の Phase B customer list schema で検証できる

#### Scenario: customer count が一覧件数と一致する

- **WHEN** client が `GET /customers` を呼び出す
- **THEN** response の `customerCount` は `customers.length` と一致する

### Requirement: BFF は Phase B customer profile を返す

システムは `GET /customers/:address/profile` に対して、指定 wallet の customer profile projection を read-only に返すことを MUST とする。

#### Scenario: 既知 wallet の profile を取得する

- **WHEN** client が fixture に存在する wallet address で `GET /customers/:address/profile` を呼び出す
- **THEN** システムは `200` を返し、`profile.identity`、`profile.metrics`、`profile.providers`、`profile.timeline`、`profile.insights` を含む response を返す
- **THEN** response は `packages/contracts` の Phase B customer profile schema で検証できる

#### Scenario: 未知 wallet の profile を取得する

- **WHEN** client が fixture に存在しない wallet address で `GET /customers/:address/profile` を呼び出す
- **THEN** システムは `404` を返す

### Requirement: BFF は Phase B wallet usage graph を返す

システムは `GET /wallet-usage-graph` に対して、payer/provider co-usage を表す nested wallet usage graph projection を read-only に返すことを MUST とする。

#### Scenario: wallet usage graph を取得する

- **WHEN** client が `GET /wallet-usage-graph` を呼び出す
- **THEN** システムは `200` を返し、`graph.providerWallets[].payerWallets[]` に edge / evidence の関係を保持した response を返す
- **THEN** response は `packages/contracts` の Phase B wallet usage graph schema で検証できる

### Requirement: demo と future SDK 想定値は product API response に内包する

システムは demo label と future SDK telemetry 想定値を raw endpoint として公開せず、Phase B product API の projection 内に含めることを MUST とする。

#### Scenario: future SDK field を profile に含める

- **WHEN** customer profile response が endpoint usage、workflow、use case、request path 相当の値を含む
- **THEN** システムはその値を `future_sdk_field` または `demo_label` として区別できる provenance metadata とともに返す

#### Scenario: raw demo endpoint は提供しない

- **WHEN** client が `/demo-data`、`/sdk-events`、または `/telemetry` を呼び出す
- **THEN** システムは Phase B 初回実装では product API として扱わず、既存の not found response を返す

### Requirement: BFF response は provenance を保持する

システムは `onchain_fact`、`demo_label`、`future_sdk_field`、`derived_insight` の違いを response 上で失わないことを MUST とする。

#### Scenario: derived insight を返す

- **WHEN** response が `derived_insight` の値または object を含む
- **THEN** システムは空でない `reasons` を含め、利用側が仮説の根拠を追跡できるようにする

#### Scenario: mixed object を返す

- **WHEN** object 内に onchain fact と demo / future / derived の値が混在する
- **THEN** システムは必要に応じて `provenanceByField` を含め、field 単位の出所を区別できるようにする

### Requirement: BFF は read-only endpoint として振る舞う

システムは Phase B BFF endpoint を read-only とし、GET 以外の method で product read を変更しないことを MUST とする。

#### Scenario: 非 GET method を呼び出す

- **WHEN** client が Phase B product endpoint に対して POST、PUT、PATCH、DELETE のいずれかを呼び出す
- **THEN** システムは write operation を実行せず、read-only 方針に沿った error response を返す

### Requirement: BFF は request path で live source を呼ばない

システムは Phase B product endpoint の request handling 中に live CDP、Bitquery、RPC、または SDK collector を呼び出さないことを MUST とする。

#### Scenario: product endpoint を呼び出す

- **WHEN** client が `GET /customers`、`GET /customers/:address/profile`、または `GET /wallet-usage-graph` を呼び出す
- **THEN** システムは prepared demo fixture / read model から response を生成する
- **THEN** システムは external source request を発行しない
