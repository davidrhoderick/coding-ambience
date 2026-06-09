import { describe, expect, it, vi } from "vitest";
import { SemanticAgentClient } from "./client.js";

describe("SemanticAgentClient", () => {
  it("calls local server routes and returns API responses", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, data: { status: "ok" } }), {
        headers: { "content-type": "application/json" }
      })
    );
    const client = new SemanticAgentClient("http://127.0.0.1:4317", fetchFn);

    await expect(client.ping()).resolves.toEqual({ ok: true, data: { status: "ok" } });
    expect(fetchFn).toHaveBeenCalledWith("http://127.0.0.1:4317/health", undefined);
  });

  it("returns a recoverable failure when the server cannot be reached", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new Error("connection refused"));
    const client = new SemanticAgentClient("http://127.0.0.1:4317", fetchFn);

    await expect(client.ping()).resolves.toEqual({
      ok: false,
      error: {
        code: "server-unreachable",
        message: "Unable to reach the Semantic Agent server.",
        recoverable: true,
        details: "connection refused"
      }
    });
  });
});
