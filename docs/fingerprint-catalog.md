# Fingerprint Catalog Specification

## Purpose

The fingerprint catalog is an evidence-backed reference dataset for enriching
onchain payment observations.

It must not create payment observations by itself. It only turns observed facts
into attribution candidates such as provider, middleman, facilitator, payee, or
relayer candidates.

Current implementation has completed RPC transaction ingest and bounded range
ingest. This catalog spec is for the later attribution-quality phase and should
not block the current indexer-foundation work.

## Boundary

### Payment observations are facts

`payment_observations` should contain only facts decoded from transaction input
and receipt logs:

- chain id
- tx hash
- block number / timestamp
- payer wallet
- recipient wallet
- relayer / transaction sender
- token address
- amount
- settlement method
- evidence rows

### Fingerprints are claims

Fingerprint rows are claims about what an observed value may represent:

- a recipient wallet may be a provider payTo wallet
- a relayer address may be a facilitator
- a resource host may be associated with a provider
- a payment link may identify a middleman or service

These claims should produce attribution candidates with confidence and evidence.
They should not be collapsed into final labels in `payment_observations`.

## Initial seed format

Use the checked-in JSON seed file as the initial offline catalog source:

```text
apps/cli/fixtures/knowledge/known_fingerprints.json
```

Suggested top-level shape:

```json
{
  "version": "1",
  "generatedAt": "2026-04-28T00:00:00.000Z",
  "entries": []
}
```

Each entry should include:

```json
{
  "fingerprintId": "base:recipient:example-provider:001",
  "entity": {
    "name": "Example Provider",
    "type": "provider"
  },
  "role": "payee",
  "signal": {
    "type": "recipient_wallet",
    "value": "0x0000000000000000000000000000000000000000",
    "chainId": 8453,
    "asset": "USDC"
  },
  "confidence": 90,
  "confidenceBucket": "high",
  "source": {
    "type": "official_docs",
    "name": "Example docs",
    "url": "https://example.com/docs/payments"
  },
  "evidence": [
    {
      "type": "url",
      "ref": "https://example.com/docs/payments",
      "note": "Official docs publish this Base USDC payTo address"
    }
  ],
  "status": "active",
  "firstSeenAt": "2026-04-28T00:00:00.000Z",
  "lastSeenAt": "2026-04-28T00:00:00.000Z"
}
```

## Entity types

Allowed entity types:

```text
provider
middleman
facilitator
payee
relayer
catalog_source
resource_host
unknown_cluster
```

Notes:

- `provider`: the API or service being paid for.
- `middleman`: a payment router, proxy, wallet, marketplace, or aggregator.
- `facilitator`: settlement service that verifies/submits x402 payments.
- `payee`: the wallet receiving settlement funds.
- `relayer`: the EOA or contract sender that submits settlement transactions.

## Roles

Allowed attribution roles:

```text
provider_candidate
middleman_candidate
facilitator_candidate
payee
relayer
resource_host_candidate
```

One wallet can have multiple roles. For example, a middleman may also operate a
recipient wallet, or a facilitator may operate multiple relayer addresses.

## Signal types

Allowed signal types:

```text
recipient_wallet
relayer_address
tx_target
selector
inner_selector
settlement_pattern
catalog_pay_to
facilitator_url
resource_host
payment_link_host
amount_pattern
```

Recommended use:

- `recipient_wallet`: strongest onchain signal for payee/provider candidates.
- `relayer_address`: useful for facilitator candidates.
- `resource_host`: useful for provider candidates, but usually offchain-only.
- `facilitator_url`: useful when captured from x402 metadata or configuration.
- `amount_pattern`: weak by itself; use only as supporting evidence.

## Evidence requirements

Every non-fixture fingerprint should have at least one evidence item.

Accepted evidence types:

```text
official_docs_url
payment_requirements_capture
payment_link_capture
basescan_label
tx_hash
github_source
analyst_note
fixture_case
```

Evidence should answer:

- where the label came from
- when it was observed
- whether the source is official, inferred, or analyst-supplied
- which wallet / host / tx it supports

Fixture-only labels may use `fixture_case`, but those should be considered
pipeline validation seeds, not production-grade catalog facts.

## Confidence buckets

Use integer confidence from 1 to 100 plus a bucket:

```text
low: 1-39
medium: 40-69
high: 70-89
verified: 90-100
```

Suggested guidance:

- `verified`: official source or repeated independently verifiable evidence.
- `high`: strong source but not fully canonical.
- `medium`: plausible match with partial evidence.
- `low`: weak supporting signal only.

Do not use low-confidence fingerprints to produce final-looking labels.

## Conflict handling

Conflicts are expected and should not be overwritten silently.

Examples:

- same recipient wallet maps to multiple providers
- same relayer maps to multiple facilitator services
- provider and middleman labels both claim the same wallet

Rules:

- keep all competing candidates
- preserve source and evidence for each claim
- require score logic to choose confidence, not seed ingestion
- never delete a lower-confidence claim just because a higher-confidence claim
  exists

## Ingestion behavior

Future import script:

```text
apps/cli/scripts/ingest-fingerprints.ts
```

Expected behavior:

- read `known-fingerprints.json`
- validate schema and addresses
- reject missing evidence for non-fixture sources
- reject invalid confidence ranges
- upsert catalog rows idempotently
- preserve conflicting claims as separate rows or separate candidate paths
- report counts and validation errors

## Verification rules

Offline `bun run verify` should eventually check:

- seed file parses
- all EVM addresses are valid hex addresses
- Base fingerprints use `chainId: 8453`
- confidence is 1-100
- confidence bucket matches confidence
- non-fixture entries have evidence
- duplicate fingerprint IDs are rejected
- duplicate signal/entity/role rows are intentional or flagged
- no provider/middleman/facilitator final labels are added to
  `payment_observations`

Live RPC or external HTTP checks should not be required by default verify.

## Relationship to the current roadmap

Completed ingest work focuses on turning chain data into observations:

```text
tx hash -> RPC tx/receipt -> normalize -> observation builder -> DB
```

The fingerprint catalog remains a separate enrichment layer:

```text
observations + known fingerprints -> attribution candidates
```

Its production-grade shape belongs to the attribution-quality phase. Evidence
acquisition, revalidation, and promotion policy are covered separately in
`docs/x402-data-acquisition-strategy.md`.
