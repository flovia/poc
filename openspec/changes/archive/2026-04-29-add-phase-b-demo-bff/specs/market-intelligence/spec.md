## MODIFIED Requirements

### Requirement: BFF must not call external sources per request

In the initial market intelligence design, the BFF request handler MUST NOT call CDP or Bitquery directly for product reads. The Phase B demo BFF must treat Phase A snapshot / projection-equivalent values as prepared demo fixtures or read models, and distinguish fields explainable as `onchain_fact` from demo / future / derived fields.

#### Scenario: add market intelligence endpoint after this change

- **WHEN** a BFF market intelligence endpoint is implemented after this change
- **THEN** the endpoint does not issue live Bitquery GraphQL calls for each user request
- **THEN** it reads generated snapshot, projection, stored data, or prepared demo read model

#### Scenario: Phase B read model includes Phase A-equivalent values

- **WHEN** a Phase B BFF response includes Phase A snapshot / projection-equivalent values such as wallet, `pay_to`, payment frequency, and co-usage
- **THEN** the system returns those values as `onchain_fact` from prepared demo read model and does not re-fetch them in the request path
