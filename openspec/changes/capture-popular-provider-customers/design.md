## Context

The provider catalog now contains hundreds of real provider/payTo rows from CDP and aggregate census data, but only a small subset has sampled payer-wallet `transfer_facts`. The frontend can prioritize customer-ready providers, yet the most active services by transaction count often remain aggregate-only and produce empty Customers views.

Existing CLI capabilities already include payTo sampling, bounded payTo transfer capture, wallet sampling, customer intelligence capture, and read-model generation. This change should reuse those pieces to create a focused path for filling customer coverage on selected high-value provider payTos.

## Goals / Non-Goals

**Goals:**
- Select popular provider payTos that are currently aggregate-only but demo-relevant.
- Capture bounded payer-wallet transfer facts for those selected payTos.
- Regenerate analytics read models and BFF generated fixture so selected popular providers become customer-ready.
- Report remaining high-activity providers without customer facts.

**Non-Goals:**
- Capturing every provider in the CDP census.
- Adding live capture to BFF or frontend request paths.
- Changing provider catalog or Customers API contracts.
- Guaranteeing endpoint-level attribution for bundled payTos without stronger attribution signals.

## Decisions

1. **Add a focused popularity-targeted capture path instead of expanding default full-capture budgets blindly.**
   - Rationale: the current full-capture workflow samples broadly across strata, but demo readiness needs specific high-activity provider payTos.
   - Alternative considered: increase `--payto-budget` globally. Rejected because it can spend capture budget on low-demo-value strata and still miss known popular aggregate-only providers.

2. **Use existing payTo census/provider catalog fields for target selection.**
   - Rationale: `transactionCount`, `uniqueSenderCount`, service identity, attribution status, and `hasCustomerFacts` already identify candidates.
   - Alternative considered: manually maintain a hard-coded target list. Rejected except for optional overrides because the target set should be reproducible from the analytics store.

3. **Keep capture bounded per payTo.**
   - Rationale: popular providers can have very high transaction volumes; `perPayToLimit`, page size, and optional time slicing are needed to control cost and runtime.
   - Alternative considered: capture complete history for popular providers. Rejected for PoC cost and runtime reasons.

4. **Regenerate fixture only after local transfer facts are persisted.**
   - Rationale: BFF/frontend should remain offline and deterministic; generated fixture refresh is an explicit artifact step.
   - Alternative considered: BFF dynamically reads SQLite. Rejected because BFF request paths should not depend on local analytics DB queries.

## Risks / Trade-offs

- **Popular payTos may be bundled across endpoints** → Preserve bundled attribution status and avoid claiming endpoint-level facts.
- **Capture may be expensive or slow** → Use explicit target limit, per-payTo transfer limit, page size, and time-window options.
- **Some selected payTos may still return no transfers** → Report misses and keep them aggregate-only rather than fabricating customers.
- **Fixture can become large** → Commit only the BFF generated fixture intentionally; keep raw captures and SQLite ignored.
- **Live source credentials may be unavailable** → Selection/reporting remains offline; actual capture is gated on Bitquery credentials.

## Migration Plan

1. Add target selection/reporting logic for aggregate-only popular provider payTos.
2. Add a CLI command or full-capture option that captures selected payTo transfers with existing bounded capture code.
3. Persist transfer facts into the existing analytics SQLite store.
4. Regenerate read models and the committed BFF fixture.
5. Verify that selected providers now have `hasCustomerFacts=true` and non-empty Customers views.

## Open Questions

- What default target count should be used for popular providers: 5, 10, or configurable only?
- Should CoinGecko always be included even if already customer-ready, or only verified as present?
- Should the first pass target only EVM/Base USDC payTos to avoid non-EVM customer-profile scope limitations?
