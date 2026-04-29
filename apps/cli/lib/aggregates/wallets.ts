import { type AppDatabase, db, nowIso } from "../db";

export const rebuildWalletProfiles = (database: AppDatabase = db) => {
  const now = nowIso();

  const payerRows = database
    .prepare(`
      SELECT
        payer_wallet,
        recipient_wallet,
        relayer_wallet,
        amount_atomic,
        block_timestamp
      FROM payment_observations
    `)
    .all() as Array<{
    payer_wallet: string;
    recipient_wallet: string;
    relayer_wallet: string;
    amount_atomic: string;
    block_timestamp: number;
  }>;

  const payerMap = new Map<
    string,
    {
      observation_count: number;
      total_amount_atomic: bigint;
      uniqueRecipients: Set<string>;
      uniqueRelayers: Set<string>;
      firstSeenAt: number;
      lastSeenAt: number;
    }
  >();

  const recipientMap = new Map<
    string,
    {
      observation_count: number;
      total_amount_atomic: bigint;
      uniquePayers: Set<string>;
      uniqueRelayers: Set<string>;
      firstSeenAt: number;
      lastSeenAt: number;
    }
  >();

  const relayerMap = new Map<
    string,
    {
      observation_count: number;
      total_amount_atomic: bigint;
      uniquePayers: Set<string>;
      uniqueRecipients: Set<string>;
      firstSeenAt: number;
      lastSeenAt: number;
    }
  >();

  for (const row of payerRows) {
    const payer = payerMap.get(row.payer_wallet);
    if (payer) {
      payer.observation_count += 1;
      payer.total_amount_atomic += BigInt(row.amount_atomic);
      payer.uniqueRecipients.add(row.recipient_wallet);
      payer.uniqueRelayers.add(row.relayer_wallet);
      payer.firstSeenAt = Math.min(payer.firstSeenAt, row.block_timestamp);
      payer.lastSeenAt = Math.max(payer.lastSeenAt, row.block_timestamp);
    } else {
      payerMap.set(row.payer_wallet, {
        observation_count: 1,
        total_amount_atomic: BigInt(row.amount_atomic),
        uniqueRecipients: new Set([row.recipient_wallet]),
        uniqueRelayers: new Set([row.relayer_wallet]),
        firstSeenAt: row.block_timestamp,
        lastSeenAt: row.block_timestamp,
      });
    }

    const recipient = recipientMap.get(row.recipient_wallet);
    if (recipient) {
      recipient.observation_count += 1;
      recipient.total_amount_atomic += BigInt(row.amount_atomic);
      recipient.uniquePayers.add(row.payer_wallet);
      recipient.uniqueRelayers.add(row.relayer_wallet);
      recipient.firstSeenAt = Math.min(recipient.firstSeenAt, row.block_timestamp);
      recipient.lastSeenAt = Math.max(recipient.lastSeenAt, row.block_timestamp);
    } else {
      recipientMap.set(row.recipient_wallet, {
        observation_count: 1,
        total_amount_atomic: BigInt(row.amount_atomic),
        uniquePayers: new Set([row.payer_wallet]),
        uniqueRelayers: new Set([row.relayer_wallet]),
        firstSeenAt: row.block_timestamp,
        lastSeenAt: row.block_timestamp,
      });
    }

    const relayer = relayerMap.get(row.relayer_wallet);
    if (relayer) {
      relayer.observation_count += 1;
      relayer.total_amount_atomic += BigInt(row.amount_atomic);
      relayer.uniquePayers.add(row.payer_wallet);
      relayer.uniqueRecipients.add(row.recipient_wallet);
      relayer.firstSeenAt = Math.min(relayer.firstSeenAt, row.block_timestamp);
      relayer.lastSeenAt = Math.max(relayer.lastSeenAt, row.block_timestamp);
    } else {
      relayerMap.set(row.relayer_wallet, {
        observation_count: 1,
        total_amount_atomic: BigInt(row.amount_atomic),
        uniquePayers: new Set([row.payer_wallet]),
        uniqueRecipients: new Set([row.recipient_wallet]),
        firstSeenAt: row.block_timestamp,
        lastSeenAt: row.block_timestamp,
      });
    }
  }

  const insertPayer = database.prepare(`
    INSERT INTO payer_wallet_profiles (
      wallet,
      observation_count,
      total_amount_atomic,
      unique_recipients,
      unique_relayers,
      first_seen_at,
      last_seen_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertRecipient = database.prepare(`
    INSERT INTO recipient_summaries (
      wallet,
      observation_count,
      total_amount_atomic,
      unique_payers,
      unique_relayers,
      first_seen_at,
      last_seen_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertRelayer = database.prepare(`
    INSERT INTO relayer_summaries (
      wallet,
      observation_count,
      total_amount_atomic,
      unique_payers,
      unique_recipients,
      first_seen_at,
      last_seen_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const rebuild = database.transaction(() => {
    database.exec("DELETE FROM payer_wallet_profiles;");
    database.exec("DELETE FROM recipient_summaries;");
    database.exec("DELETE FROM relayer_summaries;");

    for (const [wallet, profile] of payerMap.entries()) {
      insertPayer.run(
        wallet,
        profile.observation_count,
        profile.total_amount_atomic.toString(),
        profile.uniqueRecipients.size,
        profile.uniqueRelayers.size,
        profile.firstSeenAt,
        profile.lastSeenAt,
        now,
      );
    }

    for (const [wallet, profile] of recipientMap.entries()) {
      insertRecipient.run(
        wallet,
        profile.observation_count,
        profile.total_amount_atomic.toString(),
        profile.uniquePayers.size,
        profile.uniqueRelayers.size,
        profile.firstSeenAt,
        profile.lastSeenAt,
        now,
      );
    }

    for (const [wallet, profile] of relayerMap.entries()) {
      insertRelayer.run(
        wallet,
        profile.observation_count,
        profile.total_amount_atomic.toString(),
        profile.uniquePayers.size,
        profile.uniqueRecipients.size,
        profile.firstSeenAt,
        profile.lastSeenAt,
        now,
      );
    }
  });
  rebuild();

  return {
    payerProfiles: payerMap.size,
    recipientProfiles: recipientMap.size,
    relayerProfiles: relayerMap.size,
  };
};
