## ADDED Requirements

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

### Requirement: BFF は live source を request path で呼ばない

システムは Phase B product endpoint の request handling 中に live CDP、Bitquery、RPC、または SDK collector を呼び出さないことを MUST とする。

#### Scenario: product endpoint を呼び出す

- **WHEN** client が Phase B product endpoint を呼び出す
- **THEN** システムは生成済み projection / fixture から response を返す
- **THEN** システムは external source request を発行しない

### Requirement: raw attribution endpoint は公開しない

システムは mock attribution fixture や SDK telemetry placeholder を raw endpoint として公開しないことを MUST とする。

#### Scenario: raw attribution endpoint を呼び出す

- **WHEN** client が `/demo-data`、`/sdk-events`、`/telemetry`、または `/mock-attribution` を呼び出す
- **THEN** システムは Phase B product API として扱わず、not found response を返す
