---
name: Technology stack
description: Framework, deployment target, and dependency direction
type: project
---

# Technology stack

> Last updated: 2026-04-28

## ★ Confirmed items

| Item | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) | |
| Package manager | pnpm | |
| Deployment | Vercel | URL sharing for demo distribution |
| Language | TypeScript | |
| Data source | Mock JSON | replaceable backend-ready structure |
| Design | modern SaaS look decided through Codex consultation | built from scratch |

## ★ Undecided (to decide during implementation)

| Item | Candidates |
|---|---|
| UI components | shadcn/ui / Tremor / custom |
| Styling | Tailwind CSS (near final) / CSS Modules |
| Network graph | react-force-graph / visx / D3 directly / cytoscape.js |
| Sankey | visx / D3 |
| Bubble / general charts | Recharts / visx / Tremor |
| State management | React built-ins (useState/Context) / Zustand / Jotai |
| Data fetching | fetch + Server Components (mock JSON can be loaded statically) |
| Icons | lucide-react / heroicons |
| Fonts | Inter / Geist |
| Dark mode | under consideration (advantageous for demo) |

## ★ Proposed directory structure

```
poc/
├── docs/                    # this documentation set
├── app/                     # Next.js App Router
│   ├── (dashboard)/
│   │   ├── customers/       # Screen 1
│   │   ├── wallet/[id]/     # Screen 2
│   │   └── patterns/        # Screen 3
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── charts/              # network / Sankey / bubble charts
│   ├── ui/                  # shadcn, etc.
│   └── layout/
├── lib/
│   ├── data/                # mock JSON
│   └── types/               # TypeScript types
├── public/
├── package.json
└── ...
```

To be finalized at implementation time.
