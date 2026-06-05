import { access } from "node:fs/promises";
import { join } from "node:path";

export type ContextFileType = "agents-md" | "claude-md" | "copilot-instructions" | "cursor-rule" | "skill-md" | "docs-md";

export type DiscoveredContextFile = {
  path: string;
  type: ContextFileType;
};

const rootContextFiles: Array<{ path: string; type: ContextFileType }> = [
  { path: "AGENTS.md", type: "agents-md" },
  { path: "CLAUDE.md", type: "claude-md" },
  { path: ".github/copilot-instructions.md", type: "copilot-instructions" }
];

export async function discoverContextFiles(workspaceRoot: string): Promise<DiscoveredContextFile[]> {
  const found: DiscoveredContextFile[] = [];

  for (const candidate of rootContextFiles) {
    if (await exists(join(workspaceRoot, candidate.path))) {
      found.push(candidate);
    }
  }

  return found;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
