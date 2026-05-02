## Purpose

Macro Metrics dashboard provides a dedicated executive-level view of realistic offline demo metrics for paid usage, wallet behavior, ecosystem opportunities, endpoint behavior, and growth actions without live service dependencies.

## Requirements

### Requirement: Dedicated macro metrics page
The system SHALL provide a dedicated Macro Metrics dashboard page separate from the Co-usage Patterns page.

#### Scenario: User opens macro metrics from navigation
- **WHEN** a user selects the Macro Metrics navigation item
- **THEN** the system displays the Macro Metrics dashboard with executive-level metric sections

#### Scenario: Co-usage page remains focused
- **WHEN** a user opens the Co-usage Patterns page
- **THEN** the page does not include macro-only dashboard cards that belong to Macro Metrics

### Requirement: Realistic demo metric source
The system SHALL use realistic offline demo data to populate the Macro Metrics dashboard without live RPC or external service dependencies.

#### Scenario: Demo data is available offline
- **WHEN** the frontend runs in the default verification environment
- **THEN** Macro Metrics data is derived from local demo fixtures and pure helpers

#### Scenario: Metrics share a coherent story
- **WHEN** the dashboard renders paid usage, repeat, ecosystem, endpoint, and growth-action indicators
- **THEN** the indicators are derived from a consistent demo workflow dataset where practical

### Requirement: Overview macro KPIs
The Macro Metrics dashboard SHALL display overview KPIs for paid active wallets, total spend, paid usage or transaction count, and 7d / 30d trend.

#### Scenario: Overview KPIs render
- **WHEN** the Macro Metrics dashboard loads
- **THEN** it shows paid active wallets, total spend, paid usage or transaction count, and a 7d / 30d trend visualization or summary

### Requirement: Customer and wallet macro indicators
The Macro Metrics dashboard SHALL display spend concentration and repeat wallet indicators.

#### Scenario: Customer wallet indicators render
- **WHEN** the Macro Metrics dashboard loads
- **THEN** it shows a spend concentration view and a repeat wallet summary or repeat wallet rate

### Requirement: Ecosystem candidate indicators
The Macro Metrics dashboard SHALL display ecosystem indicators for other service candidates and shared spend or shared transaction rankings.

#### Scenario: Ecosystem rankings render
- **WHEN** the Macro Metrics dashboard loads
- **THEN** it shows other service candidates and ranks services by shared spend, shared transactions, or both

### Requirement: Endpoint behavior indicators
The Macro Metrics dashboard SHALL display endpoint category usage and endpoint category flow indicators.

#### Scenario: Endpoint indicators render
- **WHEN** the Macro Metrics dashboard loads
- **THEN** it shows endpoint category usage and a flow view or ranked transitions between endpoint categories

### Requirement: Growth action indicators
The Macro Metrics dashboard SHALL display action-oriented growth indicators, including source or intermediary ranking and recommendation-oriented cards.

#### Scenario: Growth action indicators render
- **WHEN** the Macro Metrics dashboard loads
- **THEN** it shows source or intermediary ranking and recommendation cards for upsell, co-marketing, repricing or discounting, and retention lift proxy insights

### Requirement: Advanced metric transparency
The Macro Metrics dashboard SHALL label demo/proxy metrics clearly when they are not live measured or statistically causal.

#### Scenario: Proxy metric is displayed
- **WHEN** a proxy metric such as true lift heatmap, retention lift, discount recommendation, or forest plot proxy is shown
- **THEN** the UI labels it as demo or proxy and avoids presenting it as a causal production metric

### Requirement: Tested metric helpers
Metric calculations for the Macro Metrics dashboard SHALL be implemented as pure TypeScript helpers with focused tests.

#### Scenario: Verification runs
- **WHEN** repository verification is executed
- **THEN** macro metric helper tests pass without requiring network access
