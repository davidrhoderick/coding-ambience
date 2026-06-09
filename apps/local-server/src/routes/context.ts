import {
  discoverContextFiles,
  extractRules,
  parseContextFile,
  readPackageMetadata,
  readWorkspaceFiles,
  validateRules
} from "@semantic-agent/core";
import type { Finding } from "@semantic-agent/shared";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Hono } from "hono";
import type { ServerState } from "../app.js";

export function createContextRoutes(state: ServerState) {
  const app = new Hono();

  app.post("/validate", async (context) => {
    if (!state.workspaceRoot) {
      return context.json(
        {
          ok: false,
          error: {
            code: "workspace-not-open",
            message: "Open a workspace first.",
            recoverable: true
          }
        },
        400
      );
    }

    const contextFiles = await discoverContextFiles(state.workspaceRoot);
    const packageMetadata = await readPackageMetadata(state.workspaceRoot);
    const workspaceFiles = await readWorkspaceFiles(state.workspaceRoot);
    const findings: Finding[] = [];

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

    for (const finding of findings) {
      state.repositories.findings.save(finding);
    }

    return context.json({ ok: true, data: { contextFiles, findings } });
  });

  app.post("/files/:id/refresh", (context) => {
    return context.json({ ok: true, data: { jobId: `refresh-context-file:${context.req.param("id")}` } });
  });

  return app;
}
