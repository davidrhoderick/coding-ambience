import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { discoverContextFiles } from "../discoverContextFiles.js";
import { extractRules } from "../extractRules.js";
import { parseContextFile } from "../parseContextFile.js";
import { readPackageMetadata } from "../../workspace/readPackageMetadata.js";
import { readWorkspaceFiles } from "../../workspace/readWorkspaceFiles.js";

const fixtureRoot = resolve(process.cwd(), "fixtures/stale-context-repo");

describe("workspace metadata", () => {
  it("reads package manager, scripts, and dependencies", async () => {
    const metadata = await readPackageMetadata(fixtureRoot);

    expect(metadata.packageManager).toBe("pnpm");
    expect(metadata.scripts).toEqual({ test: "vitest run" });
    expect(metadata.dependencies).toContain("@apollo/client");
  });

  it("returns empty metadata when package.json is missing", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "semantic-agent-missing-package-"));

    await expect(readPackageMetadata(workspaceRoot)).resolves.toEqual({
      scripts: {},
      dependencies: []
    });
  });

  it("returns empty metadata when package.json is invalid", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "semantic-agent-invalid-package-"));
    await writeFile(join(workspaceRoot, "package.json"), "{", "utf8");

    await expect(readPackageMetadata(workspaceRoot)).resolves.toEqual({
      scripts: {},
      dependencies: []
    });
  });

  it("returns empty metadata when package.json is not an object", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "semantic-agent-null-package-"));
    await writeFile(join(workspaceRoot, "package.json"), "null", "utf8");

    await expect(readPackageMetadata(workspaceRoot)).resolves.toEqual({
      scripts: {},
      dependencies: []
    });
  });

  it("returns empty metadata when package.json fields are malformed", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "semantic-agent-malformed-package-"));
    await writeFile(
      join(workspaceRoot, "package.json"),
      JSON.stringify({
        packageManager: "pnpm@9.12.0",
        scripts: "test",
        dependencies: "not-a-dependency-map"
      }),
      "utf8"
    );

    await expect(readPackageMetadata(workspaceRoot)).resolves.toEqual({
      scripts: {},
      dependencies: []
    });
  });
});

describe("workspace file discovery", () => {
  it("ignores node_modules and normalizes paths", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "semantic-agent-files-"));
    await mkdir(join(workspaceRoot, "src", "graphql"), { recursive: true });
    await mkdir(join(workspaceRoot, "node_modules", "pkg"), { recursive: true });
    await writeFile(join(workspaceRoot, "src", "graphql", "schema.ts"), "export {};", "utf8");
    await writeFile(join(workspaceRoot, "node_modules", "pkg", "index.js"), "module.exports = {};", "utf8");

    await expect(readWorkspaceFiles(workspaceRoot)).resolves.toEqual(["src/graphql/schema.ts"]);
  });

  it("honors maxFiles to avoid unbounded listings", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "semantic-agent-max-files-"));
    await writeFile(join(workspaceRoot, "a.txt"), "a", "utf8");
    await writeFile(join(workspaceRoot, "b.txt"), "b", "utf8");
    await writeFile(join(workspaceRoot, "c.txt"), "c", "utf8");

    await expect(readWorkspaceFiles(workspaceRoot, { maxFiles: 2 })).resolves.toEqual(["a.txt", "b.txt"]);
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

  it("gives duplicate same-line commands distinct ids and source columns", () => {
    const parsed = parseContextFile({
      path: "AGENTS.md",
      text: "Run `npm run test` and `npm run test` before submitting."
    });
    const commandRules = extractRules(parsed).filter((rule) => rule.ruleType === "command-reference");

    expect(commandRules).toHaveLength(2);
    expect(commandRules[0]?.id).not.toBe(commandRules[1]?.id);
    expect(commandRules[0]?.sourceRange.startColumn).toBe(6);
    expect(commandRules[0]?.sourceRange.endColumn).toBe(18);
    expect(commandRules[1]?.sourceRange.startColumn).toBe(25);
    expect(commandRules[1]?.sourceRange.endColumn).toBe(37);
  });

  it("marks unterminated metadata fences and does not extract metadata-scope rules from them", () => {
    const parsed = parseContextFile({
      path: "AGENTS.md",
      text: [
        "Intro",
        "```json semantic-agent",
        "{",
        '  "appliesTo": ["src/**/*.ts"]',
        "}"
      ].join("\n")
    });
    const rules = extractRules(parsed);

    expect(parsed.metadataBlocks).toEqual([
      {
        startLine: 2,
        endLine: 5,
        value: { parseError: true, unterminated: true }
      }
    ]);
    expect(rules.map((rule) => rule.ruleType)).not.toContain("metadata-scope");
  });

  it("sorts dependency rules before later metadata rules", () => {
    const parsed = parseContextFile({
      path: "AGENTS.md",
      text: [
        "Use TanStack Query for data fetching.",
        "",
        "```json semantic-agent",
        "{",
        '  "appliesTo": ["src/**/*.ts"]',
        "}",
        "```"
      ].join("\n")
    });

    expect(extractRules(parsed).map((rule) => rule.ruleType)).toEqual(["dependency-reference", "metadata-scope"]);
  });

  it("does not create dependency rules for negated dependency mentions", () => {
    const parsed = parseContextFile({
      path: "AGENTS.md",
      text: "Do not use Supabase for new data fetching."
    });

    expect(extractRules(parsed).filter((rule) => rule.ruleType === "dependency-reference")).toEqual([]);
  });
});
