---
name: Visualization policy
description: Selection logic for network graph, timeline, and bubble chart
type: project
---

# Visualization policy

> Last updated: 2026-04-28

## ★ Three adopted visualizations

| Visualization | Placement | Claim |
|---|---|---|
| Activity Timeline (time-series list) | Main area of screen 2 | **Which API was called, in what order, and at what time** |
| Network graph (Force-directed) | Supporting area of screen 2 | The **structure** of the ecosystem |
| Bubble chart | Main area of screen 3 | Strategic **importance ranking** |

**Change**: Sankey was not adopted. Based on the policy of avoiding intent inference and showing raw sequence directly, we replace it with the Activity Timeline.

## ★ Characteristics by visualization

### Network graph (Force-directed graph)

Provider nodes are placed as points; co-usage relationships are drawn as edges. Frequent pairs become thicker lines and shorter distances.

- **Strengths**: ecosystem structure is immediately visible, clusters appear naturally, and it is strongest for visual impact
- **Weaknesses**: weak at direct quantitative comparison, becomes cluttered with many nodes
- **What you can read**: "This API has a tight coupling with these 5 APIs"

### Activity Timeline (time-series list)

All x402 requests are ordered by timestamp. Each row shows Time / Provider / API path / Amount.

- **Strengths**: conveys "when and in what order it was called" without interpretation, lightweight to implement, easy to filter
- **Weaknesses**: does not show aggregate metrics directly (compensated by Co-usage Map)
- **What you can read**: "raw usage history for this wallet"

### (Reference) Sankey chart — not adopted in PoC

Not adopted because the sequence timeline can provide equivalent insight. It can be reconsidered in Phase 2 as a workflow aggregation view.

### Bubble chart

A 2D scatter with bubble size. X-axis = co-usage frequency, Y-axis = retention rate / price per request, bubble size = wallet count.

- **Strengths**: supports 3 dimensions (2 axes + size), easy to surface strategic implications
- **Weaknesses**: does not show explicit pairwise relationships
- **What you can read**: "partner with this provider first"

## ★ Why this combination

The flow is coherent:

1. Show raw data with Activity Timeline: "price generation → storage → notification in this order"
2. Reinforce with network graph: "it is used closely with Storage A and Notify B"
3. Derive strategy with bubble chart: "Storage A is the top partner candidate"

We keep the rule: **no intent inference**. AI behavioral interpretation or prediction is out of PoC scope.

## ★ Candidate libraries for implementation

Not finalized in PoC. Will be decided when implementation starts.

- Activity Timeline: custom (table + virtualized scroll) / TanStack Table
- Network graph: react-force-graph / visx / direct D3 / cytoscape.js
- Bubble chart: Recharts / visx / Tremor
