---
name: Decision log
description: Record of evaluated options and reasons for each decision
type: project
---

# Decision log

> Last updated: 2026-04-28
> Purpose: preserve why each decision was made

## D1: PoC goal

**Conclusion**: Rich demo for investor/customer

| Option | Picked | Reason |
|---|---|---|
| Static mock in sync meeting | ✗ | not visually compelling |
| Live demo with real data | ✗ | backend readiness was insufficient |
| **Rich investor/customer demo** | ○ | visual and narrative quality needed for decision support |

## D2: User

**Conclusion**: API provider customer

| Option | Picked | Reason |
|---|---|---|
| Internal PMs | ✗ | lower demo value |
| **API providers as customers** | ○ | can clearly show immediate value |
| Both | ✗ | message becomes diluted |

## D3: Narrative

**Conclusion**: Primary = Co-usage Discovery, Secondary = Retention

| Option | Picked | Reason |
|---|---|---|
| Option A: Revenue Discovery | ✗→base | too generic; Stripe Dashboard can already do similar |
| Option B: Retention | ✗→secondary | hard to create "immediate need" as primary |
| Option C: Live Ops | ✗ | low daily operational affinity |
| **Co-usage Discovery (new)** | ○ | unique capability with x402 public data, not possible in Stripe Dashboard |
| Co-usage + Retention | ○ | combines customer value and investor narrative |

## D4: Perspective (competition vs co-usage)

**Conclusion**: co-usage pattern analysis

| Option | Picked | Reason |
|---|---|---|
| Competitor analysis | ✗ | competitors may also be partners |
| **Co-usage pattern analysis** | ○ | captures the core value of observing AI agent workflows |

## D5: Hero visualization

**Conclusion**: main network graph / secondary Sankey / strategy bubble

| Visualization | Placement | Reason |
|---|---|---|
| **Network graph** | Screen 2 main | strongest demo impact and clear ecosystem structure |
| **Sankey** | Screen 2 lower area | shows workflow flow/order |
| **Bubble** | Screen 3 main | shows strategic hints (priority candidates at top-right) |

## D6: Data granularity

**Conclusion**: support both provider-level and provider × API path-level

| Option | Picked | Reason |
|---|---|---|
| provider-only | ✗ | insufficient because some customers have path-level addresses |
| provider × API path only | ✗ | insufficient when path-level addresses are not provided |
| **both** | ○ | covers x402 configuration variance across customers |

## D7: Screen 3 (Co-usage Patterns) in MVP

**Conclusion**: include

| Option | Picked | Reason |
|---|---|---|
| Exclude (only screens 1+2) | ✗ | misses strategic aggregate view for leadership |
| **Include** | ○ | enables three-step narrative (individual → detail → aggregate) |

## D8: Tech stack

**Conclusion**: Next.js (App Router) + pnpm + Vercel + mock JSON

Reason:
- Vercel deployment simplifies URL sharing for investor/customer review
- App Router enables Server Components, suitable for mock JSON serving
- pnpm was user-requested

## D9: Access model

**Conclusion**: fully flat (no auth)

| Option | Picked | Reason |
|---|---|---|
| **Fully flat** | ○ | fits PoC scope as public directory style |
| View-as mode | ✗ | unnecessary in PoC; revisit with future auth |
| self vs other mode | ✗ | would require auth, outside PoC |
| tab-based mode | ✗ | heavier UI |

In future, when SDK-based proprietary data is introduced, auth + mode switching can be added.
Keep public data / private data components separated in PoC.

## D10: `pay_to` storage

**Conclusion**: browser localStorage

| Option | Picked | Reason |
|---|---|---|
| **localStorage** | ○ | auth-free persistence with easy switching/deleting |
| URL query only | ✗ | non-persistent and leaks via links |
| server-side storage | ✗ | would require auth |

### Auxiliary specs

- switch easily in sidebar/header selector
- delete control on each entry
- support both simple mode (`pay_to` 1) and advanced mode (`pay_to` per API path)

## D11: Sankey dropped

**Conclusion**: Sankey not used in PoC; substitute with Activity Timeline list

Reason:
- policy: no intent inference; show exact sequence and timing of x402 requests
- Activity Timeline keeps PoC scope cleaner
- reconsider Sankey as workflow aggregate view in Phase 2

## D12: Wallet 360° becomes hero

**Conclusion**: Activity Timeline is hero, Co-usage Map is supporting

Reason:
- initial plan had Co-usage Map as hero, but aligned with D11 that sequence-first insight is stronger
- chronological raw data builds trust
- map remains for structural reinforcement

## D14: Wallet 360° hero fixed

**Conclusion**: Lock Activity Timeline as hero (Co-usage Map remains support)

| Option | Picked | Reason |
|---|---|---|
| **Activity Timeline hero** | ○ | climax a (understanding gained) only works in timeline |
| Co-usage Map hero | ✗ | visually strong, but less direct for value proposition |

Details: [10_design_review.md](10_design_review.md) and
[07_moodboard_per_screen.md](07_moodboard_per_screen.md) resolved prior debate.

## D15: Add five critical UI elements from demo script

**Conclusion**: add these five to Wallet 360°

1. Free Tier Progress Bar
2. 7d Volume Sparkline
3. Upsell Opportunity Card
4. Workflow Summary Strip
5. Entry-point Badge

Reason: these are required to support climax a (understanding) and b (upsell).
Details: [10_design_review.md](10_design_review.md)

## D13: Design direction

**Conclusion**: hybrid (UI shell = Precision Graph / hero = Ambient Mesh)

| Option | Picked | Reason |
|---|---|---|
| Precison Graph only | ✗ | lacks distinctiveness |
| Ambient Mesh only | ❌ | risk of over-stylized crypto look and higher implementation cost |
| **Hybrid (both)** | ○ | stable base UI, hero surfaces differentiated with controlled motion |

See [06_design_direction.md](06_design_direction.md).
Base palette = Precision Graph with slate/teal; Ambient Mesh accents (deep navy + blue glow)
only on hero areas. Dark mode is **default**.
