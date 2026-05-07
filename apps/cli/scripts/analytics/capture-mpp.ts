import path from "node:path";
import {
  buildMppCaptureRecord,
  captureMppServiceProbe,
  fetchMppServices,
  type MppCaptureRecord,
  type MppProbeResult,
  type MppService,
} from "sources";
import { writeAtomically } from "./io";

const DEFAULT_REGISTRY_URL = "https://mpp.dev/api/services";
const DEFAULT_OUTPUT_PATH = path.join(process.cwd(), "../../tmp/mpp-capture.json");
const DEFAULT_DELAY_MS = 200;
const DEFAULT_PROBE_TIMEOUT_MS = 10_000;

type CliOptions = {
  registryUrl: string;
  outputPath: string;
  delayMs: number;
  probeTimeoutMs: number;
  limit: number | null;
  rawOutputPath?: string;
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    registryUrl: process.env.MPP_REGISTRY_URL ?? DEFAULT_REGISTRY_URL,
    outputPath: process.env.MPP_CAPTURE_OUTPUT ?? DEFAULT_OUTPUT_PATH,
    delayMs: DEFAULT_DELAY_MS,
    probeTimeoutMs: DEFAULT_PROBE_TIMEOUT_MS,
    limit: null,
    rawOutputPath: process.env.MPP_CAPTURE_RAW_OUTPUT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => argv[++index];
    if (arg === "--registry-url") options.registryUrl = next() ?? options.registryUrl;
    else if (arg === "--output") options.outputPath = next() ?? options.outputPath;
    else if (arg === "--raw-output") options.rawOutputPath = next();
    else if (arg === "--delay-ms") options.delayMs = Number(next() ?? options.delayMs);
    else if (arg === "--timeout-ms")
      options.probeTimeoutMs = Number(next() ?? options.probeTimeoutMs);
    else if (arg === "--limit") {
      const value = next();
      options.limit = value ? Number(value) : null;
    }
  }
  return options;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type RawProbeArtifact = {
  serviceId: string;
  probe: MppProbeResult;
};

const runCapture = async (options: CliOptions) => {
  const startedAt = new Date().toISOString();
  console.log(`[capture-mpp] fetching registry ${options.registryUrl}`);
  const registry = await fetchMppServices({ endpoint: options.registryUrl });
  const services: MppService[] =
    options.limit && options.limit > 0
      ? registry.services.slice(0, options.limit)
      : registry.services;

  console.log(
    `[capture-mpp] registry version=${registry.version} services=${registry.services.length} probing=${services.length}`,
  );

  const records: MppCaptureRecord[] = [];
  const rawArtifacts: RawProbeArtifact[] = [];
  let probedCount = 0;
  let skippedCount = 0;
  let challengeCount = 0;
  let probeFailedCount = 0;

  for (const [index, service] of services.entries()) {
    const probe = await captureMppServiceProbe({
      service,
      timeoutMs: options.probeTimeoutMs,
    });

    rawArtifacts.push({ serviceId: service.id, probe });

    const record = buildMppCaptureRecord({
      service,
      probe,
      registryUrl: options.registryUrl,
    });
    records.push(record);

    if (probe.skipped === true) {
      skippedCount += 1;
    } else if (probe.status === null) {
      probeFailedCount += 1;
    } else {
      probedCount += 1;
      if (probe.challenges.length > 0) challengeCount += 1;
    }

    const status = probe.skipped
      ? `skipped:${probe.skipReason}`
      : probe.status === null
        ? `error:${probe.errorMessage}`
        : `${probe.status}${probe.challenges.length > 0 ? " challenge=" + probe.challenges[0]?.method : ""}`;
    console.log(`[capture-mpp] [${index + 1}/${services.length}] ${service.id} -> ${status}`);

    if (index < services.length - 1 && options.delayMs > 0) {
      await sleep(options.delayMs);
    }
  }

  const finishedAt = new Date().toISOString();

  const output = {
    generatedAt: finishedAt,
    startedAt,
    source: { registryUrl: options.registryUrl, registryVersion: registry.version },
    summary: {
      registryServiceCount: registry.services.length,
      probedCount,
      skippedCount,
      probeFailedCount,
      challengeCount,
    },
    records,
  };

  writeAtomically(options.outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`[capture-mpp] wrote normalized capture -> ${options.outputPath}`);

  if (options.rawOutputPath) {
    const rawOutput = {
      generatedAt: finishedAt,
      source: { registryUrl: options.registryUrl, registryVersion: registry.version },
      artifacts: rawArtifacts,
    };
    writeAtomically(options.rawOutputPath, `${JSON.stringify(rawOutput, null, 2)}\n`);
    console.log(`[capture-mpp] wrote raw artifacts -> ${options.rawOutputPath}`);
  }

  return { output };
};

const main = async () => {
  const options = parseArgs(Bun.argv.slice(2));
  await runCapture(options);
};

if (import.meta.main) {
  await main();
}
