## ADDED Requirements

### Requirement: Zerion portfolio source can extend customer intelligence

The system MUST normalize Zerion-derived portfolio summary and DeFi positions and reflect them in customer intelligence read model when Zerion portfolio source is explicitly enabled in capture.

#### Scenario: Zerion portfolio capture succeeds

- **WHEN** operator enables Zerion capture and runs customer intelligence capture command with valid `ZERION_API_KEY`
- **THEN** system normalizes Zerion response into repository-owned portfolio summary and DeFi position DTOs
- **THEN** customer intelligence response marks portfolio source coverage as `available` and retains Zerion provenance

#### Scenario: Zerion returns DeFi positions

- **WHEN** Zerion source returns protocol position facts
- **THEN** response includes `protocol`, `position type`, `value`, `network`, `provenance`, and evidence or reasons in `defiPositions`
- **THEN** system treats DeFi active classification as derived insight and distinguishes it from raw source facts

### Requirement: Expose Zerion unavailable / partial source

The system MUST not fabricate portfolio / DeFi context if Zerion is disabled, unset, or partially failed; it must represent source coverage and unavailable / partial reasons.

#### Scenario: Zerion capture is disabled

- **WHEN** operator runs customer intelligence capture command without enabling Zerion capture
- **THEN** system generates a valid customer intelligence read model as before
- **THEN** portfolio source coverage includes unavailable reason, and BFF request path does not call live Zerion

#### Scenario: Zerion credentials are missing

- **WHEN** operator enables Zerion capture but `ZERION_API_KEY` is missing
- **THEN** command fails with a clear configuration error
- **THEN** system does not emit successful partial read model

#### Scenario: Zerion source fails temporarily

- **WHEN** Zerion API returns timeout, rate limit, or server error
- **THEN** system does not force DeFi inactive
- **THEN** portfolio source coverage is partial or unavailable with reason retained

### Requirement: Zerion data must not make default verification live

The system MUST validate Zerion integration with unit / CLI tests via fixtures or mocked fetch and must not require live Zerion access or credentials during default `bun run verify`.

#### Scenario: Run root verify

- **WHEN** developer runs `bun run verify` at repository root
- **THEN** system verifies without requiring `ZERION_API_KEY`, based on offline fixtures / mocked responses

#### Scenario: Validate live Zerion capture

- **WHEN** operator runs live Zerion portfolio capture
- **THEN** system requires credentials and external source availability via explicit command path separate from default verify

#### Scenario: Reflect live Zerion capture in prepared fixture

- **WHEN** operator generates customer intelligence read model JSON using target wallet portfolio / DeFi information with `.env` `ZERION_API_KEY`
- **THEN** generated read model validates against customer intelligence schema
- **THEN** prepared fixture updates do not include raw Zerion response, API key, auth header, or request metadata
- **THEN** BFF can validate updated prepared fixture with offline route tests

### Requirement: Zerion raw response is not exposed in product payload

The system MUST convert Zerion provider-specific raw response into normalized portfolio summary, DeFi positions, source coverage, provenance, and evidence, and must not expose raw Zerion response in BFF product API.

#### Scenario: BFF returns customer intelligence

- **WHEN** client calls `GET /customers/:address/intelligence`
- **THEN** response returns normalized portfolio / DeFi fields from prepared read model
- **THEN** response does not include raw Zerion JSON, API key, auth header, or request metadata
