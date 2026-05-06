// Verify that apps/frontend/data/geo-providers.json is at least as new as the
// inputs that feed `bun run geo:bake`. Run as part of `bun run verify` so
// stale baked data is caught before deploy.
//
// Failure exits with code 1 and prints which input is newer than the bake.

import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..", "..");

const BAKED_PATH = path.join(REPO_ROOT, "apps", "frontend", "data", "geo-providers.json");
const INPUT_PATHS = [
  path.join(REPO_ROOT, "docs", "research", "pay-skills-payment-atlas.md"),
  path.join(REPO_ROOT, "apps", "bff", "fixtures", "generated", "analytics.json"),
  // tmp/mpp-provider-catalog.json is a generated artifact (capture-time output).
  // We deliberately do NOT require it to be present, but if it exists and is
  // newer than the bake, the bake is stale.
  path.join(REPO_ROOT, "tmp", "mpp-provider-catalog.json"),
];

const fail = (msg: string) => {
  console.error(`[check-geo-bake-fresh] ${msg}`);
  process.exit(1);
};

if (!fs.existsSync(BAKED_PATH)) {
  fail(
    `baked GEO file is missing: ${BAKED_PATH}\n` +
      `  → run \`bun run bake:geo\` to generate it.`,
  );
}

const bakedMtime = fs.statSync(BAKED_PATH).mtimeMs;
const stale: string[] = [];

for (const input of INPUT_PATHS) {
  if (!fs.existsSync(input)) continue;
  const inputMtime = fs.statSync(input).mtimeMs;
  if (inputMtime > bakedMtime) {
    stale.push(`${path.relative(REPO_ROOT, input)} (newer than baked JSON)`);
  }
}

if (stale.length > 0) {
  fail(
    `baked GEO file is stale. Inputs newer than ${path.relative(REPO_ROOT, BAKED_PATH)}:\n` +
      stale.map((s) => `  - ${s}`).join("\n") +
      `\n  → run \`bun run bake:geo\` to refresh.`,
  );
}

console.log("[check-geo-bake-fresh] ok");
