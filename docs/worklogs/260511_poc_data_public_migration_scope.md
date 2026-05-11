# poc-data public migration scope

Branch: `feat/poc-data-public-migration`

Base commit: `f3ea9c4824269ebf5b1554f2e728ce8994ba5a89` (`develop` merge base)

## Clarified scope

This migration is intentionally narrowed to public-safe data and Postgres schema
foundation work. It does not import private operational history, local secrets,
generated outputs, or outdated helper scripts from `poc-data`.

## Source-of-truth decisions

- The current `poc` repository remains the latest/canonical source for GEO and
  Pay.sh work.
- `poc-data` geo-source content is not copied as a canonical fixture in this
  scaffold.
- The scaffold imports SQL migrations only, preserving schema history without
  copying local data or private notes.

## Alchemy and RPC distinction

- Showcase/demo RPC usage and provider transaction capture are distinct tracks.
- A Base Alchemy collector for provider transaction capture is not implemented
  in this scaffold yet.
- The Solana RPC configuration in `poc-data` was generic RPC configuration, not
  a Solana-specific Alchemy dependency.
- `apps/data/.env.example` includes optional placeholders for
  `ALCHEMY_BASE_RPC_URL` and `SOLANA_RPC_URL` only to reserve configuration names
  for future collector work.

## Database handling

- The app includes a Postgres 16 Alpine compose file compatible with the
  `poc-data` local setup.
- The compose file uses the named volume `poc_data_postgres`. On a fresh machine
  this creates a new empty local DB; on a machine that already ran `poc-data`, it
  can reuse the existing local volume for continuity.
- Reusing the old volume is a local migration convenience, not a project
  requirement. Other environments can start from an empty DB and run migrations.
- Do not run the old `poc-data` compose project and this repo's `apps/data`
  compose project at the same time because they share host port `55432` and the
  named volume.

## Included

- New `apps/data` workspace app.
- Public-safe SQL migrations copied unchanged from
  `/home/foxy/dev/work/flovia/poc-data/apps/cli/migrations/*.sql`.
- Minimal Bun SQL Postgres executor and migration runner/CLI.
- Local Postgres compose scaffold and `.env.example`.

## Excluded

- `poc-data` docs and worklogs.
- `.env` files, credentials, secrets, SQLite databases, generated DB files,
  `node_modules`, and `dist`.
- Legacy/outdated scripts and implementation code outside the minimal migration
  scaffold.
- `poc-data` geo-source as a canonical current fixture.
