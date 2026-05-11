export type PgQueryResult<Row> = {
  rows: Row[];
  rowCount?: number;
};

export interface PgExecutor {
  query<Row>(sql: string, params: readonly unknown[]): Promise<PgQueryResult<Row>>;
}
