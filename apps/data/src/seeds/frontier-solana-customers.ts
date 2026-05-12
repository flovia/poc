import type { PgExecutor } from "../storage/postgres.js";

export const SOLANA_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const FRONTIER_DEMO_SEED_SOURCE = "frontier-final-polish-demo";
export const FRONTIER_DEMO_TARGET_SOURCE = "frontier_demo";

export type FrontierSolanaCustomerTransferSeed = {
  id: string;
  signature: string;
  blockSlot: bigint;
  blockTimestamp: string;
  fromTokenAccount: string;
  customerLabel: string;
};

export type FrontierSolanaCustomerResourceSeed = {
  resourceUrl: string;
  description: string;
  method: string;
  transactionCount: number;
};

export type FrontierSolanaCustomerSeed = {
  providerFqn: string;
  title: string;
  category: string;
  serviceUrl: string;
  description: string;
  useCase: string;
  endpointCount: number;
  payToAddress: string;
  resolvedReceiveAddress: string;
  probePriceUsd: number;
  resources: readonly FrontierSolanaCustomerResourceSeed[];
  transfers: readonly FrontierSolanaCustomerTransferSeed[];
};

export const FRONTIER_SOLANA_CUSTOMER_SEEDS = [
  {
    providerFqn: "api.nansen.ai",
    title: "Nansen",
    category: "Analytics",
    serviceUrl: "https://api.nansen.ai",
    description: "Smart-money wallet intelligence and token flow APIs.",
    useCase: "Profile Solana and Base wallets before deciding who to upsell.",
    endpointCount: 30,
    payToAddress: "J7ZvJEspvwP1oRxQZ7mYmNmT22NTm3GWq3t7HEbvPZYx",
    resolvedReceiveAddress: "J7ZvJEspvwP1oRxQZ7mYmNmT22NTm3GWq3t7HEbvPZYx",
    probePriceUsd: 0.05,
    resources: [
      {
        resourceUrl: "https://api.nansen.ai/v1/wallets/profiler",
        description: "Wallet intelligence profile used by research and trading agents.",
        method: "GET",
        transactionCount: 3,
      },
      {
        resourceUrl: "https://api.nansen.ai/v1/smart-money/flows",
        description: "Smart-money token flow signals for Solana wallets.",
        method: "GET",
        transactionCount: 2,
      },
    ],
    transfers: [
      {
        id: "frontier-demo:nansen:solana:001",
        signature: "5NansenFrontierDemoSignature111111111111111111111111111111111111111",
        blockSlot: 419_010_001n,
        blockTimestamp: "2026-05-12T08:10:00.000Z",
        fromTokenAccount: "2hYY7wHhXsoWnskQRzYFUNH7YboXNMEqbGnAFHpRuB2W",
        customerLabel: "Trading desk bot",
      },
      {
        id: "frontier-demo:nansen:solana:002",
        signature: "5NansenFrontierDemoSignature222222222222222222222222222222222222222",
        blockSlot: 419_010_880n,
        blockTimestamp: "2026-05-12T08:28:00.000Z",
        fromTokenAccount: "9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ",
        customerLabel: "Fund analyst",
      },
      {
        id: "frontier-demo:nansen:solana:003",
        signature: "5NansenFrontierDemoSignature333333333333333333333333333333333333333",
        blockSlot: 419_011_320n,
        blockTimestamp: "2026-05-12T08:43:00.000Z",
        fromTokenAccount: "8MPzJeXx1RipFmRADExptc3UK4EV3nhEFN6NRSx7o7jm",
        customerLabel: "Autonomous research agent",
      },
      {
        id: "frontier-demo:nansen:solana:004",
        signature: "5NansenFrontierDemoSignature444444444444444444444444444444444444444",
        blockSlot: 419_012_060n,
        blockTimestamp: "2026-05-12T09:02:00.000Z",
        fromTokenAccount: "2hYY7wHhXsoWnskQRzYFUNH7YboXNMEqbGnAFHpRuB2W",
        customerLabel: "Trading desk bot",
      },
      {
        id: "frontier-demo:nansen:solana:005",
        signature: "5NansenFrontierDemoSignature555555555555555555555555555555555555555",
        blockSlot: 419_012_960n,
        blockTimestamp: "2026-05-12T09:21:00.000Z",
        fromTokenAccount: "BX1v9we4BCt28GM3hWwfXwnXDXpYHKWMFcWaHNytnbNL",
        customerLabel: "Ops wallet monitor",
      },
      {
        id: "frontier-demo:nansen:solana:006",
        signature: "5NansenFrontierDemoSignature666666666666666666666666666666666666666",
        blockSlot: 419_014_620n,
        blockTimestamp: "2026-05-12T10:05:00.000Z",
        fromTokenAccount: "9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ",
        customerLabel: "Fund analyst",
      },
      {
        id: "frontier-demo:nansen:solana:007",
        signature: "5NansenFrontierDemoSignature777777777777777777777777777777777777777",
        blockSlot: 419_014_980n,
        blockTimestamp: "2026-05-12T10:12:00.000Z",
        fromTokenAccount: "9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ",
        customerLabel: "Fund analyst",
      },
      {
        id: "frontier-demo:nansen:solana:008",
        signature: "5NansenFrontierDemoSignature888888888888888888888888888888888888888",
        blockSlot: 419_015_340n,
        blockTimestamp: "2026-05-12T10:19:00.000Z",
        fromTokenAccount: "9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ",
        customerLabel: "Fund analyst",
      },
      {
        id: "frontier-demo:nansen:solana:009",
        signature: "5NansenFrontierDemoSignature999999999999999999999999999999999999999",
        blockSlot: 419_015_700n,
        blockTimestamp: "2026-05-12T10:26:00.000Z",
        fromTokenAccount: "9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ",
        customerLabel: "Fund analyst",
      },
      {
        id: "frontier-demo:nansen:solana:010",
        signature: "5NansenFrontierDemoSignature101010101010101010101010101010101010101",
        blockSlot: 419_016_060n,
        blockTimestamp: "2026-05-12T10:33:00.000Z",
        fromTokenAccount: "9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ",
        customerLabel: "Fund analyst",
      },
      {
        id: "frontier-demo:nansen:solana:011",
        signature: "5NansenFrontierDemoSignature111111111111111111111111111111111111112",
        blockSlot: 419_016_420n,
        blockTimestamp: "2026-05-12T10:40:00.000Z",
        fromTokenAccount: "9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ",
        customerLabel: "Fund analyst",
      },
    ],
  },
  {
    providerFqn: "pro-api.coingecko.com",
    title: "pro-api.coingecko.com",
    category: "Market Data",
    serviceUrl: "https://pro-api.coingecko.com",
    description: "Token price, pool, and market data APIs.",
    useCase: "Power agents that quote and reconcile token prices.",
    endpointCount: 6,
    payToAddress: "H3kXo4FxmKqLMqYvH3SJKpynSCuRy8CrK4ZyP8f4J7Vd",
    resolvedReceiveAddress: "F2R6qDT9mXvNs8hJ4Yk3WmQp5Tb7ZcA1uE9DgLr6PqHs",
    probePriceUsd: 0.01,
    resources: [
      {
        resourceUrl: "https://pro-api.coingecko.com/api/v3/simple/price",
        description: "Token spot price lookup for route quoting agents.",
        method: "GET",
        transactionCount: 3,
      },
      {
        resourceUrl:
          "https://pro-api.coingecko.com/api/v3/onchain/networks/solana/tokens/{address}",
        description: "Solana token market metadata and liquidity context.",
        method: "GET",
        transactionCount: 1,
      },
    ],
    transfers: [
      {
        id: "frontier-demo:coingecko:solana:001",
        signature: "5CoinGeckoFrontierDemoSignature11111111111111111111111111111111111",
        blockSlot: 419_012_010n,
        blockTimestamp: "2026-05-12T09:00:00.000Z",
        fromTokenAccount: "7r4e5dwNS68MDaxbw7N8jbzHq7RCMBp9z6smHFH4NXWw",
        customerLabel: "Price routing bot",
      },
      {
        id: "frontier-demo:coingecko:solana:002",
        signature: "5CoinGeckoFrontierDemoSignature22222222222222222222222222222222222",
        blockSlot: 419_012_740n,
        blockTimestamp: "2026-05-12T09:17:00.000Z",
        fromTokenAccount: "9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ",
        customerLabel: "Market data desk",
      },
      {
        id: "frontier-demo:coingecko:solana:003",
        signature: "5CoinGeckoFrontierDemoSignature33333333333333333333333333333333333",
        blockSlot: 419_013_030n,
        blockTimestamp: "2026-05-12T09:30:00.000Z",
        fromTokenAccount: "7r4e5dwNS68MDaxbw7N8jbzHq7RCMBp9z6smHFH4NXWw",
        customerLabel: "Price routing bot",
      },
      {
        id: "frontier-demo:coingecko:solana:004",
        signature: "5CoinGeckoFrontierDemoSignature44444444444444444444444444444444444",
        blockSlot: 419_013_460n,
        blockTimestamp: "2026-05-12T09:39:00.000Z",
        fromTokenAccount: "Ab4tooTiV5tWj5tiYHnw2t2p4QHcYjEMd4ZboB8JpF5q",
        customerLabel: "Index rebalance agent",
      },
      {
        id: "frontier-demo:coingecko:solana:005",
        signature: "5CoinGeckoFrontierDemoSignature55555555555555555555555555555555555",
        blockSlot: 419_016_780n,
        blockTimestamp: "2026-05-12T10:47:00.000Z",
        fromTokenAccount: "9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ",
        customerLabel: "Market data desk",
      },
      {
        id: "frontier-demo:coingecko:solana:006",
        signature: "5CoinGeckoFrontierDemoSignature66666666666666666666666666666666666",
        blockSlot: 419_017_140n,
        blockTimestamp: "2026-05-12T10:54:00.000Z",
        fromTokenAccount: "9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ",
        customerLabel: "Market data desk",
      },
      {
        id: "frontier-demo:coingecko:solana:007",
        signature: "5CoinGeckoFrontierDemoSignature77777777777777777777777777777777777",
        blockSlot: 419_017_500n,
        blockTimestamp: "2026-05-12T11:01:00.000Z",
        fromTokenAccount: "9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ",
        customerLabel: "Market data desk",
      },
      {
        id: "frontier-demo:coingecko:solana:008",
        signature: "5CoinGeckoFrontierDemoSignature88888888888888888888888888888888888",
        blockSlot: 419_017_860n,
        blockTimestamp: "2026-05-12T11:08:00.000Z",
        fromTokenAccount: "9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ",
        customerLabel: "Market data desk",
      },
      {
        id: "frontier-demo:coingecko:solana:009",
        signature: "5CoinGeckoFrontierDemoSignature99999999999999999999999999999999999",
        blockSlot: 419_018_220n,
        blockTimestamp: "2026-05-12T11:15:00.000Z",
        fromTokenAccount: "9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ",
        customerLabel: "Market data desk",
      },
    ],
  },
  {
    providerFqn: "stableemail",
    title: "StableEmail",
    category: "Communication",
    serviceUrl: "https://stable.email",
    description: "Email and notification APIs paid through stablecoin rails.",
    useCase: "Notify users when agent workflows settle or fail.",
    endpointCount: 4,
    payToAddress: "7r4e5dwNS68MDaxbw7N8jbzHq7RCMBp9z6smHFH4NXWw",
    resolvedReceiveAddress: "UXva6DWoRiNmwWtXHAmXXqjtpS1cnwfFPk1KSEnCDyS",
    probePriceUsd: 0.02,
    resources: [
      {
        resourceUrl: "https://stable.email/v1/messages/send",
        description: "Send wallet-aware settlement and workflow notifications.",
        method: "POST",
        transactionCount: 2,
      },
      {
        resourceUrl: "https://stable.email/v1/templates/render",
        description: "Render transactional email content for autonomous agents.",
        method: "POST",
        transactionCount: 1,
      },
    ],
    transfers: [
      {
        id: "frontier-demo:stableemail:solana:001",
        signature: "5StableEmailFrontierDemoSignature111111111111111111111111111111111",
        blockSlot: 419_013_100n,
        blockTimestamp: "2026-05-12T09:29:00.000Z",
        fromTokenAccount: "HgZtbsqE7MdPcUipeuiiNEMuLByDAXE4X9qrH1w6LdDz",
        customerLabel: "Notification worker",
      },
      {
        id: "frontier-demo:stableemail:solana:002",
        signature: "5StableEmailFrontierDemoSignature222222222222222222222222222222222",
        blockSlot: 419_013_820n,
        blockTimestamp: "2026-05-12T09:47:00.000Z",
        fromTokenAccount: "9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ",
        customerLabel: "CRM automation",
      },
      {
        id: "frontier-demo:stableemail:solana:003",
        signature: "5StableEmailFrontierDemoSignature333333333333333333333333333333333",
        blockSlot: 419_014_210n,
        blockTimestamp: "2026-05-12T09:56:00.000Z",
        fromTokenAccount: "HgZtbsqE7MdPcUipeuiiNEMuLByDAXE4X9qrH1w6LdDz",
        customerLabel: "Notification worker",
      },
      {
        id: "frontier-demo:stableemail:solana:004",
        signature: "5StableEmailFrontierDemoSignature444444444444444444444444444444444",
        blockSlot: 419_018_580n,
        blockTimestamp: "2026-05-12T11:22:00.000Z",
        fromTokenAccount: "9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ",
        customerLabel: "CRM automation",
      },
      {
        id: "frontier-demo:stableemail:solana:005",
        signature: "5StableEmailFrontierDemoSignature555555555555555555555555555555555",
        blockSlot: 419_018_940n,
        blockTimestamp: "2026-05-12T11:29:00.000Z",
        fromTokenAccount: "9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ",
        customerLabel: "CRM automation",
      },
      {
        id: "frontier-demo:stableemail:solana:006",
        signature: "5StableEmailFrontierDemoSignature666666666666666666666666666666666",
        blockSlot: 419_019_300n,
        blockTimestamp: "2026-05-12T11:36:00.000Z",
        fromTokenAccount: "9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ",
        customerLabel: "CRM automation",
      },
      {
        id: "frontier-demo:stableemail:solana:007",
        signature: "5StableEmailFrontierDemoSignature777777777777777777777777777777777",
        blockSlot: 419_019_660n,
        blockTimestamp: "2026-05-12T11:43:00.000Z",
        fromTokenAccount: "9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ",
        customerLabel: "CRM automation",
      },
    ],
  },
] as const satisfies readonly FrontierSolanaCustomerSeed[];

export async function seedFrontierSolanaCustomers(
  executor: PgExecutor,
  seeds: readonly FrontierSolanaCustomerSeed[] = FRONTIER_SOLANA_CUSTOMER_SEEDS,
): Promise<{
  providers: number;
  offers: number;
  resources: number;
  targets: number;
  transfers: number;
}> {
  let providers = 0;
  let offers = 0;
  let resources = 0;
  let targets = 0;
  let transfers = 0;

  for (const seed of seeds) {
    await upsertProvider(executor, seed);
    providers += 1;
    await upsertOffer(executor, seed);
    offers += 1;
    for (const [resourceIndex, resource] of seed.resources.entries()) {
      await upsertResource(executor, seed, resource, resourceIndex);
      resources += 1;
    }
    await upsertTarget(executor, seed);
    targets += 1;
    for (const transfer of seed.transfers) {
      await upsertTransfer(executor, seed, transfer);
      transfers += 1;
    }
  }

  return { providers, offers, resources, targets, transfers };
}

export async function removeFrontierSolanaCustomerDemoSeed(executor: PgExecutor): Promise<{
  transfers: number;
  targets: number;
  resources: number;
  offers: number;
  providers: number;
}> {
  const transferResult = await executor.query<{ id: string }>(
    `
      DELETE FROM goldsky_webhook_token_transfers_solana
      WHERE id LIKE 'frontier-demo:%'
         OR raw_payload ->> 'demoSeedSource' = $1
      RETURNING id
    `,
    [FRONTIER_DEMO_SEED_SOURCE],
  );
  const targetResult = await executor.query<{ id: string }>(
    `
      DELETE FROM payment_collection_targets
      WHERE source = $1
         OR resolution_method = $2
      RETURNING id
    `,
    [FRONTIER_DEMO_TARGET_SOURCE, FRONTIER_DEMO_SEED_SOURCE],
  );
  const resourceResult = await executor.query<{ id: string }>(
    `
      DELETE FROM pay_sh_provider_resources
      WHERE source_document = $1
      RETURNING id
    `,
    [FRONTIER_DEMO_SEED_SOURCE],
  );
  const offerResult = await executor.query<{ id: string }>(
    `
      DELETE FROM pay_sh_payment_offers
      WHERE source_document = $1
      RETURNING id
    `,
    [FRONTIER_DEMO_SEED_SOURCE],
  );
  const providerResult = await executor.query<{ provider_fqn: string }>(
    `
      DELETE FROM pay_sh_providers
      WHERE source_document = $1
      RETURNING provider_fqn
    `,
    [FRONTIER_DEMO_SEED_SOURCE],
  );

  return {
    transfers: transferResult.rowCount ?? transferResult.rows.length,
    targets: targetResult.rowCount ?? targetResult.rows.length,
    resources: resourceResult.rowCount ?? resourceResult.rows.length,
    offers: offerResult.rowCount ?? offerResult.rows.length,
    providers: providerResult.rowCount ?? providerResult.rows.length,
  };
}

async function upsertProvider(executor: PgExecutor, seed: FrontierSolanaCustomerSeed) {
  await executor.query(
    `
      INSERT INTO pay_sh_providers (
        provider_fqn,
        title,
        category,
        service_url,
        description,
        use_case,
        endpoint_count,
        source_document
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (provider_fqn) DO UPDATE SET
        title = EXCLUDED.title,
        category = EXCLUDED.category,
        service_url = EXCLUDED.service_url,
        description = EXCLUDED.description,
        use_case = EXCLUDED.use_case,
        endpoint_count = GREATEST(pay_sh_providers.endpoint_count, EXCLUDED.endpoint_count),
        updated_at = now()
    `,
    [
      seed.providerFqn,
      seed.title,
      seed.category,
      seed.serviceUrl,
      seed.description,
      seed.useCase,
      seed.endpointCount,
      FRONTIER_DEMO_SEED_SOURCE,
    ],
  );
}

async function upsertOffer(executor: PgExecutor, seed: FrontierSolanaCustomerSeed) {
  await executor.query(
    `
      INSERT INTO pay_sh_payment_offers (
        provider_fqn,
        protocol,
        chain,
        asset,
        pay_to_address,
        probe_price_usd,
        source_document
      ) VALUES ($1, 'x402', 'solana', 'USDC', $2, $3, $4)
      ON CONFLICT (provider_fqn, protocol, chain, asset, pay_to_address, probe_price_usd) DO UPDATE SET
        updated_at = now()
    `,
    [seed.providerFqn, seed.payToAddress, seed.probePriceUsd, FRONTIER_DEMO_SEED_SOURCE],
  );
}

async function upsertResource(
  executor: PgExecutor,
  seed: FrontierSolanaCustomerSeed,
  resource: FrontierSolanaCustomerResourceSeed,
  resourceIndex: number,
) {
  await executor.query(
    `
      INSERT INTO pay_sh_provider_resources (
        provider_fqn,
        resource_url,
        resource_index,
        description,
        method,
        networks,
        assets,
        transaction_count,
        observed_spend_atomic,
        source_document,
        raw_resource
      ) VALUES ($1, $2, $3, $4, $5, '["solana mainnet"]'::jsonb, '["USDC"]'::jsonb, $6, $7, $8, $9::jsonb)
      ON CONFLICT (provider_fqn, resource_url) DO UPDATE SET
        resource_index = EXCLUDED.resource_index,
        description = EXCLUDED.description,
        method = EXCLUDED.method,
        networks = EXCLUDED.networks,
        assets = EXCLUDED.assets,
        transaction_count = EXCLUDED.transaction_count,
        observed_spend_atomic = EXCLUDED.observed_spend_atomic,
        source_document = EXCLUDED.source_document,
        raw_resource = EXCLUDED.raw_resource,
        updated_at = now()
    `,
    [
      seed.providerFqn,
      resource.resourceUrl,
      resourceIndex,
      resource.description,
      resource.method,
      resource.transactionCount,
      (
        BigInt(Math.round(seed.probePriceUsd * 1_000_000)) * BigInt(resource.transactionCount)
      ).toString(),
      FRONTIER_DEMO_SEED_SOURCE,
      JSON.stringify({
        demoData: true,
        demoSeedSource: FRONTIER_DEMO_SEED_SOURCE,
        removableWith: "bun run --cwd apps/data seed:frontier-solana-customers -- --remove",
      }),
    ],
  );
}

async function upsertTarget(executor: PgExecutor, seed: FrontierSolanaCustomerSeed) {
  await executor.query(
    `
      INSERT INTO payment_collection_targets (
        source,
        protocol,
        provider_fqn,
        chain,
        asset,
        pay_to_address,
        resolved_receive_address,
        resolved_receive_address_type,
        token_mint_address,
        resolution_method,
        shared_payto,
        probe_price_usd
      ) VALUES ($1, 'x402', $2, 'solana', 'USDC', $3, $4, 'solana_token_account', $5, $6, false, $7)
      ON CONFLICT (
        source,
        protocol,
        provider_fqn,
        chain,
        asset,
        pay_to_address,
        resolved_receive_address
      ) DO UPDATE SET
        token_mint_address = EXCLUDED.token_mint_address,
        probe_price_usd = EXCLUDED.probe_price_usd,
        updated_at = now()
    `,
    [
      FRONTIER_DEMO_TARGET_SOURCE,
      seed.providerFqn,
      seed.payToAddress,
      seed.resolvedReceiveAddress,
      SOLANA_USDC_MINT,
      FRONTIER_DEMO_SEED_SOURCE,
      seed.probePriceUsd,
    ],
  );
}

async function upsertTransfer(
  executor: PgExecutor,
  seed: FrontierSolanaCustomerSeed,
  transfer: FrontierSolanaCustomerTransferSeed,
) {
  const amountAtomic = Math.round(seed.probePriceUsd * 1_000_000).toString();
  await executor.query(
    `
      INSERT INTO goldsky_webhook_token_transfers_solana (
        id,
        signature,
        block_slot,
        block_timestamp,
        token_mint_address,
        from_token_account,
        to_token_account,
        amount,
        decimals,
        gs_op,
        raw_payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 6, 'INSERT', $9::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        block_slot = EXCLUDED.block_slot,
        block_timestamp = EXCLUDED.block_timestamp,
        from_token_account = EXCLUDED.from_token_account,
        to_token_account = EXCLUDED.to_token_account,
        amount = EXCLUDED.amount,
        raw_payload = EXCLUDED.raw_payload
    `,
    [
      transfer.id,
      transfer.signature,
      transfer.blockSlot,
      transfer.blockTimestamp,
      SOLANA_USDC_MINT,
      transfer.fromTokenAccount,
      seed.resolvedReceiveAddress,
      amountAtomic,
      JSON.stringify({
        demoData: true,
        demoSeedSource: FRONTIER_DEMO_SEED_SOURCE,
        providerFqn: seed.providerFqn,
        customerLabel: transfer.customerLabel,
        removableWith: "bun run --cwd apps/data seed:frontier-solana-customers -- --remove",
      }),
    ],
  );
}
