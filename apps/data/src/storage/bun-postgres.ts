import type { PgExecutor, PgQueryResult } from "./postgres.js";

type BunSqlLike = {
  unsafe<Row extends Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<Row[]>;
  close?(): Promise<void> | void;
};

export function createBunPostgresExecutor(sql: BunSqlLike = Bun.sql): PgExecutor {
  return {
    async query<Row>(query: string, params: readonly unknown[]): Promise<PgQueryResult<Row>> {
      const rows = await sql.unsafe(query, params);
      return { rows: rows as Row[], rowCount: rows.length };
    },
  };
}

export async function closeBunPostgres(sql: { close?(): Promise<void> | void } = Bun.sql) {
  await sql.close?.();
}
