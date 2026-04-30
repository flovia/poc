## Purpose

Customer intelligence は customer address を起点に、x402 service candidates、payTo activity、portfolio / DeFi context、insights、provenance を read model として提供する。

## Requirements

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

### Requirement: Zerion portfolio source は customer intelligence を拡張できる

システムは customer intelligence capture で Zerion portfolio source が明示的に有効化された場合、Zerion 由来の portfolio summary と DeFi positions を正規化し、customer intelligence read model に反映することを MUST とする。

#### Scenario: Zerion portfolio capture が成功する

- **WHEN** operator が Zerion capture を有効にし、有効な `ZERION_API_KEY` で customer intelligence capture command を実行する
- **THEN** システムは Zerion response を repository-owned portfolio summary / DeFi position DTO に正規化する
- **THEN** customer intelligence response は portfolio source coverage を `available` とし、Zerion provenance を保持する

#### Scenario: Zerion が DeFi positions を返す

- **WHEN** Zerion source が protocol position facts を返す
- **THEN** response は `defiPositions` に protocol、position type、value、network、provenance、evidence または reasons を含める
- **THEN** システムは DeFi active classification を derived insight として扱い、raw source fact と区別する

### Requirement: Zerion unavailable / partial source を明示する

システムは Zerion capture が未有効、未設定、または一部失敗した場合、portfolio / DeFi context を捏造せず、source coverage と unavailable / partial reason を表現することを MUST とする。

#### Scenario: Zerion capture が無効である

- **WHEN** operator が Zerion capture を有効にせず customer intelligence capture command を実行する
- **THEN** response は既存通り valid customer intelligence read model を生成する
- **THEN** portfolio source coverage は unavailable reason を持ち、BFF request path で live Zerion を呼ばない

#### Scenario: Zerion credential が不足している

- **WHEN** operator が Zerion capture を有効にしているが `ZERION_API_KEY` がない
- **THEN** command は明確な configuration error で失敗する
- **THEN** システムは partial read model を成功扱いで書き出さない

#### Scenario: Zerion source が一時的に失敗する

- **WHEN** Zerion API が timeout、rate limit、または server error を返す
- **THEN** システムは DeFi inactive と断定せず、portfolio source coverage を partial または unavailable として理由を保持する

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

### Requirement: Zerion data は default verification を live にしない

システムは Zerion integration の unit / CLI tests を fixture または mocked fetch で検証し、default `bun run verify` で live Zerion access や credential を要求しないことを MUST とする。

#### Scenario: root verify を実行する

- **WHEN** developer が root で `bun run verify` を実行する
- **THEN** システムは `ZERION_API_KEY` を要求せず、offline fixture / mocked response に基づいて検証できる

#### Scenario: live Zerion capture を検証する

- **WHEN** operator が live Zerion portfolio capture を実行する
- **THEN** システムは default verify とは別の explicit command path で credential と external source availability を要求する

#### Scenario: live Zerion capture 結果を prepared fixture に反映する

- **WHEN** operator が `.env` の `ZERION_API_KEY` を使って対象 wallet の portfolio / DeFi 情報を取得し、customer intelligence read model JSON を生成する
- **THEN** 生成された read model は customer intelligence schema で検証できる
- **THEN** prepared fixture に反映する場合も raw Zerion response、API key、auth header、request metadata を含まない
- **THEN** BFF は更新済み prepared fixture を offline route test で検証できる

### Requirement: Zerion raw response は product payload に露出しない

システムは Zerion provider 固有の raw response を BFF product API response として公開せず、正規化済み portfolio summary、DeFi positions、source coverage、provenance、evidence に変換することを MUST とする。

#### Scenario: BFF が customer intelligence を返す

- **WHEN** client が `GET /customers/:address/intelligence` を呼び出す
- **THEN** response は prepared read model の正規化済み portfolio / DeFi field を返す
- **THEN** response は Zerion raw JSON、API key、auth header、request metadata を含まない
