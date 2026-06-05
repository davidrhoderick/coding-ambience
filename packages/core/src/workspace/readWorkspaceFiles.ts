import { readdir } from "node:fs/promises";
import type { Dirent } from "node:fs";
import { join, relative } from "node:path";

const ignoredDirectories = new Set([".git", "node_modules", "dist", "build", ".next", "coverage"]);
const defaultMaxFiles = 10000;

export type ReadWorkspaceFilesOptions = {
  maxFiles?: number;
};

export async function readWorkspaceFiles(workspaceRoot: string, options: ReadWorkspaceFilesOptions = {}): Promise<string[]> {
  const files: string[] = [];
  await walk(workspaceRoot, workspaceRoot, files, options.maxFiles ?? defaultMaxFiles);
  return files.sort();
}

async function walk(root: string, current: string, files: string[], maxFiles: number): Promise<void> {
  if (files.length >= maxFiles) {
    return;
  }

  const entries = await readEntries(current);

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (files.length >= maxFiles) {
      return;
    }

    const absolute = join(current, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        await walk(root, absolute, files, maxFiles);
      }
      continue;
    }

    if (entry.isFile()) {
      files.push(relative(root, absolute).replaceAll("\\", "/"));
    }
  }
}

async function readEntries(path: string): Promise<Dirent[]> {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch {
    return [];
  }
}
