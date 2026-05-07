import fs from "node:fs";
import path from "node:path";
import {
  buildProviderCatalogFromMppCapture,
  type MppCaptureRecord,
} from "sources";
import { writeAtomically } from "./io";

const DEFAULT_INPUT = path.join(process.cwd(), "../../tmp/mpp-capture.json");
const DEFAULT_OUTPUT = path.join(process.cwd(), "../../tmp/mpp-provider-catalog.json");

type CliOptions = {
  inputPath: string;
  outputPath: string;
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    inputPath: process.env.MPP_CAPTURE_INPUT ?? DEFAULT_INPUT,
    outputPath: process.env.MPP_CATALOG_OUTPUT ?? DEFAULT_OUTPUT,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === "--input") options.inputPath = next() ?? options.inputPath;
    else if (arg === "--output") options.outputPath = next() ?? options.outputPath;
  }
  return options;
};

type RawCapture = {
  generatedAt: string;
  source: { registryUrl: string; registryVersion?: number };
  records: MppCaptureRecord[];
};

const main = async () => {
  const options = parseArgs(Bun.argv.slice(2));
  const raw = JSON.parse(fs.readFileSync(options.inputPath, "utf8")) as RawCapture;
  const catalog = buildProviderCatalogFromMppCapture(raw);

  writeAtomically(options.outputPath, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(
    `[materialize-mpp-catalog] wrote ${catalog.providerCount} providers -> ${options.outputPath}`,
  );
};

if (import.meta.main) {
  await main();
}
