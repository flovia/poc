## ADDED Requirements

### Requirement: Semantic color aliases
The frontend SHALL define a semantic color alias layer for component usage without changing the existing base palette values.

#### Scenario: Base palette remains stable
- **WHEN** semantic aliases are added to the frontend stylesheet
- **THEN** existing base tokens for shell background, primary blue, teal, warning, danger, SDK purple, and chart gradients remain available with their current meanings

#### Scenario: Components can use semantic surface roles
- **WHEN** frontend components need page, card, elevated, subtle, muted, or selected surfaces
- **THEN** they can use semantic surface aliases instead of direct hex values

### Requirement: Color meaning rules
The frontend SHALL use semantic colors consistently according to their intended meaning.

#### Scenario: Priority uses blue
- **WHEN** the UI emphasizes primary, selected, priority, high-value, or main-series information
- **THEN** the UI uses blue priority or series tokens

#### Scenario: Metadata uses neutral gray
- **WHEN** the UI displays metadata, medium emphasis, neutral status, or hypothesis information
- **THEN** the UI uses neutral or metadata tokens rather than purple or teal

#### Scenario: Attention uses amber
- **WHEN** the UI displays dormant, attention, or warning information
- **THEN** the UI uses attention tokens based on amber

#### Scenario: Purple is reserved
- **WHEN** purple appears in the UI
- **THEN** it communicates SDK preview, demo, mock, or experimental state only

#### Scenario: Teal is reserved
- **WHEN** teal appears in the UI
- **THEN** it communicates positive or healthy secondary signals only

### Requirement: Distribution and quadrant visual consistency
The frontend SHALL present distribution and quadrant visuals with restrained semantic emphasis.

#### Scenario: Provider spread uses blue series
- **WHEN** provider spread or distribution bars are rendered
- **THEN** they use blue series tokens or shades rather than unrelated blue, teal, and purple categories

#### Scenario: Recency x Spend avoids broad tinted backgrounds
- **WHEN** Recency x Spend quadrant cards are rendered
- **THEN** they use neutral card surfaces with border, dot, or label emphasis instead of broad colored backgrounds

### Requirement: Direct color literals are reduced
The frontend SHALL prefer semantic CSS variables or Tailwind theme tokens over direct surface and semantic color literals in components.

#### Scenario: Component surface color is migrated
- **WHEN** a component surface color is touched during this change
- **THEN** common white, subtle, muted, hover, and selected colors are represented with semantic surface aliases where practical

#### Scenario: Layout remains unchanged
- **WHEN** color usage is migrated to semantic aliases
- **THEN** typography, spacing, routing, data contracts, and layout structure remain unchanged
