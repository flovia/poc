# Frontier final polish

Date: 2026-05-12
Branch: `feat/frontier-final-polish`

## Goal

Prepare the Frontier Hackathon demo with final presentation polish while keeping
the implementation minimal and reproducible.

## Confirmed scope

1. Customer wallets data should be expanded for Solana through the DB/data path,
   not by only editing frontend demo fixtures.
2. Provider customer pages should prioritize Solana wallets when present.
3. Machine-payment Sankey should look less demo-like:
   - remove AgentCash
   - keep existing `/v1/*` endpoint paths
   - add stronger flow contrast through route amounts and scaling
4. Solana MPP showcase before/after snippets should differ only by the Flovia SDK
   insertion, matching the Stripe MPP and HitPay MPP pattern.
5. Customer page UI can receive small polish for balance and Solana context.
6. Nansen top positioning is explicitly skipped.

## Data path note

The customer page should ultimately consume Solana wallet rows from the database
via the BFF read model. `apps/data` owns the collector/schema side; the frontend
should not be the source of truth for customer wallet expansion. Static fixtures
may remain only as stable demo fallbacks, not as the primary implementation
claim.

## Compact implementation checklist

- Inspect `apps/data` migrations/collectors and BFF postgres read model before
  adding any customer-wallet data changes.
- Prefer DB/read-model compatible data changes over frontend-only fixtures.
- Apply low-risk frontend polish:
  - Solana-first customer sorting and badge ordering.
  - Sankey fixture/visual contrast changes.
  - Solana MPP code snippet alignment.
- Verify with `bun run verify`.

## Open risks

- If local Postgres is not populated, frontend may still rely on generated or
  fallback data. Document any remaining demo fallback clearly.
- Unsupported non-Base/non-Solana chains should not receive fabricated balance
  claims.
