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

## Data source providers

`apps/data` also contains the first collector and enrichment adapters for the
provider transaction workstream. These adapters are intentionally split by role:
payment transfer collectors emit normalized observations, while enrichment
collectors add display/context data such as owner-wallet balances.

| Provider | Base transfers | Solana transfers | Solana balances | Role |
| --- | --- | --- | --- | --- |
| Alchemy | Primary via `alchemy_getAssetTransfers` | Primary via Solana JSON-RPC | - | Canonical payment collection |
| RPC Fast | - | Fallback via Solana JSON-RPC | - | Solana RPC fallback |
| Dune Sim | Validation/activity context | - | Yes | Enrichment and comparison |
| GoldRush | ERC-20 fallback/enrichment | - | Yes | Base fallback and Solana balance enrichment |
| CoinGecko | - | - | Yes, paired with Solana RPC | Price/value enrichment for wallet token balances |
| Nansen | - | - | Yes | Current address balance enrichment |

Exact Solana payment-transfer collection currently stays on Alchemy/RPC Fast
because Dune Sim and GoldRush REST do not reliably expose Pay.sh token-account
transfer history. Dune Sim and GoldRush are still useful for Solana owner-wallet
balance context.

Required live credentials are listed in `apps/data/.env.example`:

- `ALCHEMY_API_KEY`
- `RPC_FAST_API_KEY`
- `DUNE_SIM_API_KEY`
- `GOLDRUSH_API_KEY`
- `COINGECKO_API_KEY`
- `NANSEN_API_KEY`

RPC Fast uses the fixed Solana endpoint
`https://solana-rpc.rpcfast.com/`; only the API key is configured.

Live commands are explicit and are not part of `bun run verify`:

```sh
# Transfer observations, stdout only.
bun run --cwd apps/data collect:transfers -- \
  --source alchemy --chain solana --dry-run --limit 1

bun run --cwd apps/data collect:transfers -- \
  --source rpc-fast --chain solana --dry-run --limit 1

bun run --cwd apps/data collect:transfers -- \
  --source dune-sim --chain base --dry-run --from-block 45750000 --limit 1

bun run --cwd apps/data collect:transfers -- \
  --source goldrush --chain base --dry-run --from-block 45750000 --limit 1

# Solana balance enrichment, stdout only.
bun run --cwd apps/data collect:balances -- \
  --source dune-sim --chain solana --dry-run --limit 1

bun run --cwd apps/data collect:balances -- \
  --source goldrush --chain solana --dry-run --limit 1

bun run --cwd apps/data collect:balances -- \
  --source coingecko --chain solana --dry-run --limit 1

bun run --cwd apps/data collect:balances -- \
  --source nansen --chain solana --dry-run --limit 1

# Display-ready enrichment snapshot for one Pay.sh Solana target.
bun run --cwd apps/data enrich:provider -- \
  --target pay-sh-solana:first --dry-run
```

## Dune Sim demo path

Flovia uses Dune Sim's Solana SVM balances endpoint to turn a Pay.sh
provider wallet into product-ready balance context. The frontend shows the
result as `Balance 1.72 USDC`; the data app commands below show the live
endpoint-backed path that produces that enrichment data.

```sh
# 1. Fetch the Pay.sh Solana owner-wallet USDC balance through Dune Sim.
bun run --cwd apps/data collect:balances -- \
  --source dune-sim --chain solana --dry-run --limit 1

# 2. Build the provider enrichment snapshot used by the demo UI.
#    The output includes a `demo.partnerProof` section naming the SIM endpoint
#    and the UI-facing `Balance ... USDC` label. It also includes the same
#    normalized balance view from GoldRush, CoinGecko, and Nansen when their
#    credentials are present.
bun run --cwd apps/data enrich:provider -- \
  --target pay-sh-solana:first --dry-run
```

The relevant SIM integration is `GET /beta/svm/balances/{address}?chains=solana`.
CoinGecko does not provide wallet balances directly, so that adapter reads the
Solana token-account balance through JSON-RPC and uses CoinGecko for USDC price
enrichment. Nansen uses `POST /api/v1/profiler/address/current-balance`.
In this PoC, the frontend consumes a baked snapshot so the demo is stable, while
the live collector command remains reproducible for judges and local testing.

The first baked frontend enrichment fixture currently contains one public-safe
Pay.sh Solana owner address:

```text
payTo / owner: Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP
receive token account: 3m3xS513PgjPwnLbmGbgL4Nk62QEtwzuoXphVN3kfMNh
USDC mint: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

That fixture is a temporary static artifact until enrichment snapshots are
written through a BFF/Postgres read model.
