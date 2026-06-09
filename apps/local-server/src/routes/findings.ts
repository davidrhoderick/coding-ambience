import { createFindingFeedbackRecord } from "@semantic-agent/core";
import type { FindingFeedbackRequest } from "@semantic-agent/shared";
import { Hono } from "hono";
import type { ServerState } from "../app.js";

const feedbackStates = new Set<FindingFeedbackRequest["state"]>([
  "false-positive",
  "confirmed",
  "ignored",
  "needs-context-update"
]);

export function createFindingRoutes(state: ServerState) {
  const app = new Hono();

  app.get("/:id", (context) => {
    const finding = state.repositories.findings.get(context.req.param("id"));

    if (!finding) {
      return context.json(
        {
          ok: false,
          error: {
            code: "finding-not-found",
            message: "Finding not found.",
            recoverable: true
          }
        },
        404
      );
    }

    return context.json({ ok: true, data: finding });
  });

  app.post("/:id/recheck", (context) => {
    return context.json({ ok: true, data: { jobId: `recheck-finding:${context.req.param("id")}` } });
  });

  app.post("/:id/feedback", async (context) => {
    const body = (await context.req.json()) as { state?: string; note?: string };

    if (!isFeedbackState(body.state)) {
      return context.json(
        {
          ok: false,
          error: {
            code: "invalid-feedback-state",
            message: "Invalid feedback state.",
            recoverable: true
          }
        },
        400
      );
    }

    const findingId = context.req.param("id");
    const record = createFindingFeedbackRecord({
      id: `${findingId}:feedback:${Date.now()}`,
      workspaceId: "workspace_local",
      findingId,
      request: { state: body.state, note: body.note },
      createdAt: new Date().toISOString()
    });

    try {
      state.repositories.findings.addFeedback(record);
    } catch {
      return context.json(
        {
          ok: false,
          error: {
            code: "finding-not-found",
            message: "Finding not found.",
            recoverable: true
          }
        },
        404
      );
    }

    return context.json({ ok: true, data: record });
  });

  return app;
}

function isFeedbackState(value: string | undefined): value is FindingFeedbackRequest["state"] {
  return value !== undefined && feedbackStates.has(value as FindingFeedbackRequest["state"]);
}
