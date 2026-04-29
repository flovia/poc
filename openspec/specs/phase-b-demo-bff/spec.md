## Purpose

Phase B demo BFF は prepared demo fixture / read model から read-only product API response を返し、外部 source を request path で呼ばずに provenance を保持する。

## Requirements

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

#### Scenario: derived service candidate を返す

- **WHEN** customer intelligence response が x402 service candidate または cross-provider affinity insight を含む
- **THEN** システムは空でない reasons または evidence を含め、利用側が仮説の根拠を追跡できるようにする

#### Scenario: future SDK attribution が未実装である

- **WHEN** customer intelligence response が endpoint attribution、request sequence、correlation id に相当する値を扱う
- **THEN** システムはそれらを実 fact として返さず、未実装または future SDK telemetry 対象として区別する

### Requirement: BFF demo projection は real tx fact と mock attribution を分離する

システムは Phase B demo projection を生成するとき、real onchain transaction 由来の field と mock endpoint attribution 由来の field を区別することを MUST とする。

#### Scenario: projection が mixed provenance を保持する

- **WHEN** projection が `txHash`、`payerWallet`、`payTo`、`endpointPath`、`workflowLabel` を含む
- **THEN** `txHash`、`payerWallet`、`payTo` は `onchain_fact` として区別できる
- **THEN** `endpointPath` と `workflowLabel` は `demo_label` または `future_sdk_field` として区別できる

#### Scenario: endpoint attribution の根拠を追跡する

- **WHEN** projection が mock endpoint attribution を含む
- **THEN** response は endpoint attribution が mock であることを説明する `reasons` または equivalent evidence を保持する

### Requirement: BFF は generated Phase B projection を返す

システムは Phase B product endpoint に対して、real onchain transaction facts と mock endpoint attribution から生成済みの projection を read-only に返すことを MUST とする。

#### Scenario: customer list projection を返す

- **WHEN** client が `GET /customers` を呼び出す
- **THEN** システムは generated customer list projection を返す
- **THEN** response は `packages/contracts` の Phase B customer list schema で検証できる

#### Scenario: customer profile projection を返す

- **WHEN** client が `GET /customers/:address/profile` を呼び出す
- **THEN** システムは generated customer profile projection を返す
- **THEN** response は `packages/contracts` の Phase B customer profile schema で検証できる

#### Scenario: wallet usage graph projection を返す

- **WHEN** client が `GET /wallet-usage-graph` を呼び出す
- **THEN** システムは generated wallet usage graph projection を返す
- **THEN** response は `packages/contracts` の Phase B wallet usage graph schema で検証できる

### Requirement: BFF は read-only endpoint として振る舞う

システムは Phase B BFF endpoint を read-only とし、GET 以外の method で product read を変更しないことを MUST とする。

#### Scenario: 非 GET method を呼び出す

- **WHEN** client が Phase B product endpoint に対して POST、PUT、PATCH、DELETE のいずれかを呼び出す
- **THEN** システムは write operation を実行せず、read-only 方針に沿った error response を返す

### Requirement: BFF は request path で live source を呼ばない

システムは Phase B product endpoint の request handling 中に live CDP、Bitquery、Zerion、MCP、RPC、または SDK collector を呼び出さないことを MUST とする。

#### Scenario: product endpoint を呼び出す

- **WHEN** client が `GET /customers`、`GET /customers/:address/profile`、`GET /customers/:address/intelligence`、または `GET /wallet-usage-graph` を呼び出す
- **THEN** システムは生成済み projection / prepared demo fixture / read model から response を生成する
- **THEN** システムは external source request を発行しない

#### Scenario: intelligence endpoint を呼び出す

- **WHEN** client が `GET /customers/:address/intelligence` を呼び出す
- **THEN** システムは prepared customer intelligence read model から response を生成する
- **THEN** システムは external source request を発行しない

#### Scenario: raw attribution endpoint を呼び出す

- **WHEN** client が `/demo-data`、`/sdk-events`、`/telemetry`、または `/mock-attribution` を呼び出す
- **THEN** システムは Phase B product API として扱わず、not found response を返す
