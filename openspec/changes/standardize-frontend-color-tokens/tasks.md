## 1. Token Foundation

- [ ] 1.1 Add semantic surface aliases to `apps/frontend/app/globals.css` for page, card, elevated, subtle, muted, and selected surfaces.
- [ ] 1.2 Add interaction aliases for primary hover and active states without changing existing primary base tokens.
- [ ] 1.3 Add priority, medium, attention, neutral, metadata, blue series, and dark-surface text aliases.
- [ ] 1.4 Expose only component-facing semantic aliases through the Tailwind `@theme` block.

## 2. High-Impact Semantic Color Updates

- [ ] 2.1 Update hypothesis metadata badges to use neutral metadata tokens instead of SDK purple.
- [ ] 2.2 Update provider spread visuals to use blue series tokens or stable blue shades instead of blue, teal, and purple category colors.
- [ ] 2.3 Refactor Recency x Spend quadrant cards to use neutral card surfaces with border, dot, or label emphasis rather than broad tinted backgrounds.

## 3. Surface and Interaction Cleanup

- [ ] 3.1 Replace direct white card or panel surfaces touched by this change with `--surface-card` or `--surface-elevated` as appropriate.
- [ ] 3.2 Replace direct subtle gray panel, table header, hover, and selected colors touched by this change with `--surface-subtle`, `--surface-muted`, or `--surface-selected` according to role.
- [ ] 3.3 Replace primary button hover and selected-state direct colors touched by this change with interaction or semantic aliases.

## 4. Verification

- [ ] 4.1 Run `bun run format` if formatting changed TypeScript, TSX, CSS, or JSON files.
- [ ] 4.2 Run `bun run verify` from the repository root.
- [ ] 4.3 Review the affected frontend screens for the intended color semantics: purple only for SDK/demo/experimental, blue for priority, amber for attention, gray for metadata, and teal only for positive/healthy secondary signals.
