## ADDED Requirements

### Requirement: Dedicated full metrics catalog page
The system SHALL provide a dedicated Full Metrics Catalog page for reviewing all requested metrics separately from the Macro Metrics executive dashboard.

#### Scenario: User opens metrics catalog
- **WHEN** a user opens the Full Metrics Catalog page
- **THEN** the system displays a catalog organized by metric priority and product page/category

### Requirement: Complete requested metric coverage
The Full Metrics Catalog SHALL include every metric from the provided P0, P1, P2, and P3 list.

#### Scenario: Catalog renders all priorities
- **WHEN** the catalog loads
- **THEN** it includes P0, P1, P2, and P3 sections or filters

#### Scenario: Catalog renders all metric categories
- **WHEN** the catalog loads
- **THEN** it includes overview, customer/wallet intelligence, co-usage/ecosystem, source/intermediary, endpoint behavior, service comparison, growth action, pricing, latency/error, retention lift, workflow cluster, and causal-ish metrics

### Requirement: Metric explanation metadata
Each catalog metric SHALL display what it represents, why it matters, recommended visualization type, priority, and implementation/demo status.

#### Scenario: User reviews a metric card
- **WHEN** a user views any catalog metric
- **THEN** the metric shows its representation, business meaning, visualization recommendation, priority, and status

### Requirement: Demo-backed metric previews
Each catalog metric SHALL include a realistic demo preview value or visualization, even when the metric is not yet backed by live production data.

#### Scenario: Demo preview renders
- **WHEN** the catalog displays a metric
- **THEN** the metric includes a sample KPI, table, chart preview, heatmap, quadrant, flow, forest-style row, or explanatory placeholder derived from demo/proxy data

### Requirement: Explicit proxy and future-data labeling
Metrics that require richer instrumentation, causal/statistical modeling, or live data SHALL be visibly labeled as demo proxy, future analytics, or needs live instrumentation.

#### Scenario: Advanced metric renders
- **WHEN** a P2 or P3 advanced metric such as retention lift, pricing opportunity, latency, error rate, workflow clusters, or odds ratio is shown
- **THEN** the UI labels the metric as proxy/future/instrumentation-dependent and avoids presenting it as measured production truth

### Requirement: Catalog discoverability
The Full Metrics Catalog SHALL be reachable from the provider dashboard experience.

#### Scenario: User navigates from dashboard
- **WHEN** a user is viewing provider-scoped dashboard pages
- **THEN** the system provides a discoverable link or navigation item to the Full Metrics Catalog

### Requirement: Catalog fixture completeness tests
The system SHALL include tests that verify the catalog fixture includes the expected metric IDs and status metadata.

#### Scenario: Verification runs
- **WHEN** repository verification is executed
- **THEN** tests confirm the catalog includes all expected metric entries and status labels without requiring network access
