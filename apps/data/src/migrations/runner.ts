import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PgExecutor } from "../storage/postgres.js";

const SCHEMA_MIGRATIONS_SQL = `CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  name text NOT NULL,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);`;

export type MigrationFile = {
  version: string;
  name: string;
  fileName: string;
  path: string;
  sql: string;
  checksum: string;
};

export type MigrationStatus = {
  version: string;
  name: string;
  checksum: string;
  applied: boolean;
  appliedAt?: string;
};

export type RunMigrationsResult = {
  applied: MigrationStatus[];
  pending: MigrationStatus[];
};

export function defaultMigrationsDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..", "migrations");
}

function checksum(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

function parseMigrationFileName(fileName: string): { version: string; name: string } | undefined {
  const match = /^(\d+)_(.+)\.sql$/.exec(fileName);
  if (!match) return undefined;
  return { version: match[1] ?? "", name: match[2] ?? "" };
}

export async function readMigrationFiles(
  migrationsDir = defaultMigrationsDir(),
): Promise<MigrationFile[]> {
  const entries = await readdir(migrationsDir);
  const files = await Promise.all(
    entries
      .flatMap((fileName) => {
        const parsed = parseMigrationFileName(fileName);
        return parsed ? [{ fileName, ...parsed }] : [];
      })
      .sort((left, right) => left.version.localeCompare(right.version))
      .map(async ({ fileName, version, name }) => {
        const path = join(migrationsDir, fileName);
        const sql = await readFile(path, "utf8");
        return { version, name, fileName, path, sql, checksum: checksum(sql) };
      }),
  );
  return files;
}

async function ensureSchemaMigrations(executor: PgExecutor): Promise<void> {
  await executor.query(SCHEMA_MIGRATIONS_SQL, []);
}

async function appliedRows(
  executor: PgExecutor,
): Promise<Map<string, { checksum: string; appliedAt: string }>> {
  const result = await executor.query<{
    version: string;
    checksum: string;
    applied_at: string | Date;
  }>("SELECT version, checksum, applied_at FROM schema_migrations", []);
  return new Map(
    result.rows.map((row) => [
      row.version,
      {
        checksum: row.checksum,
        appliedAt: row.applied_at instanceof Date ? row.applied_at.toISOString() : row.applied_at,
      },
    ]),
  );
}

export async function getMigrationStatus(
  executor: PgExecutor,
  migrationsDir?: string,
): Promise<MigrationStatus[]> {
  await ensureSchemaMigrations(executor);
  const [files, applied] = await Promise.all([
    readMigrationFiles(migrationsDir),
    appliedRows(executor),
  ]);
  return files.map((file) => {
    const appliedRow = applied.get(file.version);
    if (appliedRow && appliedRow.checksum !== file.checksum) {
      throw new Error(`migration checksum drift detected: ${file.fileName}`);
    }
    return {
      version: file.version,
      name: file.name,
      checksum: file.checksum,
      applied: appliedRow !== undefined,
      ...(appliedRow ? { appliedAt: appliedRow.appliedAt } : {}),
    } satisfies MigrationStatus;
  });
}

export async function runMigrations(
  executor: PgExecutor,
  migrationsDir?: string,
): Promise<RunMigrationsResult> {
  await ensureSchemaMigrations(executor);
  const files = await readMigrationFiles(migrationsDir);
  const applied = await appliedRows(executor);
  const appliedStatuses: MigrationStatus[] = [];
  const pendingStatuses: MigrationStatus[] = [];
  for (const file of files) {
    const appliedRow = applied.get(file.version);
    if (appliedRow) {
      if (appliedRow.checksum !== file.checksum) {
        throw new Error(`migration checksum drift detected: ${file.fileName}`);
      }
      appliedStatuses.push({
        version: file.version,
        name: file.name,
        checksum: file.checksum,
        applied: true,
        appliedAt: appliedRow.appliedAt,
      });
      continue;
    }
    await executor.query(file.sql, []);
    await executor.query(
      "INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)",
      [file.version, file.name, file.checksum],
    );
    pendingStatuses.push({
      version: file.version,
      name: file.name,
      checksum: file.checksum,
      applied: true,
    });
  }
  return { applied: appliedStatuses, pending: pendingStatuses };
}
