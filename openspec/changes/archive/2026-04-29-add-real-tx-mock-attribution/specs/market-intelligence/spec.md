## ADDED Requirements

### Requirement: Persist CoinGecko payTo transaction facts

The system MUST save transaction facts from CoinGecko by `payTo` as reusable data for Phase B projection generation.

Initial target is the observed Base USDC `payTo` from CDP Discovery snapshot: `0x110cdbba7fe6434ec4ce3464cc523942ad6fb784`. Capture must request default 1000 transfers and support explicit request limits above 1000. Retrieved count is stored as metadata.

#### Scenario: Persist transaction fact

- **WHEN** source retrieves a transaction matching CoinGecko `payTo`
- **THEN** the system stores `txHash`, `payerWallet`, `payTo`, `amount`, `asset`, `network`, and `timestamp`
- **THEN** saved fact is usable as `onchain_fact`

#### Scenario: Persist capture metadata

- **WHEN** source retrieves transfer list matching CoinGecko `payTo`
- **THEN** the system stores `requestedLimit`, `capturedCount`, `timeWindow`, and `source` as metadata
- **THEN** even if `capturedCount` is less than `requestedLimit`, fixture remains valid if schema is satisfied

#### Scenario: No source capture in request path

- **WHEN** a Phase B product endpoint is called
- **THEN** the system does not fetch CoinGecko transaction fact from live source

### Requirement: packages source adapter fetches payTo transfer list

The system MUST be able to fetch a transfer list as a `packages/sources` source adapter for specified `network`, `asset`, and `payTo`.

#### Scenario: Fetch up to 1000 payTo transfer list

- **WHEN** caller requests transfer list with `network`, `asset`, `payTo`, time window, and limit
- **THEN** source adapter returns transfer facts including `txHash`, `sender`, `recipient`, `amountAtomic`, `blockNumber`, and `blockTimestamp`
- **THEN** initial implementation defaults `limit` to 1000 and supports explicit limits above 1000
- **THEN** returned transfer facts are usable as `onchain_fact` in projection generation

#### Scenario: Handle source pagination

- **WHEN** source API cannot return 1000 results in a single response
- **THEN** source adapter paginates per API constraints and collects up to 1000 transfer facts
- **THEN** actual captured count after pagination is recorded as `capturedCount`

#### Scenario: Separate aggregate and transfer list responsibilities

- **WHEN** caller requests market snapshot aggregate
- **THEN** system preserves existing aggregate response
- **WHEN** caller requests transaction facts for Phase B projection
- **THEN** system returns transfer list response instead of aggregate

### Requirement: Join mock attribution to transaction facts by txHash

The system MUST join mock endpoint attribution to real transaction facts by `txHash` when generating Phase B projection.

#### Scenario: Join matching txHash attribution

- **WHEN** transaction fact and mock attribution item share same `txHash`
- **THEN** projection builder combines onchain fields and endpoint attribution fields into same projection record
- **THEN** provenance of onchain fields and attribution fields must not be mixed

#### Scenario: Unmatched txHash attribution

- **WHEN** a mock attribution item references `txHash` not present in transaction facts
- **THEN** projection builder must fail via schema validation or clear generation error

### Requirement: Separate projection generation from offline verification

The system MUST separate live source transaction capture from offline-verifiable projection validation.

#### Scenario: Run offline verification

- **WHEN** an operator runs `bun run verify`
- **THEN** system verifies with saved fixture / projection and contract validation
- **THEN** does not require live CDP, Bitquery, RPC, or other external service calls
