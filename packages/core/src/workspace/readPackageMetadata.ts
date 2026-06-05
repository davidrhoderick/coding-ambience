import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type PackageMetadata = {
  packageManager?: "npm" | "pnpm" | "yarn" | "bun";
  scripts: Record<string, string>;
  dependencies: string[];
};

type PackageJson = {
  packageManager?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export async function readPackageMetadata(workspaceRoot: string): Promise<PackageMetadata> {
  const raw = await readFile(join(workspaceRoot, "package.json"), "utf8");
  const parsed = JSON.parse(raw) as PackageJson;
  const packageManager = parsePackageManager(parsed.packageManager);
  const dependencies = new Set<string>();

  for (const name of Object.keys(parsed.dependencies ?? {})) {
    dependencies.add(name);
  }

  for (const name of Object.keys(parsed.devDependencies ?? {})) {
    dependencies.add(name);
  }

  return {
    packageManager,
    scripts: parsed.scripts ?? {},
    dependencies: [...dependencies].sort()
  };
}

function parsePackageManager(value: string | undefined): PackageMetadata["packageManager"] {
  if (!value) {
    return undefined;
  }

  const name = value.split("@")[0];
  if (name === "npm" || name === "pnpm" || name === "yarn" || name === "bun") {
    return name;
  }

  return undefined;
}
