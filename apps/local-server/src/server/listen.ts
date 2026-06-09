import { serve } from "@hono/node-server";
import type { AppType } from "../app.js";

export function listen(app: AppType, port = 4317) {
  return serve({
    fetch: app.fetch,
    hostname: "127.0.0.1",
    port
  });
}
