import {
  createBunPostgresClient,
  persistPostgresLiveAnalyticsSnapshot,
  resolvePostgresDatabaseUrl,
} from "../src/data/analytics-source";

const databaseUrl = resolvePostgresDatabaseUrl(process.env);
if (!databaseUrl) {
  throw new Error(
    "BFF analytics snapshot generation requires BFF_ANALYTICS_DATABASE_URL or a postgres:// DATABASE_URL.",
  );
}

const snapshotId = process.env.BFF_ANALYTICS_SNAPSHOT_ID?.trim() || "latest";
const payload = await persistPostgresLiveAnalyticsSnapshot(
  createBunPostgresClient(databaseUrl),
  snapshotId,
);

console.log(
  JSON.stringify({
    snapshotId,
    providers: payload.providers && typeof payload.providers === "object" ? "generated" : "missing",
    generatedAt: new Date().toISOString(),
  }),
);
