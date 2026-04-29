import fs from "node:fs";
import path from "node:path";
import { db, env, initDb, type AppDatabase } from "../../lib/db";
import {
  validateFixtureManifest,
  type PaymentObservationInput,
  type RawReceipt,
  type RawTransaction,
} from "../../lib/schema";
import { buildPaymentObservations } from "../../lib/observations/build-observation";
import { storePaymentObservations } from "../../lib/observations/store-observations";

const readJson = <T>(filePath: string): T => {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const raw = fs.readFileSync(absolutePath, "utf8");
  return JSON.parse(raw) as T;
};

export const runIngest = (
  manifestPath = process.env.MANIFEST_PATH ?? env.manifestPath,
  database: AppDatabase = db,
) => {
  const fixtureDir = path.dirname(path.resolve(process.cwd(), manifestPath));
  const manifestJson = readJson<Record<string, unknown>>(path.resolve(process.cwd(), manifestPath));
  const manifest = validateFixtureManifest(manifestJson);

  initDb(database);

  const observations: PaymentObservationInput[] = [];

  for (const fixtureCase of manifest.cases) {
    const txPath = path.resolve(fixtureDir, fixtureCase.txFile);
    const receiptPath = path.resolve(fixtureDir, fixtureCase.receiptFile);

    const tx = readJson<RawTransaction>(txPath);
    const receipt = readJson<RawReceipt>(receiptPath);

    observations.push(...buildPaymentObservations(fixtureCase.caseId, tx, receipt));
  }

  const stored = storePaymentObservations(observations, database);

  return {
    insertedObservations: stored.insertedObservations,
    evidenceRowsUpdated: stored.evidenceRowsUpdated,
    fixtureCases: manifest.cases.length,
    databasePath: env.databasePath,
  };
};

if (import.meta.main) {
  const result = runIngest();
  console.log(JSON.stringify(result, null, 2));
}
