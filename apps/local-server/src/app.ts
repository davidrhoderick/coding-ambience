import { createDatabase, createRepositories, type SemanticAgentDatabase } from "@semantic-agent/core";
import { Hono } from "hono";
import { createContextRoutes } from "./routes/context.js";
import { createFindingRoutes } from "./routes/findings.js";
import { createJobRoutes } from "./routes/jobs.js";
import { createWorkspaceRoutes } from "./routes/workspace.js";

export type ServerState = {
  workspaceRoot?: string;
  repositories: ReturnType<typeof createRepositories>;
};

export type CreateAppOptions = {
  database?: SemanticAgentDatabase;
};

export function createApp(options: CreateAppOptions = {}) {
  const app = new Hono();
  const database = options.database ?? createDatabase(":memory:");
  const state: ServerState = {
    repositories: createRepositories(database)
  };

  app.get("/health", (context) => context.json({ ok: true, data: { status: "ok" } }));
  app.route("/workspace", createWorkspaceRoutes(state));
  app.route("/context", createContextRoutes(state));
  app.route("/findings", createFindingRoutes(state));
  app.route("/jobs", createJobRoutes());

  return app;
}

export type AppType = ReturnType<typeof createApp>;
