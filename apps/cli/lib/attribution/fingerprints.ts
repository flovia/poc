import { nowIso, db } from "../db";
import type { CatalogEntry, FixtureCase, KnownFingerprint } from "../schema";

export const loadCatalogFromCase = (fixtureCase: FixtureCase): CatalogEntry[] =>
  (fixtureCase.catalogEntries ?? []).map((entry) => ({
    caseId: fixtureCase.caseId,
    type: entry.type,
    value: entry.value,
    label: entry.label ?? null,
    confidence: entry.confidence ?? 100,
    source: entry.source ?? null,
  }));

export const upsertCatalogAndFingerprints = (cases: FixtureCase[]) => {
  const now = nowIso();
  const catalogEntries = cases.flatMap(loadCatalogFromCase);
  const knownFingerprints = new Map<string, KnownFingerprint>();

  const insertCatalog = db.prepare(`
    INSERT INTO catalog_entries (
      case_id,
      fingerprint_type,
      fingerprint_value,
      label,
      confidence,
      source_name,
      raw_json,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(case_id, fingerprint_type, fingerprint_value) DO NOTHING
  `);

  const upsertFingerprint = db.prepare(`
    INSERT INTO known_fingerprints (
      fingerprint_type,
      fingerprint_value,
      provider_label,
      middleman_label,
      source_name,
      confidence,
      first_seen_at,
      last_seen_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(fingerprint_type, fingerprint_value) DO UPDATE SET
      confidence = CASE
        WHEN confidence < excluded.confidence THEN excluded.confidence
        ELSE confidence
      END,
      provider_label = COALESCE(excluded.provider_label, provider_label),
      middleman_label = COALESCE(excluded.middleman_label, middleman_label),
      source_name = COALESCE(excluded.source_name, source_name),
      last_seen_at = excluded.last_seen_at
  `);

  for (const entry of catalogEntries) {
    const rawJson = JSON.stringify({ label: entry.label, source: entry.source, caseId: entry.caseId, type: entry.type, confidence: entry.confidence });
    const entryLabel = entry.label ?? null;
    const entrySource = entry.source ?? null;

    insertCatalog.run(
      entry.caseId,
      entry.type,
      entry.value,
      entryLabel,
      entry.confidence,
      entrySource,
      rawJson,
      now,
    );

    const key = `${entry.type}|${entry.value.toLowerCase()}`;
    knownFingerprints.set(key, {
      fingerprintType: entry.type,
      fingerprintValue: entry.value,
      providerLabel: entryLabel,
      middlemanLabel: null,
      sourceName: entrySource,
      confidence: Math.max(1, Math.min(100, entry.confidence ?? 100)),
    });
  }

  for (const fingerprint of knownFingerprints.values()) {
    upsertFingerprint.run(
      fingerprint.fingerprintType,
      fingerprint.fingerprintValue,
      fingerprint.providerLabel ?? null,
      fingerprint.middlemanLabel ?? null,
      fingerprint.sourceName ?? null,
      fingerprint.confidence,
      now,
      now,
    );
  }

  return catalogEntries.length;
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
         source_name,
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
      source_name: string | null;
      confidence: number;
    }>;

  return rows.map((row) => ({
      fingerprintType: row.fingerprint_type,
      fingerprintValue: row.fingerprint_value,
      providerLabel: row.provider_label,
      middlemanLabel: row.middleman_label,
      sourceName: row.source_name,
      confidence: row.confidence,
    }));
};
