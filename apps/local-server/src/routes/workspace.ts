import { Hono } from "hono";
import type { ServerState } from "../app.js";

export function createWorkspaceRoutes(state: ServerState) {
  const app = new Hono();

  app.post("/open", async (context) => {
    const body = (await context.req.json()) as { workspaceRoot?: string };

    if (!body.workspaceRoot) {
      return context.json(
        {
          ok: false,
          error: {
            code: "missing-workspace-root",
            message: "Missing workspaceRoot.",
            recoverable: true
          }
        },
        400
      );
    }

    state.workspaceRoot = body.workspaceRoot;
    state.repositories.workspaces.upsert({
      id: "workspace_local",
      rootPath: body.workspaceRoot
    });

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
