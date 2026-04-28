import fs from "node:fs";
import path from "node:path";
import { nowIso, db, env } from "../db";
import { validateKnownFingerprintsSeed, type KnownFingerprint, type KnownFingerprintSeedEntry, type KnownFingerprintsSeed } from "../schema";

const readJson = <T>(filePath: string): T => JSON.parse(fs.readFileSync(filePath, "utf8")) as T;

const normalizeKey = (entry: Pick<KnownFingerprintSeedEntry, "type" | "value">) => `${entry.type}|${entry.value.toLowerCase()}`;

export const dedupeKnownFingerprintSeeds = (fingerprints: KnownFingerprintSeedEntry[]) => {
  const deduped = new Map<string, KnownFingerprintSeedEntry>();

  for (const entry of fingerprints) {
    const key = normalizeKey(entry);
    const existing = deduped.get(key);
    if (!existing || entry.confidence > existing.confidence) {
      deduped.set(key, { ...entry, provenance: entry.provenance ?? [] });
      continue;
    }
    if (entry.confidence === existing.confidence) {
      deduped.set(key, {
        ...existing,
        provenance: [...(existing.provenance ?? []), ...(entry.provenance ?? [])],
      });
    }
  }

  return [...deduped.values()];
};

export const seedKnownFingerprints = (seed: KnownFingerprintsSeed) => {
  const now = nowIso();
  const fingerprints = dedupeKnownFingerprintSeeds(seed.fingerprints);

  const upsertFingerprint = db.prepare(`
    INSERT INTO known_fingerprints (
      fingerprint_type,
      fingerprint_value,
      provider_label,
      middleman_label,
      facilitator_label,
      source_name,
      provenance_json,
      confidence,
      first_seen_at,
      last_seen_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(fingerprint_type, fingerprint_value) DO UPDATE SET
      confidence = CASE
        WHEN confidence < excluded.confidence THEN excluded.confidence
        ELSE confidence
      END,
      provider_label = COALESCE(excluded.provider_label, provider_label),
      middleman_label = COALESCE(excluded.middleman_label, middleman_label),
      facilitator_label = COALESCE(excluded.facilitator_label, facilitator_label),
      source_name = COALESCE(excluded.source_name, source_name),
      provenance_json = COALESCE(excluded.provenance_json, provenance_json),
      last_seen_at = excluded.last_seen_at
  `);

  for (const fingerprint of fingerprints) {
    upsertFingerprint.run(
      fingerprint.type,
      fingerprint.value,
      fingerprint.providerLabel ?? null,
      fingerprint.middlemanLabel ?? null,
      fingerprint.facilitatorLabel ?? null,
      fingerprint.sourceName ?? null,
      JSON.stringify(fingerprint.provenance ?? []),
      fingerprint.confidence,
      now,
      now,
    );
  }

  return fingerprints.length;
};

export const seedKnownFingerprintsFromFile = (seedPath = path.join(env.fixturesDir, "knowledge", "known_fingerprints.json")) => {
  const absolutePath = path.isAbsolute(seedPath) ? seedPath : path.resolve(process.cwd(), seedPath);
  const seed = validateKnownFingerprintsSeed(readJson<Record<string, unknown>>(absolutePath));
  return seedKnownFingerprints(seed);
};

export const listKnownFingerprints = (): KnownFingerprint[] => {
  const rows = db
    .prepare(
      `
       SELECT
         fingerprint_type,
         fingerprint_value,
         provider_label,
         middleman_label,
         facilitator_label,
         source_name,
         provenance_json,
         confidence
       FROM known_fingerprints
       ORDER BY fingerprint_type, fingerprint_value
     `,
    )
    .all() as Array<{
      fingerprint_type: KnownFingerprint["fingerprintType"];
      fingerprint_value: KnownFingerprint["fingerprintValue"];
      provider_label: string | null;
      middleman_label: string | null;
      facilitator_label: string | null;
      source_name: string | null;
      provenance_json: string | null;
      confidence: number;
    }>;

  return rows.map((row) => ({
    fingerprintType: row.fingerprint_type,
    fingerprintValue: row.fingerprint_value,
    providerLabel: row.provider_label,
    middlemanLabel: row.middleman_label,
    facilitatorLabel: row.facilitator_label,
    sourceName: row.source_name,
    provenance: row.provenance_json ? JSON.parse(row.provenance_json) as KnownFingerprint["provenance"] : [],
    confidence: row.confidence,
  }));
};
