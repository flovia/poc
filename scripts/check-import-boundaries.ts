import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dir, "..");
const workspaceNames = new Set(["contracts", "sources", "intelligence", "cli", "bff"]);
const workspaceRoots = [
  { kind: "package", name: "contracts", root: path.join(root, "packages", "contracts") },
  { kind: "package", name: "sources", root: path.join(root, "packages", "sources") },
  { kind: "package", name: "intelligence", root: path.join(root, "packages", "intelligence") },
  { kind: "app", name: "cli", root: path.join(root, "apps", "cli") },
  { kind: "app", name: "bff", root: path.join(root, "apps", "bff") },
] as const;

type Workspace = (typeof workspaceRoots)[number];

const packageAllowedImports = new Map<string, ReadonlySet<string>>([
  ["contracts", new Set()],
  ["sources", new Set(["contracts"])],
  ["intelligence", new Set(["contracts"])],
]);

const ignoredDirectories = new Set([".git", "node_modules", "dist", "reports", "tmp"]);

const listTypeScriptFiles = (directory: string): string[] => {
  const files: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTypeScriptFiles(fullPath));
    } else if (entry.isFile() && fullPath.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
};

const findWorkspace = (filePath: string): Workspace | null => {
  const normalized = path.resolve(filePath);
  return (
    workspaceRoots.find((workspace) => normalized.startsWith(`${workspace.root}${path.sep}`)) ??
    null
  );
};

const readImportSpecifiers = (source: string): string[] => {
  const specifiers: string[] = [];
  const patterns = [
    /\bfrom\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /^\s*import\s+["']([^"']+)["']/gm,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (match[1]) specifiers.push(match[1]);
    }
  }

  return specifiers;
};

const workspaceNameForSpecifier = (specifier: string, fromFile: string): string | null => {
  if (specifier.startsWith(".")) {
    const target = path.resolve(path.dirname(fromFile), specifier);
    return findWorkspace(target)?.name ?? null;
  }

  const [firstSegment] = specifier.split("/");
  return firstSegment && workspaceNames.has(firstSegment) ? firstSegment : null;
};

const violations: string[] = [];

for (const workspace of workspaceRoots) {
  for (const file of listTypeScriptFiles(workspace.root)) {
    const source = fs.readFileSync(file, "utf8");
    const specifiers = readImportSpecifiers(source);

    for (const specifier of specifiers) {
      const targetWorkspace = workspaceNameForSpecifier(specifier, file);
      if (!targetWorkspace || targetWorkspace === workspace.name) continue;

      if (workspace.kind === "package") {
        const allowed = packageAllowedImports.get(workspace.name) ?? new Set<string>();
        if (!allowed.has(targetWorkspace)) {
          violations.push(
            `${path.relative(root, file)} imports ${specifier}; packages/${workspace.name} may not depend on ${targetWorkspace}`,
          );
        }
      }

      if (workspace.name === "bff" && targetWorkspace === "cli") {
        violations.push(
          `${path.relative(root, file)} imports ${specifier}; apps/bff may not depend on apps/cli`,
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error(
    ["Import boundary violations:", ...violations.map((item) => `- ${item}`)].join("\n"),
  );
  process.exit(1);
}

console.log("Import boundaries OK");
