## Purpose

Market intelligence は CDP discovery resource と Bitquery payment activity を正規化・集計し、product read 用の snapshot / projection と report を提供する。

## Requirements

### 要件: CDP discovery resource を正規化する

システムは CDP x402 Discovery resource を取得し、各 resource と payment option をこの repository が所有する contract 型へ正規化することを MUST とする。

#### シナリオ: Base USDC payment option を持つ resource

- **条件** CDP resource が `resource`、`network`、`asset`、`amount`、`payTo` を持つ Base USDC payment option を含む
- **結果** システムは、それらの field と source provenance を含む正規化済み payment option を持つ resource を記録する

#### シナリオ: resource が未対応 network を含む

- **条件** CDP resource が要求された snapshot scope 外の network 向け payment option を含む
- **結果** システムは、正規化済み resource 自体は落とさず、その payment option を scoped Bitquery aggregation から除外する

### 要件: Bitquery payment activity を集計する

システムは、正規化済み payment option に一致する payment activity を Bitquery GraphQL に問い合わせ、要求された time window の aggregate transfer metrics を返すことを MUST とする。

#### シナリオ: payment option に観測済み transfer がある

- **条件** Bitquery が payment option の `network`、`asset`、`payTo` に対する transfer を返す
- **結果** システムは、その payment option の transaction count、unique sender count、payment volume、latest observed transfer metadata を報告する

#### シナリオ: payment option に観測済み transfer がない

- **条件** Bitquery が payment option に一致する transfer を返さない
- **結果** システムは snapshot build を失敗させず、その payment option の activity metrics を zero として報告する

### 要件: market snapshot は metadata と activity を結合する

システムは、正規化済み payment option identity によって CDP resource metadata と Bitquery transfer aggregate を結合した market snapshot を構築することを MUST とする。

#### シナリオ: CDP payment option が Bitquery aggregate に一致する

- **条件** 正規化済み payment option と Bitquery aggregate が同じ `network`、`asset`、`payTo` を共有する
- **結果** snapshot は resource、payment option、source quality field、activity metrics を1つの market resource entry に含める

#### シナリオ: CDP と Bitquery の metrics が一致しない

- **条件** CDP quality metrics と Bitquery activity metrics が大きく異なる
- **結果** snapshot はどちらかの source を上書きせず、両方の値を保持し、resource に discrepancy indicator を付ける

### 要件: CLI が market report を生成する

システムは、CDP と Bitquery data から JSON / Markdown market snapshot report を生成する CLI command を提供することを MUST とする。

#### シナリオ: snapshot command が成功する

- **条件** operator が有効な Bitquery credential で market snapshot command を実行する
- **結果** システムは JSON snapshot report と Markdown summary report を設定済み output path に書き出す

#### シナリオ: Bitquery credential がない

- **条件** operator が Bitquery data を必要とする snapshot を `BITQUERY_TOKEN` なしで実行する
- **結果** システムは明確な configuration error で失敗し、誤解を招く partial activity report を書き出さない

### 要件: BFF は request ごとに外部 source を呼ばない

初期 market intelligence design では、BFF request handler が product read のために CDP や Bitquery を直接呼ぶことを要求しない。Phase B の demo BFF では、Phase A snapshot / projection 相当の値を prepared demo fixture または read model として扱い、`onchain_fact` として説明できる field と demo / future / derived field を区別することを MUST とする。

#### シナリオ: product read path を後から追加する

- **条件** この change の後に BFF market intelligence endpoint を実装する
- **結果** endpoint は user request ごとに live Bitquery GraphQL call を発行せず、生成済み snapshot、projection、保存済み data、または prepared demo read model を読む

#### シナリオ: Phase B read model が Phase A 相当の値を含む

- **条件** Phase B BFF response が wallet、pay_to、payment frequency、co-usage など Phase A snapshot / projection 相当の値を含む
- **結果** システムはそれらを request path で再取得せず、prepared demo read model 内の `onchain_fact` として返す

### Requirement: CoinGecko payTo transaction facts を保存する

システムは CoinGecko の `payTo` に紐づく transaction を取得した場合、Phase B projection 生成に再利用できる transaction fact として保存することを MUST とする。

初期対象として、CDP Discovery snapshot で観測済みの Base USDC `payTo` `0x110cdbba7fe6434ec4ce3464cc523942ad6fb784` を扱う。capture は default 1000 transfers を要求し、明示 limit で 1000 件超も取得できる。取得できた件数を metadata として保存する。

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
- **THEN** 初期実装では `limit` の default は 1000 とし、明示 limit で 1000 件超も取得できる
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
