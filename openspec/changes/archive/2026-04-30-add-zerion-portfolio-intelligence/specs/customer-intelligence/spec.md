## ADDED Requirements

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
