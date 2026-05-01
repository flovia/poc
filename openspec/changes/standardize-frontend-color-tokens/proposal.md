## Why

The frontend currently has a sound base palette, but components use color inconsistently through direct hex and rgba values, especially for surfaces, metadata, and chart accents. This makes the UI feel visually noisy and makes future design changes harder to apply safely.

## What Changes

- Add a semantic color alias layer on top of the existing frontend base palette.
- Define clear usage rules for surfaces, interaction states, priority, attention, neutral metadata, chart series, and dark surfaces.
- Update hypothesis metadata to use neutral gray instead of purple.
- Update provider distribution visuals to use blue series shades instead of unrelated category colors.
- Reduce broad tinted backgrounds in Recency x Spend quadrant cards, using neutral card surfaces with border, dot, or label emphasis.
- Gradually replace direct surface color literals with semantic surface tokens.
- No breaking changes to user-facing flows, data contracts, routing, or external APIs.

## Capabilities

### New Capabilities
- `frontend-color-system`: Defines the frontend semantic color system, token exposure, and component usage rules for consistent visual semantics.

### Modified Capabilities

## Impact

- Affected code is limited to `apps/frontend`, primarily `app/globals.css` and visual components under `components/`.
- No backend, database, RPC, or SDK behavior changes.
- No new runtime dependencies are expected.
- Verification should use the repository baseline `bun run verify`; formatting can be checked with `bun run format:check` when needed.
