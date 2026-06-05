import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const ignoredDirectories = new Set([".git", "node_modules", "dist", "build", ".next", "coverage"]);

export async function readWorkspaceFiles(workspaceRoot: string): Promise<string[]> {
  const files: string[] = [];
  await walk(workspaceRoot, workspaceRoot, files);
  return files.sort();
}

async function walk(root: string, current: string, files: string[]): Promise<void> {
  const entries = await readdir(current, { withFileTypes: true });

  for (const entry of entries) {
    const absolute = join(current, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        await walk(root, absolute, files);
      }
      continue;
    }

    if (entry.isFile()) {
      files.push(relative(root, absolute).replaceAll("\\", "/"));
    }
  }
}
