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
  const parsed = await readPackageJson(workspaceRoot);
  if (!parsed) {
    return emptyPackageMetadata();
  }

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

async function readPackageJson(workspaceRoot: string): Promise<PackageJson | undefined> {
  try {
    const raw = await readFile(join(workspaceRoot, "package.json"), "utf8");
    return parsePackageJson(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

function parsePackageJson(value: unknown): PackageJson | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }

  if ("packageManager" in value && typeof value.packageManager !== "string") {
    return undefined;
  }

  if ("scripts" in value && !isStringRecord(value.scripts)) {
    return undefined;
  }

  if ("dependencies" in value && !isStringRecord(value.dependencies)) {
    return undefined;
  }

  if ("devDependencies" in value && !isStringRecord(value.devDependencies)) {
    return undefined;
  }

  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isPlainObject(value)) {
    return false;
  }

  return Object.values(value).every((recordValue) => typeof recordValue === "string");
}

function emptyPackageMetadata(): PackageMetadata {
  return {
    scripts: {},
    dependencies: []
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
