import fs from "node:fs";
import path from "node:path";

export const writeAtomically = (outputPath: string, payload: string) => {
  const directory = path.dirname(outputPath);
  fs.mkdirSync(directory, { recursive: true });
  const tempPath = `${outputPath}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  fs.writeFileSync(tempPath, payload);
  fs.renameSync(tempPath, outputPath);
};
