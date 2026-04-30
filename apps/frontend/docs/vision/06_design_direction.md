---
name: Design direction
description: Finalized hybrid direction (Precision Graph shell + Ambient Mesh hero screens)
type: project
---

# Design direction

> Last updated: 2026-04-28
> Decision basis: [Codex consultation log](/tmp/flovia-codex-review/design_directions.md)

## ★ Adopted policy: hybrid

**UI shell follows Precision Graph** and **hero screens use Ambient Mesh**.

| Scope | Chosen approach | Reason |
|---|---|---|
| **UI shell** (sidebar, header, tables, Setup, shared card styles) | Precision Graph | clean, trustworthy, lower implementation cost |
| **Hero screen visuals** (Wallet 360° co-usage map / Co-usage Patterns bubble) | Ambient Mesh | network-like presence and demo impact, distinct brand feel |

### Why hybrid

- **Precision Graph only**: stable but weak on Flovia-specific distinctiveness (network discovery feel)
- **Ambient Mesh only**: attractive but high risk of looking crypto-heavy and harder to implement
- **Hybrid**: consistent standard UI with standout visual treatments only where needed, best cost/benefit

---

## ★ Final color palette

Keep Precision Graph shell as baseline and overlay Ambient Mesh accents (deep navy + blue glow)
on hero screens only.

### Light mode

| Purpose | HEX |
|---|---|
| Primary (text on bg) | `#0F172A` |
| Secondary | `#334155` |
| Background | `#F8FAFC` |
| Accent | `#14B8A6` (Teal) |
| Text | `#0B1220` |
| **Mesh accent** (hero use) | `#2563EB` (Blue) |

### Dark mode

| Purpose | HEX |
|---|---|
| Primary | `#E2E8F0` |
| Secondary | `#94A3B8` |
| Background | `#020617` (UI shell) |
| **Background (hero)** | `#0A0F1E` (deep navy) |
| Accent | `#2DD4BF` (Teal) |
| **Mesh accent** | `#60A5FA` (blue glow) |
| Text | `#F8FAFC` |

Dark mode is set as **default** for demo impact.

---

## ★ Typography

- **Headings**: `Geist Sans` (28–36px, weight 600–700, slightly tightened letter spacing)
- **Body**: `Geist Sans` (14–15px)
- **Numbers / axis labels / metrics**: `Geist Mono` (limited use for numeric clarity)

Use `Space Grotesk` only for headings on hero screens (Wallet 360° / Patterns) depending on
implementation; PoC starts with Geist unified.

---

## ★ Layout principles

- 12-column layout, max width **1440px**
- Sidebar width **264px** fixed
- 8pt spacing system; main section spacing 24–32px
- High density while keeping a calm presentation
- Wallet 360° uses **3 panes**: left timeline / center network / right insight
- Hero screens keep negative space in background to support the mesh style

---

## ★ Component policy

| Element | Policy |
|---|---|
| Base | **shadcn/ui** |
| Visualization | custom (choose among D3 / visx / react-force-graph at implementation time) |
| Card radius | **16px** (UI shell), **18px** (hero screens with translucent glass look) |
| Shadows | subtle in UI shell / translucent aura on hero screens |
| Buttons | mostly tonal / ghost, CTA as solid accent |
| Tables | tighter row height, strict alignment |
| Animation | UI shell 150–220ms, hero screens 250–400ms (ambient motion) |

---

## ★ Visualization atmosphere

### Activity Timeline (UI shell leaning)
- list view with mono-aligned time/amount
- self-provider rows highlighted with Teal hairline

### Co-usage Map (Ambient Mesh hero)
- deep navy background (`#0A0F1E`)
- nodes in grayscale, **important nodes only** in blue glow (`#60A5FA`)
- links semi-transparent, with stronger brightness on highlighted paths
- nodes laid out with force-based ambient motion

### Bubble Chart (Co-usage Patterns hero)
- blue-cyan color gradient
- thin aura on cluster groups
- hover to expand bubble + tooltip

---

## ★ Existing SaaS references

- **Stripe Dashboard** — trust through sidebar structure
- **Vercel Dashboard / Geist** — high-contrast calm dark UI
- **Linear** — dense information delivered elegantly
- (hero screens only) **Vercel / Geist graphic style** — for network expression

---

## ★ Exclusions

- cheap crypto motifs (neon green, too many gradients, blockchain icon spam)
- excessive animation that hurts product feel
- decorative emojis or illustrations

---

## ★ Next steps

1. Ask Codex for per-screen moodboard instructions
2. Ask Codex for initial shadcn/ui component set
3. Move into Next.js project scaffold
