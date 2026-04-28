import fs from "node:fs";
import path from "node:path";

const SPONGE_CATALOG_SERVICES_URL = "https://api.catalog.paysponge.com/api/services";
const SCHEMA_VERSION = "1";
const CONCURRENCY = 6;

type ServiceListRecord = {
  slug?: unknown;
  [key: string]: unknown;
};

type ServiceSnapshotRecord = {
  slug: string;
  serviceUrl: string;
  listRecord: ServiceListRecord;
  detail: unknown | null;
};

type FetchErrorRecord = {
  slug?: string;
  url: string;
  status?: number;
  message: string;
};

const defaultSnapshotPath = () =>
  path.join(process.cwd(), "fixtures", "acquisition", "sponge_catalog_snapshot.json");

const readJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "flovia-poc-sponge-catalog-fetcher/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
};

const extractData = (payload: unknown): unknown => {
  if (typeof payload !== "object" || payload === null || !("data" in payload)) {
    throw new Error("Sponge Catalog response missing data");
  }
  return (payload as { data: unknown }).data;
};

const serviceDetailUrl = (slug: string) => `${SPONGE_CATALOG_SERVICES_URL}/${slug}`;

const fetchServiceDetail = async (
  listRecord: ServiceListRecord,
): Promise<{ record: ServiceSnapshotRecord; error?: FetchErrorRecord }> => {
  const slug = String(listRecord.slug ?? "");
  const url = serviceDetailUrl(slug);

  if (slug.length < 1) {
    return {
      record: { slug, serviceUrl: url, listRecord, detail: null },
      error: { url, message: "Service list record missing slug" },
    };
  }

  try {
    const detail = extractData(await readJson(url));
    return { record: { slug, serviceUrl: url, listRecord, detail } };
  } catch (error) {
    return {
      record: { slug, serviceUrl: url, listRecord, detail: null },
      error: {
        slug,
        url,
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
};

const fetchInBatches = async (records: ServiceListRecord[]) => {
  const services: ServiceSnapshotRecord[] = [];
  const errors: FetchErrorRecord[] = [];

  for (let index = 0; index < records.length; index += CONCURRENCY) {
    const batch = records.slice(index, index + CONCURRENCY);
    const results = await Promise.all(batch.map((record) => fetchServiceDetail(record)));

    for (const result of results) {
      services.push(result.record);
      if (result.error) errors.push(result.error);
    }
  }

  return { services, errors };
};

const run = async () => {
  const outputPath = process.env.SPONGE_CATALOG_SNAPSHOT_PATH ?? defaultSnapshotPath();
  const listData = extractData(await readJson(SPONGE_CATALOG_SERVICES_URL));

  if (!Array.isArray(listData)) {
    throw new Error("Sponge Catalog services response data must be an array");
  }

  const listRecords = listData as ServiceListRecord[];
  const { services, errors } = await fetchInBatches(listRecords);
  const snapshot = {
    schemaVersion: SCHEMA_VERSION,
    sourceName: "sponge_catalog",
    sourceUrl: SPONGE_CATALOG_SERVICES_URL,
    collectedAt: new Date().toISOString(),
    serviceCount: listRecords.length,
    detailCount: services.filter((service) => service.detail !== null).length,
    errorCount: errors.length,
    services: services.sort((left, right) => left.slug.localeCompare(right.slug)),
    errors,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        status: errors.length === 0 ? "ok" : "partial",
        outputPath,
        serviceCount: snapshot.serviceCount,
        detailCount: snapshot.detailCount,
        errorCount: snapshot.errorCount,
      },
      null,
      2,
    ),
  );
};

await run();
