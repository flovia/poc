## ADDED Requirements

### Requirement: Customer intelligence contract を提供する
システムは customer address を起点にした intelligence response contract を提供し、customer identity、capture scope、x402 service candidates、payTo activities、portfolio summary、DeFi positions、insights、provenance、reasons を表現できることを MUST とする。

#### Scenario: valid customer intelligence response を検証する
- **WHEN** customer intelligence read model が `customerAddress`、`scope`、`x402Services`、`payToActivities`、`portfolioSummary`、`defiPositions`、`insights`、`provenanceByField`、`reasons` を含む
- **THEN** response は `packages/contracts` の customer intelligence schema で検証できる

#### Scenario: capture scope を保持する
- **WHEN** customer intelligence read model が CLI capture から生成される
- **THEN** response は normalized lowercase customer address、network、asset、time window を metadata として保持する

### Requirement: x402 service candidate は evidence と confidence を保持する
システムは customer の outgoing payment fact と payment option metadata から x402 service candidate を作る場合、candidate を derived insight として扱い、confidence、reasons、evidence を保持することを MUST とする。

#### Scenario: payTo が CDP payment option に一致する
- **WHEN** customer の outgoing transfer recipient が CDP payment option の `payTo`、network、asset と一致する
- **THEN** システムは service candidate に payment option identity、observed transfer metrics、confidence、evidence を含める

#### Scenario: service identity が確定できない
- **WHEN** outgoing transfer は存在するが CDP payment option metadata に一致しない
- **THEN** システムは確定 service name を捏造せず、payTo activity evidence と unresolved reason を保持する

### Requirement: payTo activity を customer 起点で集計する
システムは customer address の outgoing transfer fact を payTo、network、asset、time window で集計し、transaction count、spend amount、latest activity、tx evidence を返すことを MUST とする。

#### Scenario: 同一 payTo に複数 payment がある
- **WHEN** customer が同じ network / asset / payTo に複数回支払っている
- **THEN** システムは payTo activity を一つに集計し、count、total amount、latest timestamp、tx hash evidence を保持する

#### Scenario: time window 外の payment がある
- **WHEN** outgoing transfer が capture time window 外にある
- **THEN** システムはその transfer を該当 read model の payTo activity aggregation から除外する

### Requirement: portfolio / DeFi context は source coverage を表現する
システムは portfolio summary と DeFi positions を customer intelligence response に含める場合、raw source fact と derived classification を区別し、source coverage または unavailable reason を表現することを MUST とする。

#### Scenario: portfolio source が取得済み
- **WHEN** portfolio source が token balance または DeFi position fact を返す
- **THEN** response は portfolio summary、DeFi positions、source provenance、derived DeFi activity classification を区別して返す

#### Scenario: portfolio source が未取得
- **WHEN** portfolio / DeFi source が capture されていない、または利用できない
- **THEN** response は BFF request path で live source を呼ばず、section の unavailable reason または source coverage を返す

### Requirement: CLI は customer intelligence read model を生成する
システムは customer address、network、asset、time window、output path を受け取り、external source fact を取得し、customer intelligence read model JSON を生成する CLI capture command を提供することを MUST とする。

#### Scenario: capture command が成功する
- **WHEN** operator が有効な source configuration と output path で customer intelligence capture command を実行する
- **THEN** システムは customer intelligence fixture / read model JSON を出力し、contract validation に成功する

#### Scenario: 必須 credential がない
- **WHEN** operator が live source capture に必要な credential なしで command を実行する
- **THEN** システムは明確な configuration error で失敗し、誤解を招く partial read model を成功扱いで書き出さない

### Requirement: Default verification は offline を維持する
システムは customer intelligence の live source capture を通常の verify path に混ぜず、default verification を offline で再現可能に保つことを MUST とする。

#### Scenario: root verify を実行する
- **WHEN** developer が root で `bun run verify` を実行する
- **THEN** システムは live Bitquery、CDP、Zerion、MCP、RPC access を要求せず、fixture / unit / route test に基づいて検証できる

#### Scenario: live source を検証する
- **WHEN** operator が live customer intelligence capture を検証する
- **THEN** システムは default verify とは別 command で credential と external source availability を要求する
