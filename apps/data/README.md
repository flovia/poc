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

By default, `docker-compose.postgres.yml` creates or reuses the named volume
`poc_data_postgres`. On a fresh machine this simply creates a new empty local DB.
On a machine that already ran `poc-data`, it can reuse the existing local volume
to inspect or continue against that state.

Reusing the old volume is a local migration convenience, not a project
requirement. Other environments can start from an empty DB and run migrations.
Do not run the old `poc-data` compose project and this app's compose project at
the same time: both bind host port `55432` and point at the same named volume by
default.

```sh
bun run --cwd apps/data postgres:up
DATABASE_URL=postgres://poc_data:poc_data@localhost:55432/poc_data_test \
  bun run --cwd apps/data migrate:status
```
