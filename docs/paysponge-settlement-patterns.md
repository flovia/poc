# Paysponge settlement pattern review

This note records the current fixture/corpus mismatch for the wallet usage graph and facilitator fingerprint change.

## Current `poc` fixture evidence

`apps/cli/fixtures/raw/paysponge-perplexity.transaction.json` currently records:

- top-level `to`: Base USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- top-level selector: `0xcf092995`
- shape: direct USDC bytes-signature `transferWithAuthorization`

The same direct-USDC bytes-signature style appears for the current `paysponge-wolframalpha` fixture.

## Adjacent foxytanuki corpus evidence

`../foxytanuki/docs/x402-analysis/endpoint-discovery.md` records Paysponge Perplexity and Paysponge WolframAlpha as:

- top-level `to`: canonical Multicall3 `0xca11bde05977b3631167028862be2a173976ca11`
- top-level selector: `0x82ad56cb`
- repeated relayer: `0xb2bd29925cbbcea7628279c91945ca5b98bf371b`
- shape: Multicall3 `aggregate3` wrapping Base USDC authorization transfer

## Implementation stance

Treat both as evidence-backed Paysponge-associated settlement clusters until provenance is fully reconciled:

- `direct_usdc_bytes_signature_transfer_with_authorization`
- `multicall3_usdc_bytes_signature_authorization`

Paysponge internal facilitation candidates require composite evidence: Paysponge-hosted request, decoded payment response tx, observed onchain tx, settlement pattern, and relayer/settlement evidence. Pattern-only matches remain settlement-cluster candidates and do not become high-confidence named Paysponge facilitator labels.
