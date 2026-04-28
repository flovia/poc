import fs from "node:fs";
import path from "node:path";
import { env, ensureDir } from "../lib/db";
import { buildProviderClaimsFromNormalizedProbes } from "../lib/attribution/import-x402-analysis";

const defaultCorpusPath = () => {
  const candidates = [
    path.resolve(process.cwd(), "../../../foxytanuki/docs/x402-analysis/probes/normalized-probes.json"),
    path.resolve(process.cwd(), "../foxytanuki/docs/x402-analysis/probes/normalized-probes.json"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0]!;
};

export const runImportX402AnalysisClaims = (options: { corpusPath?: string; outputPath?: string } = {}) => {
  const corpusPath = path.resolve(options.corpusPath ?? defaultCorpusPath());
  const outputPath = path.resolve(options.outputPath ?? path.join(env.fixturesDir, "knowledge", "provider_endpoint_claims.generated.json"));
  const seed = buildProviderClaimsFromNormalizedProbes(corpusPath);
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, `${JSON.stringify(seed, null, 2)}\n`);
  return { outputPath, claimCount: seed.claims.length };
};

if (import.meta.main) {
  const [, , corpusPath, outputPath] = Bun.argv;
  console.log(JSON.stringify(runImportX402AnalysisClaims({ corpusPath, outputPath }), null, 2));
}
