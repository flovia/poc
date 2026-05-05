#!/usr/bin/env bun
import fs from "node:fs";
import path from "node:path";
import { parsePayskillsAtlas } from "./lib/atlas-parser";
import { buildPaySkillsFixture, validateBuildResult } from "./lib/build-fixture";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const DEFAULT_INPUT = path.join(
  REPO_ROOT,
  "apps",
  "bff",
  "fixtures",
  "generated",
  "analytics.json",
);
const DEFAULT_OUTPUT = DEFAULT_INPUT;
const DEFAULT_ATLAS = path.join(REPO_ROOT, "docs", "research", "pay-skills-payment-atlas.md");
const DEFAULT_SEED = 0xfa9c7c;

const parseArg = (name: string, fallback: string): string => {
  const argv = process.argv.slice(2);
  const idx = argv.indexOf(`--${name}`);
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1] as string;
  return fallback;
};

const main = () => {
  const inputPath = parseArg("input", DEFAULT_INPUT);
  const outputPath = parseArg("output", DEFAULT_OUTPUT);
  const atlasPath = parseArg("atlas", DEFAULT_ATLAS);
  const seedRaw = parseArg("seed", String(DEFAULT_SEED));
  const seed = Number.parseInt(seedRaw, 10);

  console.error(`[build-pay-skills-fixture] input=${inputPath}`);
  console.error(`[build-pay-skills-fixture] atlas=${atlasPath}`);
  console.error(`[build-pay-skills-fixture] seed=${seed}`);
  console.error(`[build-pay-skills-fixture] output=${outputPath}`);

  const base = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const atlas = parsePayskillsAtlas(fs.readFileSync(atlasPath, "utf8"));
  console.error(`[build-pay-skills-fixture] atlas providers=${atlas.providers.length}`);

  const result = buildPaySkillsFixture({ base, atlas, seed });

  validateBuildResult(result);
  console.error(
    `[build-pay-skills-fixture] providerWallets=${result.walletUsageGraph.graph.providerWallets.length} catalogRows=${result.providers.providerCount}`,
  );

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n", "utf8");
  console.error(`[build-pay-skills-fixture] wrote ${outputPath}`);
};

main();
