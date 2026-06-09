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
