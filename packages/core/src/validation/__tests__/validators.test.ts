import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractRules } from "../../context/extractRules.js";
import { parseContextFile } from "../../context/parseContextFile.js";
import { readPackageMetadata } from "../../workspace/readPackageMetadata.js";
import { readWorkspaceFiles } from "../../workspace/readWorkspaceFiles.js";
import { validateRules } from "../validators.js";

const fixtureRoot = resolve(process.cwd(), "fixtures/stale-context-repo");

describe("deterministic validators", () => {
  it("finds stale path, package manager mismatch, empty glob, and dependency mismatch", async () => {
    const text = await readFile(resolve(fixtureRoot, "AGENTS.md"), "utf8");
    const rules = extractRules(parseContextFile({ path: "AGENTS.md", text }));

    const findings = validateRules({
      workspaceId: "workspace_fixture",
      rules,
      packageMetadata: await readPackageMetadata(fixtureRoot),
      workspaceFiles: await readWorkspaceFiles(fixtureRoot)
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

  it("finds commands whose package script does not exist", () => {
    const rules = extractRules(
      parseContextFile({
        path: "AGENTS.md",
        text: "Run `pnpm run lint` before submitting."
      })
    );

    const findings = validateRules({
      workspaceId: "workspace_fixture",
      rules,
      packageMetadata: {
        packageManager: "pnpm",
        scripts: { test: "vitest run" },
        dependencies: []
      },
      workspaceFiles: ["AGENTS.md", "package.json"]
    });

    expect(findings.map((finding) => finding.code)).toEqual(["missing-command"]);
    expect(findings[0]?.evidence[0]).toMatchObject({
      kind: "command",
      label: "pnpm run lint",
      value: "pnpm run lint"
    });
  });

  it("does not report findings for valid deterministic references", () => {
    const rules = extractRules(
      parseContextFile({
        path: "AGENTS.md",
        text: [
          "GraphQL files live under `server/graphql/`.",
          "Run `pnpm run test` before submitting.",
          "Use Apollo for data fetching.",
          "```json semantic-agent",
          '{ "appliesTo": ["server/**/*.ts"] }',
          "```"
        ].join("\n")
      })
    );

    const findings = validateRules({
      workspaceId: "workspace_fixture",
      rules,
      packageMetadata: {
        packageManager: "pnpm",
        scripts: { test: "vitest run" },
        dependencies: ["@apollo/client"]
      },
      workspaceFiles: ["AGENTS.md", "package.json", "server/graphql/schema.ts"]
    });

    expect(findings).toEqual([]);
  });

  it("matches double-star globs with no intermediate directory", () => {
    const rules = extractRules(
      parseContextFile({
        path: "AGENTS.md",
        text: ['```json semantic-agent', '{ "appliesTo": ["server/**/*.ts"] }', "```"].join("\n")
      })
    );

    const findings = validateRules({
      workspaceId: "workspace_fixture",
      rules,
      packageMetadata: { scripts: {}, dependencies: [] },
      workspaceFiles: ["server/index.ts"]
    });

    expect(findings).toEqual([]);
  });
});
