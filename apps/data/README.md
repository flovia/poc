# Data app

`apps/data` owns the public-safe data and Postgres schema utilities imported from
`poc-data`. It provides the SQL migration set, a minimal Bun SQL Postgres
executor, and migration CLI commands for continuing data work in this repository.

Intentionally excluded from the migration:

- `poc-data` docs and worklogs
- `.env` files, secrets, local databases, `node_modules`, and `dist`
- legacy or outdated scripts that are not needed for the narrowed scaffold

The current source of truth for GEO / Pay.sh remains the current `poc` files.
The `poc-data` geo-source content is not imported as a canonical fixture in this
scaffold.

## Postgres strategy

For local continuity, prefer reusing the existing `poc_data_postgres` Docker
volume with `docker-compose.postgres.yml`. This mirrors the `poc-data` local DB
shape and lets the migration runner inspect or continue against existing local
state.

Alternatively, create a fresh local DB with the same compose file. Do not run
the old `poc-data` compose project and this app's compose project at the same
time: both bind host port `55432` and intentionally point at the same named
volume by default.

```sh
bun run --cwd apps/data postgres:up
DATABASE_URL=postgres://poc_data:poc_data@localhost:55432/poc_data_test \
  bun run --cwd apps/data migrate:status
```
