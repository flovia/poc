import { db, nowIso } from "../db";

type DailyMetricRow = {
  day: string;
  observation_count: number;
  candidate_count: number;
  unique_payers: number;
  unique_recipients: number;
  unique_relayers: number;
  total_amount_atomic: bigint;
};

const dayFromTimestamp = (epochSeconds: number) => new Date(epochSeconds * 1000).toISOString().slice(0, 10);

export const buildDailyMetrics = () => {
  const rows = db.prepare(`
    SELECT
      observation_id,
      amount_atomic,
      payer_wallet,
      recipient_wallet,
      relayer_wallet,
      block_timestamp
    FROM payment_observations
    ORDER BY block_timestamp
  `).all() as Array<{
    observation_id: number;
    amount_atomic: string;
    payer_wallet: string;
    recipient_wallet: string;
    relayer_wallet: string;
    block_timestamp: number;
  }>;

  const candidateCountsByObs = new Map<number, number>();
  const candidateRows = db.prepare(`SELECT observation_id, COUNT(*) AS count FROM attribution_candidates GROUP BY observation_id`).all() as Array<{
    observation_id: number;
    count: number;
  }>;
  for (const row of candidateRows) {
    candidateCountsByObs.set(row.observation_id, row.count);
  }

  const grouped = new Map<string, {
    observation_count: number;
    candidate_count: number;
    unique_payers: Set<string>;
    unique_recipients: Set<string>;
    unique_relayers: Set<string>;
    total_amount_atomic: bigint;
  }>();

  for (const row of rows) {
    const day = dayFromTimestamp(row.block_timestamp);
    const current = grouped.get(day) ?? {
      observation_count: 0,
      candidate_count: 0,
      unique_payers: new Set(),
      unique_recipients: new Set(),
      unique_relayers: new Set(),
      total_amount_atomic: 0n,
    };

    current.observation_count += 1;
    current.candidate_count += candidateCountsByObs.get(row.observation_id) ?? 0;
    current.unique_payers.add(row.payer_wallet);
    current.unique_recipients.add(row.recipient_wallet);
    current.unique_relayers.add(row.relayer_wallet);
    current.total_amount_atomic += BigInt(row.amount_atomic);

    grouped.set(day, current);
  }

  db.exec("DELETE FROM daily_metrics;");

  const insert = db.prepare(`
    INSERT INTO daily_metrics (
      day,
      observation_count,
      candidate_count,
      unique_payers,
      unique_recipients,
      unique_relayers,
      total_amount_atomic,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = nowIso();
  for (const [day, value] of grouped.entries()) {
    insert.run(
      day,
      value.observation_count,
      value.candidate_count,
      value.unique_payers.size,
      value.unique_recipients.size,
      value.unique_relayers.size,
      value.total_amount_atomic.toString(),
      now,
      now,
    );
  }

  return [...grouped.entries()].map(([day, value]) => ({
    day,
    observation_count: value.observation_count,
    candidate_count: value.candidate_count,
    unique_payers: value.unique_payers.size,
    unique_recipients: value.unique_recipients.size,
    unique_relayers: value.unique_relayers.size,
    total_amount_atomic: value.total_amount_atomic,
  })) as DailyMetricRow[];
};
