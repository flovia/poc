## ADDED Requirements

### Requirement: CoinGecko payTo transaction facts を保存する

システムは CoinGecko の `payTo` に紐づく transaction を取得した場合、Phase B projection 生成に再利用できる transaction fact として保存することを MUST とする。

初期対象として、CDP Discovery snapshot で観測済みの Base USDC `payTo` `0x110cdbba7fe6434ec4ce3464cc523942ad6fb784` を扱う。初期 capture は最大 1000 transfers を要求し、取得できた件数を metadata として保存する。

#### Scenario: transaction fact を保存する

- **WHEN** source が CoinGecko `payTo` に一致する transaction を取得する
- **THEN** システムは `txHash`、`payerWallet`、`payTo`、`amount`、`asset`、`network`、`timestamp` を保存する
- **THEN** 保存された fact は `onchain_fact` として扱える

#### Scenario: capture metadata を保存する

- **WHEN** source が CoinGecko `payTo` に一致する transfer list を取得する
- **THEN** システムは `requestedLimit`、`capturedCount`、`timeWindow`、`source` を metadata として保存する
- **THEN** `capturedCount` が `requestedLimit` 未満でも、取得済み facts が schema を満たす場合は有効な fixture として扱う

#### Scenario: request path では取得しない

- **WHEN** BFF product endpoint が呼び出される
- **THEN** システムは CoinGecko transaction fact を live source から取得しない

### Requirement: sources package は payTo transfer list を取得する

システムは `packages/sources` の source adapter として、指定された `network`、`asset`、`payTo` に一致する transfer list を取得できることを MUST とする。

#### Scenario: payTo transfer list を最大 1000 件取得する

- **WHEN** caller が `network`、`asset`、`payTo`、time window、limit を指定して transfer list を要求する
- **THEN** source adapter は `txHash`、`sender`、`recipient`、`amountAtomic`、`blockNumber`、`blockTimestamp` を含む transfer facts を返す
- **THEN** 初期実装では `limit` の default / max は 1000 とする
- **THEN** 返された transfer facts は projection generation の `onchain_fact` として扱える

#### Scenario: source pagination を扱う

- **WHEN** source API が一度に 1000 件を返せない
- **THEN** source adapter は source API の制約に従って pagination し、最大 1000 件まで transfer facts を取得する
- **THEN** pagination 後の実取得件数を `capturedCount` として記録する

#### Scenario: aggregate と transfer list の責務を分ける

- **WHEN** caller が market snapshot aggregate を要求する
- **THEN** システムは既存の aggregate response を維持する
- **WHEN** caller が Phase B projection 用の transaction facts を要求する
- **THEN** システムは aggregate ではなく transfer list response を返す

### Requirement: mock attribution は txHash で transaction fact に join する

システムは Phase B projection 生成時に、mock endpoint attribution を `txHash` で real transaction fact に join することを MUST とする。

#### Scenario: txHash が一致する attribution を join する

- **WHEN** transaction fact と mock attribution item が同じ `txHash` を持つ
- **THEN** projection builder は onchain fields と endpoint attribution fields を同じ projection record に結合する
- **THEN** onchain fields と attribution fields の provenance を混同しない

#### Scenario: txHash が一致しない attribution を扱う

- **WHEN** mock attribution item の `txHash` が transaction facts に存在しない
- **THEN** projection builder は schema validation または明確な generation error で失敗する

### Requirement: projection generation は offline verification と分離する

システムは live source を必要とする transaction capture と、offline verification 可能な projection validation を分離することを MUST とする。

#### Scenario: offline verify を実行する

- **WHEN** operator が `bun run verify` を実行する
- **THEN** システムは保存済み fixture / projection と contract validation を使って検証する
- **THEN** live CDP、Bitquery、RPC、または external service call を要求しない
