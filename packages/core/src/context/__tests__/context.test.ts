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
