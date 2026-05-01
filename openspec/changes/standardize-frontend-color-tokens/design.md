## Context

The frontend already defines a stable base palette in `apps/frontend/app/globals.css`, including warm page background, white card surfaces, muted blue primary, teal accent, amber warning, red danger, and SDK purple. Tailwind theme tokens expose part of this palette. However, components still choose direct hex and rgba values for surfaces, badges, status cues, chart bars, and selected states.

The change should improve visual consistency without redesigning the palette, altering layout, or changing application behavior. The safest path is to add semantic aliases over the existing base tokens, then migrate high-impact component usage to those aliases.

## Goals / Non-Goals

**Goals:**
- Add semantic alias tokens for frontend surfaces, interactions, signals, metadata, series colors, and dark-surface text.
- Expose only component-facing aliases through Tailwind `@theme` where needed.
- Make hypothesis metadata neutral gray rather than purple.
- Make provider spread visuals use blue series shades rather than unrelated category colors.
- Reduce broad tinted backgrounds in Recency x Spend quadrant cards in favor of white surfaces with border, dot, or label emphasis.
- Replace common direct surface literals with semantic tokens where touched.

**Non-Goals:**
- Do not change the existing base palette values such as `--bg-shell`, `--mesh-blue`, `--teal`, `--warn`, `--danger`, or `--sdk-purple`.
- Do not remove SDK/demo purple where it communicates preview, demo, mock, or experimental state.
- Do not redesign typography, spacing, layout, navigation, or data presentation structure.
- Do not alter backend APIs, SDK data contracts, storage, routing, or live verification behavior.

## Decisions

### Add alias tokens instead of renaming base tokens

Use aliases such as `--surface-card`, `--surface-muted`, `--signal-priority`, and `--meta-hypothesis` on top of existing `--bg-*`, `--mesh-blue`, and text tokens.

Rationale: this avoids broad breakage and keeps current palette decisions reversible. Renaming the base palette directly would create large mechanical diffs and make the visual intent harder to review.

### Use `priority` instead of `high` for blue signals

Use `--signal-priority` and `--signal-priority-soft` rather than `--signal-high`.

Rationale: `high` is ambiguous across value, confidence, upsell, severity, and risk. `priority` better matches the intended visual meaning: primary emphasis, high-value opportunity, selected state, or key series. High-risk or destructive states must not inherit blue semantics.

### Keep neutral aliases value-linked to surface tokens

Define neutral and hypothesis soft backgrounds through `--surface-muted` rather than duplicating independent hex values.

Rationale: `--surface-muted`, `--signal-neutral-soft`, and `--meta-hypothesis-soft` may resolve to the same value, but they represent different usage roles. Keeping them aliased clarifies intent while avoiding color drift.

### Separate series colors from background soft colors

Add blue series aliases such as `--series-primary`, `--series-primary-muted`, and `--series-primary-soft` for charts and distribution bars.

Rationale: chart bars need stable, visible fills. Existing `--mesh-blue-soft` and `--mesh-blue-dim` are better suited to backgrounds and may be too faint or ambiguous for data series.

### Prefer border, dot, and label emphasis over broad tinted panels

Recency x Spend quadrants should use neutral card surfaces and small semantic emphasis indicators.

Rationale: full tinted backgrounds make multiple states compete visually. Border and dot emphasis keeps hierarchy clear while preserving the meaning of priority, attention, and neutral states.

## Risks / Trade-offs

- Alias token count could become confusing → Mitigate by exposing only component-facing tokens in `@theme` and documenting usage through component rules.
- Visual diffs may be broad if all hard-coded colors are replaced at once → Mitigate by prioritizing high-impact components first and doing surface literal replacement incrementally.
- Blue priority could be misused for risk or severity → Mitigate with explicit rules: amber is attention/dormant, red is destructive/error, gray is metadata/neutral, teal is positive/healthy only.
- Provider spread blue shades may reduce categorical distinction → Mitigate by treating the visual as a ranked distribution, not semantic categories, and using stable series shades.
