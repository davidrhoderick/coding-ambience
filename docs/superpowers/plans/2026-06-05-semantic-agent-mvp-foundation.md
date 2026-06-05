# Semantic Agent MVP Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the VS Code-first monorepo foundation, Hono local server, shared typed contracts, SQLite persistence, and deterministic context validation MVP.

**Architecture:** The VS Code extension stays thin and talks to a local Hono server through an internal typed client. Core indexing, context parsing, validation, persistence, and finding feedback live in packages that can be tested without VS Code. AI/provider support is represented only by disabled-by-default contracts in this plan; model calls are not implemented here.

**Tech Stack:** pnpm workspaces, TypeScript, Hono, Vitest, SQLite via `better-sqlite3`, unified/remark for Markdown parsing, VS Code Extension API, Git CLI for local repo metadata.

---

## Scope Boundary

This plan implements Milestones A and B from `semantic-agent-ide-spec.md`:

- Extension/server skeleton.
- Hono server with typed internal client.
- Shared API contracts.
- SQLite schema and migrations.
- Context file discovery.
- Markdown plus optional fenced JSON metadata parsing.
- Deterministic validators for stale paths, package-manager mismatch, missing commands, dependency mentions, and empty globs.
- Context health sidebar shell.
- Manual context refresh, finding recheck, and persisted finding feedback.
- Incremental commit and push checkpoints on the current branch.

Follow-up plans should cover:

- Review mode and changed-symbol mapping.
- Current symbol context.
- Optional evidence-linked model provider enrichment.
- MCP wrapper tools.

## Commit and Push Policy

Work directly on the current branch for now. At the end of every task:

```bash
git status --short
git add <task files>
git commit -m "<scoped commit message>"
git push origin HEAD
```

If a task produces a problematic commit, leave it visible in history and fix forward with a new commit. Do not rewrite history unless explicitly requested.

## Planned File Structure

```txt
package.json
pnpm-workspace.yaml
tsconfig.base.json
vitest.config.ts
apps/
  local-server/
    package.json
    tsconfig.json
    src/
      index.ts
      app.ts
      routes/
        workspace.ts
        context.ts
        findings.ts
        jobs.ts
      server/
        listen.ts
  vscode-extension/
    package.json
    tsconfig.json
    src/
      extension.ts
      api/client.ts
      commands/registerCommands.ts
      views/contextHealthView.ts
packages/
  shared/
    package.json
    tsconfig.json
    src/
      api-types.ts
      contracts.ts
      index.ts
  core/
    package.json
    tsconfig.json
    src/
      context/discoverContextFiles.ts
      context/parseContextFile.ts
      context/extractRules.ts
      context/__tests__/context.test.ts
      validation/validators.ts
      validation/__tests__/validators.test.ts
      workspace/readPackageMetadata.ts
      workspace/readWorkspaceFiles.ts
      findings/findingFeedback.ts
      persistence/database.ts
      persistence/schema.ts
      persistence/repositories.ts
      index.ts
fixtures/
  stale-context-repo/
    AGENTS.md
    package.json
    server/graphql/schema.ts
```

## Task 1: Workspace Skeleton

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: `apps/local-server/package.json`
- Create: `apps/local-server/tsconfig.json`
- Create: `apps/local-server/src/index.ts`
- Create: `apps/vscode-extension/package.json`
- Create: `apps/vscode-extension/tsconfig.json`
- Create: `apps/vscode-extension/src/extension.ts`
- Create: `apps/vscode-extension/media/icon.svg`
- Create: `.gitignore`

- [ ] **Step 1: Create root package metadata**

Create `.gitignore`:

```gitignore
node_modules/
dist/
coverage/
*.tsbuildinfo
```

Create `package.json`:

```json
{
  "name": "semantic-agent",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "build": "pnpm -r build",
    "test": "vitest run --passWithNoTests",
    "typecheck": "pnpm -r typecheck",
    "dev:api": "pnpm --filter @semantic-agent/local-server dev",
    "watch:extension": "pnpm --filter semantic-agent-vscode-extension watch"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@vitest/coverage-v8": "^2.1.1",
    "typescript": "^5.6.2",
    "vitest": "^2.1.1"
  },
  "packageManager": "pnpm@9.12.0"
}
```

- [ ] **Step 2: Create pnpm workspace file**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

This is package-manager workspace metadata, not product context configuration.

- [ ] **Step 3: Create shared TypeScript config**

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true,
    "outDir": "dist"
  }
}
```

- [ ] **Step 4: Create Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    globals: false,
    environment: "node"
  }
});
```

- [ ] **Step 5: Create package manifests and placeholder exports**

Create `packages/shared/package.json`:

```json
{
  "name": "@semantic-agent/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```

Create `packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

Create `packages/shared/src/index.ts`:

```ts
export {};
```

Create `packages/core/package.json`:

```json
{
  "name": "@semantic-agent/core",
  "version": "0.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@semantic-agent/shared": "workspace:*",
    "better-sqlite3": "^11.3.0",
    "ignore": "^6.0.2",
    "mdast-util-to-string": "^4.0.0",
    "unified": "^11.0.5",
    "remark-parse": "^11.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.11"
  }
}
```

Create `packages/core/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

Create `packages/core/src/index.ts`:

```ts
export {};
```

Create `apps/local-server/package.json`:

```json
{
  "name": "@semantic-agent/local-server",
  "version": "0.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx src/index.ts",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@hono/node-server": "^1.13.1",
    "@semantic-agent/core": "workspace:*",
    "@semantic-agent/shared": "workspace:*",
    "hono": "^4.6.3"
  },
  "devDependencies": {
    "tsx": "^4.19.1"
  }
}
```

Create `apps/local-server/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

Create `apps/local-server/src/index.ts`:

```ts
export {};
```

Create `apps/vscode-extension/package.json`:

```json
{
  "name": "semantic-agent-vscode-extension",
  "displayName": "Semantic Agent",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/extension.js",
  "engines": {
    "vscode": "^1.92.0"
  },
  "activationEvents": [
    "onCommand:semanticAgent.pingServer",
    "onCommand:semanticAgent.validateWorkspaceContext"
  ],
  "contributes": {
    "commands": [
      {
        "command": "semanticAgent.pingServer",
        "title": "Semantic Agent: Ping Server"
      },
      {
        "command": "semanticAgent.validateWorkspaceContext",
        "title": "Semantic Agent: Validate Workspace Context"
      }
    ],
    "viewsContainers": {
      "activitybar": [
        {
          "id": "semanticAgent",
          "title": "Semantic Agent",
          "icon": "media/icon.svg"
        }
      ]
    },
    "views": {
      "semanticAgent": [
        {
          "id": "semanticAgent.contextHealth",
          "name": "Context Health"
        }
      ]
    },
    "configuration": {
      "title": "Semantic Agent",
      "properties": {
        "semanticAgent.serverUrl": {
          "type": "string",
          "default": "http://127.0.0.1:4317",
          "description": "Local Semantic Agent server URL."
        },
        "semanticAgent.allowExternalModelCalls": {
          "type": "boolean",
          "default": false,
          "description": "Allow external or provider-mediated model calls."
        },
        "semanticAgent.modelProvider": {
          "type": "string",
          "default": "auto",
          "enum": ["auto", "vscode-lm", "github-copilot-sdk", "openai", "anthropic", "azure-openai", "ollama"],
          "description": "Model provider used only when model calls are explicitly allowed."
        }
      }
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "watch": "tsc -w -p tsconfig.json"
  },
  "dependencies": {
    "@semantic-agent/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/vscode": "^1.92.0"
  }
}
```

Create `apps/vscode-extension/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "lib": ["ES2022"]
  },
  "include": ["src/**/*.ts"]
}
```

Create `apps/vscode-extension/src/extension.ts`:

```ts
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("semanticAgent.pingServer", async () => {
      await vscode.window.showInformationMessage("Semantic Agent server integration is not configured yet.");
    }),
    vscode.commands.registerCommand("semanticAgent.validateWorkspaceContext", async () => {
      await vscode.window.showInformationMessage("Semantic Agent context validation is not configured yet.");
    })
  );
}

export function deactivate(): void {}
```

Create `apps/vscode-extension/media/icon.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="Semantic Agent">
  <rect width="64" height="64" rx="8" fill="#1f2937"/>
  <path d="M16 18h32v6H16zM16 30h22v6H16zM16 42h32v6H16z" fill="#f9fafb"/>
  <path d="M42 28l8 5-8 5z" fill="#38bdf8"/>
</svg>
```

- [ ] **Step 6: Install dependencies**

Run:

```bash
pnpm install
```

Expected: `pnpm-lock.yaml` is created and install exits with code 0.

- [ ] **Step 7: Verify workspace typecheck**

Run:

```bash
pnpm typecheck
```

Expected: all workspace packages typecheck successfully.

- [ ] **Step 8: Commit and push**

Run:

```bash
git status --short
git add .gitignore package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json vitest.config.ts packages apps
git commit -m "chore: scaffold semantic agent workspace"
git push origin HEAD
```

Expected: commit is created and pushed to the current branch.

## Task 2: Shared API Contracts

**Files:**
- Create: `packages/shared/src/api-types.ts`
- Create: `packages/shared/src/contracts.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/contracts.test.ts`

- [ ] **Step 1: Write shared contract test**

Create `packages/shared/src/contracts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isApiFailure, isApiSuccess } from "./contracts.js";

describe("api response contracts", () => {
  it("detects successful responses", () => {
    expect(isApiSuccess({ ok: true, data: { value: 1 } })).toBe(true);
    expect(isApiFailure({ ok: true, data: { value: 1 } })).toBe(false);
  });

  it("detects failure responses", () => {
    expect(
      isApiFailure({
        ok: false,
        error: { code: "missing-workspace", message: "Missing workspace", recoverable: true }
      })
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test packages/shared/src/contracts.test.ts
```

Expected: fails because `contracts.ts` does not exist.

- [ ] **Step 3: Add API types**

Create `packages/shared/src/api-types.ts`:

```ts
export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    recoverable: boolean;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type SourceRange = {
  file: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
};

export type WorkspaceStatus = {
  workspaceRoot: string;
  indexedCommit?: string;
  indexState: "not-indexed" | "indexing" | "ready" | "error";
  activeJobId?: string;
  lastIndexedAt?: string;
  fileCount: number;
  contextFileCount: number;
  symbolCount: number;
};

export type JobStatus = {
  id: string;
  type:
    | "index-workspace"
    | "validate-context"
    | "start-review"
    | "refresh-file"
    | "refresh-context-file"
    | "recheck-finding";
  state: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  progress?: {
    completed: number;
    total?: number;
    message?: string;
  };
  createdAt: string;
  updatedAt: string;
  error?: ApiFailure["error"];
};

export type Evidence = {
  kind: "source-range" | "path" | "command" | "package-json" | "dependency" | "diff-hunk" | "symbol";
  label: string;
  value: string;
  range?: SourceRange;
};

export type Finding = {
  id: string;
  workspaceId: string;
  reviewSessionId?: string;
  source: "rule" | "ai-assisted" | "stale-context" | "diff-analysis" | "human-feedback";
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  evidence: Evidence[];
  suggestedFix?: string;
  trustState: "deterministic" | "evidence-linked-ai" | "human-confirmed" | "unsupported";
  userState?: "false-positive" | "confirmed" | "ignored" | "needs-context-update";
  sourceRange?: SourceRange;
  createdAt: string;
  resolvedAt?: string;
};

export type FindingFeedbackRequest = {
  state: "false-positive" | "confirmed" | "ignored" | "needs-context-update";
  note?: string;
};
```

- [ ] **Step 4: Add contract guards and exports**

Create `packages/shared/src/contracts.ts`:

```ts
import type { ApiFailure, ApiSuccess } from "./api-types.js";

export function isApiSuccess<T>(value: unknown): value is ApiSuccess<T> {
  return typeof value === "object" && value !== null && "ok" in value && value.ok === true && "data" in value;
}

export function isApiFailure(value: unknown): value is ApiFailure {
  if (typeof value !== "object" || value === null || !("ok" in value) || value.ok !== false || !("error" in value)) {
    return false;
  }

  const error = value.error;
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    "recoverable" in error &&
    typeof error.code === "string" &&
    typeof error.message === "string" &&
    typeof error.recoverable === "boolean"
  );
}
```

Modify `packages/shared/src/index.ts`:

```ts
export type * from "./api-types.js";
export * from "./contracts.js";
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
pnpm test packages/shared/src/contracts.test.ts
```

Expected: test passes.

- [ ] **Step 6: Run shared typecheck**

Run:

```bash
pnpm --filter @semantic-agent/shared typecheck
```

Expected: typecheck passes.

- [ ] **Step 7: Commit and push**

Run:

```bash
git status --short
git add packages/shared
git commit -m "feat: add shared api contracts"
git push origin HEAD
```

Expected: commit is created and pushed.

## Task 3: Fixture Repo and Package Metadata Reader

**Files:**
- Create: `fixtures/stale-context-repo/package.json`
- Create: `fixtures/stale-context-repo/AGENTS.md`
- Create: `fixtures/stale-context-repo/server/graphql/schema.ts`
- Create: `packages/core/src/workspace/readPackageMetadata.ts`
- Create: `packages/core/src/workspace/readWorkspaceFiles.ts`
- Create: `packages/core/src/context/__tests__/context.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Create fixture files**

Create `fixtures/stale-context-repo/package.json`:

```json
{
  "name": "stale-context-repo",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "@apollo/client": "^3.11.0"
  }
}
```

Create `fixtures/stale-context-repo/AGENTS.md`:

````md
# Agent Instructions

GraphQL files live under `src/graphql`.

Run `npm run test` before submitting changes.

```json semantic-agent
{
  "appliesTo": ["src/api/**/*.ts"],
  "severity": "warning",
  "description": "Legacy API instructions should apply to API source files."
}
```

Use TanStack Query for new data fetching.
````

Create `fixtures/stale-context-repo/server/graphql/schema.ts`:

```ts
export const schema = "type Query { ok: Boolean! }";
```

- [ ] **Step 2: Write failing tests**

Create `packages/core/src/context/__tests__/context.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { discoverContextFiles } from "../discoverContextFiles.js";
import { readPackageMetadata } from "../../workspace/readPackageMetadata.js";

const fixtureRoot = resolve(process.cwd(), "fixtures/stale-context-repo");

describe("workspace metadata", () => {
  it("reads package manager, scripts, and dependencies", async () => {
    const metadata = await readPackageMetadata(fixtureRoot);

    expect(metadata.packageManager).toBe("pnpm");
    expect(metadata.scripts).toEqual({ test: "vitest run" });
    expect(metadata.dependencies).toContain("@apollo/client");
  });
});

describe("context discovery", () => {
  it("finds AGENTS.md", async () => {
    const files = await discoverContextFiles(fixtureRoot);

    expect(files).toEqual([
      {
        path: "AGENTS.md",
        type: "agents-md"
      }
    ]);
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
pnpm test packages/core/src/context/__tests__/context.test.ts
```

Expected: fails because `discoverContextFiles` and `readPackageMetadata` do not exist.

- [ ] **Step 4: Implement package metadata reader**

Create `packages/core/src/workspace/readPackageMetadata.ts`:

```ts
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
```

- [ ] **Step 5: Implement context discovery**

Create `packages/core/src/context/discoverContextFiles.ts`:

```ts
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
```

Create `packages/core/src/workspace/readWorkspaceFiles.ts`:

```ts
import { readdir, stat } from "node:fs/promises";
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
```

Modify `packages/core/src/index.ts`:

```ts
export * from "./context/discoverContextFiles.js";
export * from "./workspace/readPackageMetadata.js";
export * from "./workspace/readWorkspaceFiles.js";
```

- [ ] **Step 6: Run tests to verify pass**

Run:

```bash
pnpm test packages/core/src/context/__tests__/context.test.ts
```

Expected: tests pass.

- [ ] **Step 7: Run core typecheck**

Run:

```bash
pnpm --filter @semantic-agent/core typecheck
```

Expected: typecheck passes.

- [ ] **Step 8: Commit and push**

Run:

```bash
git status --short
git add fixtures packages/core
git commit -m "feat: discover context files and package metadata"
git push origin HEAD
```

Expected: commit is created and pushed.

## Task 4: Context Parsing and Rule Extraction

**Files:**
- Create: `packages/core/src/context/parseContextFile.ts`
- Create: `packages/core/src/context/extractRules.ts`
- Modify: `packages/core/src/context/__tests__/context.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Extend context tests**

Append to `packages/core/src/context/__tests__/context.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { extractRules } from "../extractRules.js";
import { parseContextFile } from "../parseContextFile.js";

describe("context parsing", () => {
  it("extracts path, command, package manager, dependency, and metadata rules", async () => {
    const text = await readFile(join(fixtureRoot, "AGENTS.md"), "utf8");
    const parsed = parseContextFile({ path: "AGENTS.md", text });
    const rules = extractRules(parsed);

    expect(rules.map((rule) => rule.ruleType)).toEqual([
      "path-reference",
      "command-reference",
      "package-manager-reference",
      "metadata-scope",
      "dependency-reference"
    ]);
    expect(rules[0]?.sourceRange.startLine).toBe(3);
    expect(rules[1]?.text).toContain("npm run test");
    expect(rules[3]?.appliesTo).toEqual(["src/api/**/*.ts"]);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm test packages/core/src/context/__tests__/context.test.ts
```

Expected: fails because parsing modules do not exist.

- [ ] **Step 3: Implement context parser**

Create `packages/core/src/context/parseContextFile.ts`:

```ts
import { unified } from "unified";
import remarkParse from "remark-parse";

export type ParsedContextLine = {
  line: number;
  text: string;
};

export type JsonMetadataBlock = {
  startLine: number;
  endLine: number;
  value: unknown;
};

export type ParsedContextFile = {
  path: string;
  text: string;
  lines: ParsedContextLine[];
  metadataBlocks: JsonMetadataBlock[];
};

export function parseContextFile(input: { path: string; text: string }): ParsedContextFile {
  unified().use(remarkParse).parse(input.text);

  const lines = input.text.split(/\r?\n/).map((text, index) => ({
    line: index + 1,
    text
  }));

  return {
    path: input.path,
    text: input.text,
    lines,
    metadataBlocks: extractJsonMetadataBlocks(lines)
  };
}

function extractJsonMetadataBlocks(lines: ParsedContextLine[]): JsonMetadataBlock[] {
  const blocks: JsonMetadataBlock[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line || !line.text.trim().startsWith("```json semantic-agent")) {
      continue;
    }

    const jsonLines: string[] = [];
    let endLine = line.line;

    for (let inner = index + 1; inner < lines.length; inner += 1) {
      const candidate = lines[inner];
      if (!candidate) {
        continue;
      }

      if (candidate.text.trim() === "```") {
        endLine = candidate.line;
        index = inner;
        break;
      }

      jsonLines.push(candidate.text);
    }

    try {
      blocks.push({
        startLine: line.line,
        endLine,
        value: JSON.parse(jsonLines.join("\n")) as unknown
      });
    } catch {
      blocks.push({
        startLine: line.line,
        endLine,
        value: { parseError: true }
      });
    }
  }

  return blocks;
}
```

- [ ] **Step 4: Implement rule extraction**

Create `packages/core/src/context/extractRules.ts`:

```ts
import type { SourceRange } from "@semantic-agent/shared";
import type { ParsedContextFile } from "./parseContextFile.js";

export type AgentRule = {
  id: string;
  sourceFile: string;
  sourceRange: SourceRange;
  title: string;
  ruleType:
    | "path-reference"
    | "command-reference"
    | "package-manager-reference"
    | "metadata-scope"
    | "dependency-reference";
  appliesTo: string[];
  severity: "info" | "warning" | "blocking";
  confidence: number;
  text: string;
};

const pathPattern = /`([A-Za-z0-9_.\-/]+\/[A-Za-z0-9_.\-/*]+)`/g;
const commandPattern = /`((npm|pnpm|yarn|bun)\s+run\s+[A-Za-z0-9:_-]+)`/g;
const packageManagerPattern = /\b(npm|pnpm|yarn|bun)\b/g;
const dependencyNames = ["TanStack Query", "Apollo", "GraphQL", "Supabase"];

export function extractRules(parsed: ParsedContextFile): AgentRule[] {
  const rules: AgentRule[] = [];

  for (const line of parsed.lines) {
    for (const match of line.text.matchAll(pathPattern)) {
      rules.push(createRule(parsed.path, line.line, "path-reference", match[1] ?? match[0], line.text));
    }

    for (const match of line.text.matchAll(commandPattern)) {
      const command = match[1] ?? match[0];
      rules.push(createRule(parsed.path, line.line, "command-reference", command, line.text));
      rules.push(createRule(parsed.path, line.line, "package-manager-reference", command.split(" ")[0] ?? command, line.text));
    }

    for (const dependencyName of dependencyNames) {
      if (line.text.includes(dependencyName)) {
        rules.push(createRule(parsed.path, line.line, "dependency-reference", dependencyName, line.text));
      }
    }
  }

  for (const block of parsed.metadataBlocks) {
    if (typeof block.value === "object" && block.value !== null && "appliesTo" in block.value) {
      const appliesTo = Array.isArray(block.value.appliesTo)
        ? block.value.appliesTo.filter((value): value is string => typeof value === "string")
        : [];

      rules.push({
        id: `${parsed.path}:${block.startLine}:metadata-scope`,
        sourceFile: parsed.path,
        sourceRange: {
          file: parsed.path,
          startLine: block.startLine,
          startColumn: 1,
          endLine: block.endLine,
          endColumn: 1
        },
        title: "Metadata scope",
        ruleType: "metadata-scope",
        appliesTo,
        severity: "warning",
        confidence: 0.9,
        text: JSON.stringify(block.value)
      });
    }
  }

  return rules;
}

function createRule(
  sourceFile: string,
  line: number,
  ruleType: AgentRule["ruleType"],
  title: string,
  text: string
): AgentRule {
  return {
    id: `${sourceFile}:${line}:${ruleType}:${title}`,
    sourceFile,
    sourceRange: {
      file: sourceFile,
      startLine: line,
      startColumn: 1,
      endLine: line,
      endColumn: text.length + 1
    },
    title,
    ruleType,
    appliesTo: [],
    severity: "warning",
    confidence: 0.85,
    text
  };
}
```

- [ ] **Step 5: Update exports**

Modify `packages/core/src/index.ts`:

```ts
export * from "./context/discoverContextFiles.js";
export * from "./context/extractRules.js";
export * from "./context/parseContextFile.js";
export * from "./workspace/readPackageMetadata.js";
export * from "./workspace/readWorkspaceFiles.js";
```

- [ ] **Step 6: Run context tests**

Run:

```bash
pnpm test packages/core/src/context/__tests__/context.test.ts
```

Expected: tests pass.

- [ ] **Step 7: Commit and push**

Run:

```bash
git status --short
git add packages/core/src/context packages/core/src/index.ts
git commit -m "feat: parse context files and extract rules"
git push origin HEAD
```

Expected: commit is created and pushed.

## Task 5: Deterministic Validators

**Files:**
- Create: `packages/core/src/validation/validators.ts`
- Create: `packages/core/src/validation/__tests__/validators.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write validator tests**

Create `packages/core/src/validation/__tests__/validators.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { extractRules } from "../../context/extractRules.js";
import { parseContextFile } from "../../context/parseContextFile.js";
import { readPackageMetadata } from "../../workspace/readPackageMetadata.js";
import { readWorkspaceFiles } from "../../workspace/readWorkspaceFiles.js";
import { validateRules } from "../validators.js";

const fixtureRoot = resolve(process.cwd(), "fixtures/stale-context-repo");

describe("deterministic validators", () => {
  it("finds stale path, package manager mismatch, missing glob, and dependency mismatch", async () => {
    const text = await readFile(resolve(fixtureRoot, "AGENTS.md"), "utf8");
    const parsed = parseContextFile({ path: "AGENTS.md", text });
    const rules = extractRules(parsed);
    const packageMetadata = await readPackageMetadata(fixtureRoot);
    const workspaceFiles = await readWorkspaceFiles(fixtureRoot);

    const findings = validateRules({
      workspaceId: "workspace_fixture",
      rules,
      packageMetadata,
      workspaceFiles
    });

    expect(findings.map((finding) => finding.code)).toEqual([
      "stale-path-reference",
      "package-manager-mismatch",
      "empty-glob-scope",
      "dependency-mentioned-not-installed"
    ]);
    expect(findings.every((finding) => finding.trustState === "deterministic")).toBe(true);
    expect(findings[0]?.evidence[0]?.range?.file).toBe("AGENTS.md");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
pnpm test packages/core/src/validation/__tests__/validators.test.ts
```

Expected: fails because `validators.ts` does not exist.

- [ ] **Step 3: Implement validators**

Create `packages/core/src/validation/validators.ts`:

```ts
import type { Finding } from "@semantic-agent/shared";
import type { AgentRule } from "../context/extractRules.js";
import type { PackageMetadata } from "../workspace/readPackageMetadata.js";

export type ValidateRulesInput = {
  workspaceId: string;
  rules: AgentRule[];
  packageMetadata: PackageMetadata;
  workspaceFiles: string[];
};

export function validateRules(input: ValidateRulesInput): Finding[] {
  const findings: Finding[] = [];

  for (const rule of input.rules) {
    if (rule.ruleType === "path-reference" && !pathExists(rule.title, input.workspaceFiles)) {
      findings.push(createFinding(input.workspaceId, rule, "stale-path-reference", `Referenced path does not exist: ${rule.title}`));
    }

    if (rule.ruleType === "package-manager-reference" && input.packageMetadata.packageManager && rule.title !== input.packageMetadata.packageManager) {
      findings.push(
        createFinding(
          input.workspaceId,
          rule,
          "package-manager-mismatch",
          `Instruction uses ${rule.title}, but package manager is ${input.packageMetadata.packageManager}.`,
          `Replace \`${rule.title}\` with \`${input.packageMetadata.packageManager}\`.`
        )
      );
    }

    if (rule.ruleType === "metadata-scope" && rule.appliesTo.length > 0 && !rule.appliesTo.some((glob) => globMatches(glob, input.workspaceFiles))) {
      findings.push(createFinding(input.workspaceId, rule, "empty-glob-scope", `No files match appliesTo scope: ${rule.appliesTo.join(", ")}`));
    }

    if (rule.ruleType === "dependency-reference" && !dependencyIsInstalled(rule.title, input.packageMetadata.dependencies)) {
      findings.push(
        createFinding(input.workspaceId, rule, "dependency-mentioned-not-installed", `Instruction mentions ${rule.title}, but that dependency is not installed.`)
      );
    }
  }

  return findings;
}

function pathExists(path: string, workspaceFiles: string[]): boolean {
  const normalized = path.replace(/^\.\//, "").replace(/\/$/, "");
  return workspaceFiles.some((file) => file === normalized || file.startsWith(`${normalized}/`));
}

function globMatches(glob: string, workspaceFiles: string[]): boolean {
  const prefix = glob.split("**")[0]?.replace(/\/$/, "");
  if (!prefix) {
    return false;
  }

  return workspaceFiles.some((file) => file.startsWith(prefix));
}

function dependencyIsInstalled(name: string, dependencies: string[]): boolean {
  const normalized = name.toLowerCase();
  if (normalized === "tanstack query") {
    return dependencies.some((dependency) => dependency.includes("tanstack"));
  }

  if (normalized === "apollo") {
    return dependencies.some((dependency) => dependency.includes("apollo"));
  }

  if (normalized === "supabase") {
    return dependencies.some((dependency) => dependency.includes("supabase"));
  }

  if (normalized === "graphql") {
    return dependencies.some((dependency) => dependency.includes("graphql"));
  }

  return dependencies.includes(name);
}

function createFinding(
  workspaceId: string,
  rule: AgentRule,
  code: string,
  message: string,
  suggestedFix?: string
): Finding {
  return {
    id: `${rule.id}:${code}`,
    workspaceId,
    source: "stale-context",
    severity: "warning",
    code,
    message,
    evidence: [
      {
        kind: "source-range",
        label: rule.title,
        value: rule.text,
        range: rule.sourceRange
      }
    ],
    suggestedFix,
    trustState: "deterministic",
    sourceRange: rule.sourceRange,
    createdAt: new Date(0).toISOString()
  };
}
```

- [ ] **Step 4: Update exports**

Modify `packages/core/src/index.ts`:

```ts
export * from "./context/discoverContextFiles.js";
export * from "./context/extractRules.js";
export * from "./context/parseContextFile.js";
export * from "./validation/validators.js";
export * from "./workspace/readPackageMetadata.js";
export * from "./workspace/readWorkspaceFiles.js";
```

- [ ] **Step 5: Run validator tests**

Run:

```bash
pnpm test packages/core/src/validation/__tests__/validators.test.ts
```

Expected: tests pass with four deterministic findings.

- [ ] **Step 6: Run full test suite**

Run:

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit and push**

Run:

```bash
git status --short
git add packages/core/src/validation packages/core/src/index.ts
git commit -m "feat: add deterministic context validators"
git push origin HEAD
```

Expected: commit is created and pushed.

## Task 6: SQLite Persistence and Finding Feedback

**Files:**
- Create: `packages/core/src/persistence/schema.ts`
- Create: `packages/core/src/persistence/database.ts`
- Create: `packages/core/src/persistence/repositories.ts`
- Create: `packages/core/src/findings/findingFeedback.ts`
- Create: `packages/core/src/persistence/__tests__/persistence.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write persistence tests**

Create `packages/core/src/persistence/__tests__/persistence.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDatabase } from "../database.js";
import { createRepositories } from "../repositories.js";

describe("finding persistence", () => {
  it("stores findings and feedback without deleting evidence", () => {
    const database = createDatabase(":memory:");
    const repositories = createRepositories(database);

    repositories.workspaces.upsert({ id: "workspace_1", rootPath: "/repo", packageManager: "pnpm" });
    repositories.findings.save({
      id: "finding_1",
      workspaceId: "workspace_1",
      source: "stale-context",
      severity: "warning",
      code: "stale-path-reference",
      message: "Referenced path does not exist: src/graphql",
      evidence: [{ kind: "path", label: "Path", value: "src/graphql" }],
      trustState: "deterministic",
      createdAt: new Date(0).toISOString()
    });

    repositories.findings.addFeedback({
      id: "feedback_1",
      workspaceId: "workspace_1",
      findingId: "finding_1",
      state: "false-positive",
      note: "Generated files are ignored by default.",
      createdAt: new Date(0).toISOString()
    });

    const finding = repositories.findings.get("finding_1");
    const feedback = repositories.findings.listFeedback("finding_1");

    expect(finding?.userState).toBe("false-positive");
    expect(finding?.evidence[0]?.value).toBe("src/graphql");
    expect(feedback).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
pnpm test packages/core/src/persistence/__tests__/persistence.test.ts
```

Expected: fails because persistence modules do not exist.

- [ ] **Step 3: Add schema**

Create `packages/core/src/persistence/schema.ts`:

```ts
export const schemaSql = `
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  root_path TEXT NOT NULL UNIQUE,
  current_commit TEXT,
  package_manager TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  review_session_id TEXT,
  source TEXT NOT NULL,
  severity TEXT NOT NULL,
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  suggested_fix TEXT,
  trust_state TEXT NOT NULL,
  user_state TEXT,
  source_file TEXT,
  source_start_line INTEGER,
  source_start_column INTEGER,
  source_end_line INTEGER,
  source_end_column INTEGER,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS finding_feedback (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  finding_id TEXT NOT NULL,
  state TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);
`;
```

- [ ] **Step 4: Add database factory**

Create `packages/core/src/persistence/database.ts`:

```ts
import Database from "better-sqlite3";
import { schemaSql } from "./schema.js";

export type SemanticAgentDatabase = Database.Database;

export function createDatabase(path: string): SemanticAgentDatabase {
  const database = new Database(path);
  database.exec(schemaSql);
  return database;
}
```

- [ ] **Step 5: Add repositories**

Create `packages/core/src/persistence/repositories.ts`:

```ts
import type { Finding } from "@semantic-agent/shared";
import type { SemanticAgentDatabase } from "./database.js";

export type WorkspaceRecord = {
  id: string;
  rootPath: string;
  packageManager?: string;
};

export type FindingFeedbackRecord = {
  id: string;
  workspaceId: string;
  findingId: string;
  state: NonNullable<Finding["userState"]>;
  note?: string;
  createdAt: string;
};

export function createRepositories(database: SemanticAgentDatabase) {
  return {
    workspaces: {
      upsert(record: WorkspaceRecord): void {
        const now = new Date(0).toISOString();
        database
          .prepare(
            `INSERT INTO workspaces (id, root_path, package_manager, created_at, updated_at)
             VALUES (@id, @rootPath, @packageManager, @now, @now)
             ON CONFLICT(id) DO UPDATE SET
               root_path = excluded.root_path,
               package_manager = excluded.package_manager,
               updated_at = excluded.updated_at`
          )
          .run({ ...record, packageManager: record.packageManager ?? null, now });
      }
    },
    findings: {
      save(finding: Finding): void {
        database
          .prepare(
            `INSERT INTO findings (
              id, workspace_id, review_session_id, source, severity, code, message, evidence_json,
              suggested_fix, trust_state, user_state, source_file, source_start_line, source_start_column,
              source_end_line, source_end_column, created_at, resolved_at
            ) VALUES (
              @id, @workspaceId, @reviewSessionId, @source, @severity, @code, @message, @evidenceJson,
              @suggestedFix, @trustState, @userState, @sourceFile, @sourceStartLine, @sourceStartColumn,
              @sourceEndLine, @sourceEndColumn, @createdAt, @resolvedAt
            )`
          )
          .run(toFindingRow(finding));
      },
      get(id: string): Finding | undefined {
        const row = database.prepare("SELECT * FROM findings WHERE id = ?").get(id) as FindingRow | undefined;
        return row ? fromFindingRow(row) : undefined;
      },
      addFeedback(record: FindingFeedbackRecord): void {
        database
          .prepare(
            `INSERT INTO finding_feedback (id, workspace_id, finding_id, state, note, created_at)
             VALUES (@id, @workspaceId, @findingId, @state, @note, @createdAt)`
          )
          .run({ ...record, note: record.note ?? null });

        database.prepare("UPDATE findings SET user_state = ? WHERE id = ?").run(record.state, record.findingId);
      },
      listFeedback(findingId: string): FindingFeedbackRecord[] {
        const rows = database
          .prepare("SELECT id, workspace_id, finding_id, state, note, created_at FROM finding_feedback WHERE finding_id = ?")
          .all(findingId) as Array<{
          id: string;
          workspace_id: string;
          finding_id: string;
          state: FindingFeedbackRecord["state"];
          note: string | null;
          created_at: string;
        }>;

        return rows.map((row) => ({
          id: row.id,
          workspaceId: row.workspace_id,
          findingId: row.finding_id,
          state: row.state,
          note: row.note ?? undefined,
          createdAt: row.created_at
        }));
      }
    }
  };
}

type FindingRow = {
  id: string;
  workspace_id: string;
  review_session_id: string | null;
  source: Finding["source"];
  severity: Finding["severity"];
  code: string;
  message: string;
  evidence_json: string;
  suggested_fix: string | null;
  trust_state: Finding["trustState"];
  user_state: Finding["userState"] | null;
  source_file: string | null;
  source_start_line: number | null;
  source_start_column: number | null;
  source_end_line: number | null;
  source_end_column: number | null;
  created_at: string;
  resolved_at: string | null;
};

function toFindingRow(finding: Finding) {
  return {
    id: finding.id,
    workspaceId: finding.workspaceId,
    reviewSessionId: finding.reviewSessionId ?? null,
    source: finding.source,
    severity: finding.severity,
    code: finding.code,
    message: finding.message,
    evidenceJson: JSON.stringify(finding.evidence),
    suggestedFix: finding.suggestedFix ?? null,
    trustState: finding.trustState,
    userState: finding.userState ?? null,
    sourceFile: finding.sourceRange?.file ?? null,
    sourceStartLine: finding.sourceRange?.startLine ?? null,
    sourceStartColumn: finding.sourceRange?.startColumn ?? null,
    sourceEndLine: finding.sourceRange?.endLine ?? null,
    sourceEndColumn: finding.sourceRange?.endColumn ?? null,
    createdAt: finding.createdAt,
    resolvedAt: finding.resolvedAt ?? null
  };
}

function fromFindingRow(row: FindingRow): Finding {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    reviewSessionId: row.review_session_id ?? undefined,
    source: row.source,
    severity: row.severity,
    code: row.code,
    message: row.message,
    evidence: JSON.parse(row.evidence_json) as Finding["evidence"],
    suggestedFix: row.suggested_fix ?? undefined,
    trustState: row.trust_state,
    userState: row.user_state ?? undefined,
    sourceRange:
      row.source_file && row.source_start_line && row.source_start_column && row.source_end_line && row.source_end_column
        ? {
            file: row.source_file,
            startLine: row.source_start_line,
            startColumn: row.source_start_column,
            endLine: row.source_end_line,
            endColumn: row.source_end_column
          }
        : undefined,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined
  };
}
```

- [ ] **Step 6: Add finding feedback helper and exports**

Create `packages/core/src/findings/findingFeedback.ts`:

```ts
import type { FindingFeedbackRequest } from "@semantic-agent/shared";

export function createFindingFeedbackRecord(input: {
  id: string;
  workspaceId: string;
  findingId: string;
  request: FindingFeedbackRequest;
  createdAt: string;
}) {
  return {
    id: input.id,
    workspaceId: input.workspaceId,
    findingId: input.findingId,
    state: input.request.state,
    note: input.request.note,
    createdAt: input.createdAt
  };
}
```

Modify `packages/core/src/index.ts`:

```ts
export * from "./context/discoverContextFiles.js";
export * from "./context/extractRules.js";
export * from "./context/parseContextFile.js";
export * from "./findings/findingFeedback.js";
export * from "./persistence/database.js";
export * from "./persistence/repositories.js";
export * from "./validation/validators.js";
export * from "./workspace/readPackageMetadata.js";
export * from "./workspace/readWorkspaceFiles.js";
```

- [ ] **Step 7: Run persistence tests**

Run:

```bash
pnpm test packages/core/src/persistence/__tests__/persistence.test.ts
```

Expected: tests pass.

- [ ] **Step 8: Run full verification**

Run:

```bash
pnpm test
pnpm typecheck
```

Expected: all tests and typechecks pass.

- [ ] **Step 9: Commit and push**

Run:

```bash
git status --short
git add packages/core/src/persistence packages/core/src/findings packages/core/src/index.ts
git commit -m "feat: persist findings and feedback"
git push origin HEAD
```

Expected: commit is created and pushed.

## Task 7: Hono Local Server

**Files:**
- Create: `apps/local-server/src/app.ts`
- Create: `apps/local-server/src/index.ts`
- Create: `apps/local-server/src/server/listen.ts`
- Create: `apps/local-server/src/routes/workspace.ts`
- Create: `apps/local-server/src/routes/context.ts`
- Create: `apps/local-server/src/routes/findings.ts`
- Create: `apps/local-server/src/routes/jobs.ts`
- Create: `apps/local-server/src/app.test.ts`

- [ ] **Step 1: Write server tests**

Create `apps/local-server/src/app.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { createApp } from "./app.js";

const fixtureRoot = resolve(process.cwd(), "fixtures/stale-context-repo");

describe("local server app", () => {
  it("responds to ping", async () => {
    const app = createApp();
    const response = await app.request("/health");
    expect(await response.json()).toEqual({ ok: true, data: { status: "ok" } });
  });

  it("validates workspace context", async () => {
    const app = createApp();
    await app.request("/workspace/open", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceRoot: fixtureRoot })
    });

    const response = await app.request("/context/validate", { method: "POST" });
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data.findings.map((finding: { code: string }) => finding.code)).toContain("stale-path-reference");
  });
});
```

- [ ] **Step 2: Run server tests to verify failure**

Run:

```bash
pnpm test apps/local-server/src/app.test.ts
```

Expected: fails because `app.ts` does not exist.

- [ ] **Step 3: Implement Hono app and routes**

Create `apps/local-server/src/app.ts`:

```ts
import { Hono } from "hono";
import { createContextRoutes } from "./routes/context.js";
import { createFindingRoutes } from "./routes/findings.js";
import { createJobRoutes } from "./routes/jobs.js";
import { createWorkspaceRoutes } from "./routes/workspace.js";

export type ServerState = {
  workspaceRoot?: string;
};

export function createApp() {
  const app = new Hono();
  const state: ServerState = {};

  app.get("/health", (context) => context.json({ ok: true, data: { status: "ok" } }));
  app.route("/workspace", createWorkspaceRoutes(state));
  app.route("/context", createContextRoutes(state));
  app.route("/findings", createFindingRoutes());
  app.route("/jobs", createJobRoutes());

  return app;
}

export type AppType = ReturnType<typeof createApp>;
```

Create `apps/local-server/src/routes/workspace.ts`:

```ts
import { Hono } from "hono";
import type { ServerState } from "../app.js";

export function createWorkspaceRoutes(state: ServerState) {
  const app = new Hono();

  app.post("/open", async (context) => {
    const body = (await context.req.json()) as { workspaceRoot?: string };

    if (!body.workspaceRoot) {
      return context.json({ ok: false, error: { code: "missing-workspace-root", message: "Missing workspaceRoot.", recoverable: true } }, 400);
    }

    state.workspaceRoot = body.workspaceRoot;

    return context.json({
      ok: true,
      data: {
        workspaceRoot: body.workspaceRoot,
        indexState: "not-indexed",
        fileCount: 0,
        contextFileCount: 0,
        symbolCount: 0
      }
    });
  });

  return app;
}
```

Create `apps/local-server/src/routes/context.ts`:

```ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Hono } from "hono";
import { discoverContextFiles, extractRules, parseContextFile, readPackageMetadata, readWorkspaceFiles, validateRules } from "@semantic-agent/core";
import type { ServerState } from "../app.js";

export function createContextRoutes(state: ServerState) {
  const app = new Hono();

  app.post("/validate", async (context) => {
    if (!state.workspaceRoot) {
      return context.json({ ok: false, error: { code: "workspace-not-open", message: "Open a workspace first.", recoverable: true } }, 400);
    }

    const contextFiles = await discoverContextFiles(state.workspaceRoot);
    const packageMetadata = await readPackageMetadata(state.workspaceRoot);
    const workspaceFiles = await readWorkspaceFiles(state.workspaceRoot);
    const findings = [];

    for (const contextFile of contextFiles) {
      const text = await readFile(join(state.workspaceRoot, contextFile.path), "utf8");
      const parsed = parseContextFile({ path: contextFile.path, text });
      const rules = extractRules(parsed);
      findings.push(
        ...validateRules({
          workspaceId: "workspace_local",
          rules,
          packageMetadata,
          workspaceFiles
        })
      );
    }

    return context.json({ ok: true, data: { contextFiles, findings } });
  });

  app.post("/files/:id/refresh", (context) => {
    return context.json({ ok: true, data: { jobId: `refresh-context-file:${context.req.param("id")}` } });
  });

  return app;
}
```

Create `apps/local-server/src/routes/findings.ts`:

```ts
import { Hono } from "hono";

export function createFindingRoutes() {
  const app = new Hono();

  app.post("/:id/recheck", (context) => {
    return context.json({ ok: true, data: { jobId: `recheck-finding:${context.req.param("id")}` } });
  });

  app.post("/:id/feedback", async (context) => {
    const body = (await context.req.json()) as { state?: string; note?: string };

    if (!body.state || !["false-positive", "confirmed", "ignored", "needs-context-update"].includes(body.state)) {
      return context.json({ ok: false, error: { code: "invalid-feedback-state", message: "Invalid feedback state.", recoverable: true } }, 400);
    }

    return context.json({
      ok: true,
      data: {
        findingId: context.req.param("id"),
        state: body.state,
        note: body.note
      }
    });
  });

  return app;
}
```

Create `apps/local-server/src/routes/jobs.ts`:

```ts
import { Hono } from "hono";

export function createJobRoutes() {
  const app = new Hono();

  app.get("/:id", (context) => {
    const now = new Date(0).toISOString();
    return context.json({
      ok: true,
      data: {
        id: context.req.param("id"),
        type: "recheck-finding",
        state: "succeeded",
        createdAt: now,
        updatedAt: now
      }
    });
  });

  return app;
}
```

Create `apps/local-server/src/server/listen.ts`:

```ts
import { serve } from "@hono/node-server";
import type { AppType } from "../app.js";

export function listen(app: AppType, port = 4317) {
  return serve({
    fetch: app.fetch,
    port
  });
}
```

Create `apps/local-server/src/index.ts`:

```ts
import { createApp } from "./app.js";
import { listen } from "./server/listen.js";

const port = Number(process.env.SEMANTIC_AGENT_PORT ?? 4317);
listen(createApp(), port);
console.log(`Semantic Agent local server listening on http://127.0.0.1:${port}`);
```

- [ ] **Step 4: Run server tests**

Run:

```bash
pnpm test apps/local-server/src/app.test.ts
```

Expected: tests pass.

- [ ] **Step 5: Run typecheck**

Run:

```bash
pnpm --filter @semantic-agent/local-server typecheck
```

Expected: typecheck passes.

- [ ] **Step 6: Commit and push**

Run:

```bash
git status --short
git add apps/local-server
git commit -m "feat: add hono local server"
git push origin HEAD
```

Expected: commit is created and pushed.

## Task 8: VS Code Extension Shell

**Files:**
- Create: `apps/vscode-extension/src/api/client.ts`
- Create: `apps/vscode-extension/src/views/contextHealthView.ts`
- Create: `apps/vscode-extension/src/commands/registerCommands.ts`
- Create: `apps/vscode-extension/src/extension.ts`

- [ ] **Step 1: Create extension API client**

Create `apps/vscode-extension/src/api/client.ts`:

```ts
import type { ApiResponse } from "@semantic-agent/shared";

export class SemanticAgentClient {
  constructor(private readonly serverUrl: string) {}

  async ping(): Promise<ApiResponse<{ status: string }>> {
    return this.get("/health");
  }

  async openWorkspace(workspaceRoot: string): Promise<ApiResponse<unknown>> {
    return this.post("/workspace/open", { workspaceRoot });
  }

  async validateWorkspaceContext(): Promise<ApiResponse<{ contextFiles: unknown[]; findings: unknown[] }>> {
    return this.post("/context/validate", {});
  }

  private async get<T>(path: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.serverUrl}${path}`);
    return (await response.json()) as ApiResponse<T>;
  }

  private async post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.serverUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    return (await response.json()) as ApiResponse<T>;
  }
}
```

- [ ] **Step 2: Create Context Health tree view**

Create `apps/vscode-extension/src/views/contextHealthView.ts`:

```ts
import * as vscode from "vscode";

export type ContextHealthItem = {
  label: string;
  description?: string;
  severity?: "info" | "warning" | "error";
};

export class ContextHealthView implements vscode.TreeDataProvider<ContextHealthItem> {
  private readonly changedEmitter = new vscode.EventEmitter<void>();
  private items: ContextHealthItem[] = [{ label: "No context validation has run.", severity: "info" }];

  readonly onDidChangeTreeData = this.changedEmitter.event;

  setItems(items: ContextHealthItem[]): void {
    this.items = items.length > 0 ? items : [{ label: "No findings.", severity: "info" }];
    this.changedEmitter.fire();
  }

  getTreeItem(element: ContextHealthItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    item.description = element.description;
    item.iconPath = new vscode.ThemeIcon(element.severity === "warning" ? "warning" : element.severity === "error" ? "error" : "info");
    return item;
  }

  getChildren(): ContextHealthItem[] {
    return this.items;
  }
}
```

- [ ] **Step 3: Register commands**

Create `apps/vscode-extension/src/commands/registerCommands.ts`:

```ts
import * as vscode from "vscode";
import { SemanticAgentClient } from "../api/client.js";
import type { ContextHealthView } from "../views/contextHealthView.js";

export function registerCommands(context: vscode.ExtensionContext, client: SemanticAgentClient, view: ContextHealthView) {
  context.subscriptions.push(
    vscode.commands.registerCommand("semanticAgent.pingServer", async () => {
      const response = await client.ping();
      if (response.ok) {
        await vscode.window.showInformationMessage("Semantic Agent server is reachable.");
      } else {
        await vscode.window.showErrorMessage(response.error.message);
      }
    }),
    vscode.commands.registerCommand("semanticAgent.validateWorkspaceContext", async () => {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        await vscode.window.showErrorMessage("Open a workspace before validating context.");
        return;
      }

      const openResponse = await client.openWorkspace(workspaceRoot);
      if (!openResponse.ok) {
        await vscode.window.showErrorMessage(openResponse.error.message);
        return;
      }

      const validationResponse = await client.validateWorkspaceContext();
      if (!validationResponse.ok) {
        await vscode.window.showErrorMessage(validationResponse.error.message);
        return;
      }

      view.setItems(
        validationResponse.data.findings.map((finding) => {
          const value = finding as { code?: string; message?: string; severity?: "info" | "warning" | "error" };
          return {
            label: value.message ?? "Finding",
            description: value.code,
            severity: value.severity ?? "info"
          };
        })
      );
    })
  );
}
```

- [ ] **Step 4: Add extension activation**

Create `apps/vscode-extension/src/extension.ts`:

```ts
import * as vscode from "vscode";
import { SemanticAgentClient } from "./api/client.js";
import { registerCommands } from "./commands/registerCommands.js";
import { ContextHealthView } from "./views/contextHealthView.js";

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("semanticAgent");
  const serverUrl = config.get<string>("serverUrl", "http://127.0.0.1:4317");
  const client = new SemanticAgentClient(serverUrl);
  const contextHealthView = new ContextHealthView();

  context.subscriptions.push(vscode.window.registerTreeDataProvider("semanticAgent.contextHealth", contextHealthView));
  registerCommands(context, client, contextHealthView);
}

export function deactivate() {}
```

- [ ] **Step 5: Run extension typecheck**

Run:

```bash
pnpm --filter @semantic-agent/vscode-extension typecheck
```

Expected: typecheck passes.

- [ ] **Step 6: Run full verification**

Run:

```bash
pnpm test
pnpm typecheck
```

Expected: all tests and typechecks pass.

- [ ] **Step 7: Commit and push**

Run:

```bash
git status --short
git add apps/vscode-extension
git commit -m "feat: add vscode extension shell"
git push origin HEAD
```

Expected: commit is created and pushed.

## Task 9: Manual Smoke Test

**Files:**
- Modify: `semantic-agent-ide-spec.md` only if manual testing reveals a spec mismatch.

- [ ] **Step 1: Start local server**

Run:

```bash
pnpm dev:api
```

Expected: server logs `Semantic Agent local server listening on http://127.0.0.1:4317`.

- [ ] **Step 2: Call health route**

In another terminal, run:

```bash
curl -sS http://127.0.0.1:4317/health
```

Expected:

```json
{"ok":true,"data":{"status":"ok"}}
```

- [ ] **Step 3: Open fixture workspace**

Run:

```bash
curl -sS -X POST http://127.0.0.1:4317/workspace/open \
  -H 'content-type: application/json' \
  --data "{\"workspaceRoot\":\"$(pwd)/fixtures/stale-context-repo\"}"
```

Expected response has `"ok":true` and `"workspaceRoot"` pointing to `fixtures/stale-context-repo`.

- [ ] **Step 4: Validate context**

Run:

```bash
curl -sS -X POST http://127.0.0.1:4317/context/validate
```

Expected response includes these finding codes:

```txt
stale-path-reference
package-manager-mismatch
empty-glob-scope
dependency-mentioned-not-installed
```

- [ ] **Step 5: Verify no external model calls are required**

Run:

```bash
rg -n "fetch\\(|openai|anthropic|azure|ollama|modelProvider" apps packages
```

Expected: only local API client fetch usage appears, and no provider implementation calls external model APIs.

- [ ] **Step 6: Commit and push smoke-test notes if needed**

If smoke testing required a doc correction, run:

```bash
git status --short
git add semantic-agent-ide-spec.md
git commit -m "docs: align spec with smoke test findings"
git push origin HEAD
```

Expected: commit is created and pushed if there were doc changes. If no files changed, do not create an empty commit.

## Self-Review

- Spec coverage: This plan covers Milestone A and Milestone B. It intentionally defers Review Mode, Current Symbol Context, evidence-linked AI enrichment, and MCP wrappers to separate plans because those are independent subsystems.
- Placeholder scan: The plan has no `TBD`, `TODO`, or `implement later` steps. Follow-up areas are explicitly out of scope for this plan.
- Type consistency: Shared types use `trustState`, `userState`, `FindingFeedbackRequest`, `WorkspaceStatus`, and `JobStatus` consistently across shared, core, server, and extension tasks.
- Incremental persistence: Every task ends with `git commit` and `git push origin HEAD`, matching the current no-branch workflow.
