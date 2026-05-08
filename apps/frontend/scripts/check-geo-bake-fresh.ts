// Verify that apps/frontend/data/geo-providers.json is at least as new as the
// inputs that feed `bun run geo:bake`. Run as part of `bun run verify` so
// stale baked data is caught before commit/deploy.
//
// The baked JSON is the only data file the GEO page reads at runtime — CI/Docker
// builds do not re-bake. So if a tracked input changes, the developer must
// re-run `bun run bake:geo` and commit the refreshed output.
//
// Failure exits with code 1 and prints which input is newer than the bake.

import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..", "..");

const BAKED_PATH = path.join(REPO_ROOT, "apps", "frontend", "data", "geo-providers.json");
const INPUT_PATHS = [
  path.join(REPO_ROOT, "docs", "research", "pay-skills-payment-atlas.md"),
  path.join(REPO_ROOT, "apps", "bff", "fixtures", "generated", "analytics.json"),
  path.join(REPO_ROOT, "apps", "cli", "fixtures", "mpp-provider-catalog.json"),
];

const fail = (msg: string) => {
  console.error(`[check-geo-bake-fresh] ${msg}`);
  process.exit(1);
};

if (!fs.existsSync(BAKED_PATH)) {
  fail(
    `baked GEO file is missing: ${BAKED_PATH}\n` + `  → run \`bun run bake:geo\` to generate it.`,
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
