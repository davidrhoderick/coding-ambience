import { describe, expect, it } from "vitest";
import { createFindingFeedbackRecord } from "../../findings/findingFeedback.js";
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
      sourceRange: {
        file: "AGENTS.md",
        startLine: 3,
        startColumn: 26,
        endLine: 3,
        endColumn: 37
      },
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
    expect(finding?.sourceRange).toEqual({
      file: "AGENTS.md",
      startLine: 3,
      startColumn: 26,
      endLine: 3,
      endColumn: 37
    });
    expect(feedback).toEqual([
      {
        id: "feedback_1",
        workspaceId: "workspace_1",
        findingId: "finding_1",
        state: "false-positive",
        note: "Generated files are ignored by default.",
        createdAt: new Date(0).toISOString()
      }
    ]);

    database.close();
  });

  it("creates feedback audit records from API requests", () => {
    expect(
      createFindingFeedbackRecord({
        id: "feedback_1",
        workspaceId: "workspace_1",
        findingId: "finding_1",
        request: { state: "needs-context-update", note: "Update AGENTS.md." },
        createdAt: "2026-06-09T00:00:00.000Z"
      })
    ).toEqual({
      id: "feedback_1",
      workspaceId: "workspace_1",
      findingId: "finding_1",
      state: "needs-context-update",
      note: "Update AGENTS.md.",
      createdAt: "2026-06-09T00:00:00.000Z"
    });
  });

  it("does not create orphan feedback for a missing finding", () => {
    const database = createDatabase(":memory:");
    const repositories = createRepositories(database);

    expect(() =>
      repositories.findings.addFeedback({
        id: "feedback_1",
        workspaceId: "workspace_1",
        findingId: "missing_finding",
        state: "ignored",
        createdAt: new Date(0).toISOString()
      })
    ).toThrow("Finding does not exist: missing_finding");
    expect(repositories.findings.listFeedback("missing_finding")).toEqual([]);

    database.close();
  });
});
