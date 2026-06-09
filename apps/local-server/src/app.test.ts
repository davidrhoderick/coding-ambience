import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

const fixtureRoot = resolve(process.cwd(), "fixtures/stale-context-repo");

describe("local server app", () => {
  it("responds to ping", async () => {
    const app = createApp();
    const response = await app.request("/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { status: "ok" } });
  });

  it("requires a workspace before validation", async () => {
    const app = createApp();
    const response = await app.request("/context/validate", { method: "POST" });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "workspace-not-open", recoverable: true }
    });
  });

  it("rejects workspace open requests without a root", async () => {
    const app = createApp();
    const response = await app.request("/workspace/open", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "missing-workspace-root", recoverable: true }
    });
  });

  it("validates workspace context repeatedly and persists feedback", async () => {
    const app = createApp();
    await openWorkspace(app);

    const firstResponse = await app.request("/context/validate", { method: "POST" });
    const firstBody = (await firstResponse.json()) as {
      ok: true;
      data: { findings: Array<{ id: string; code: string }> };
    };
    const stalePath = firstBody.data.findings.find((finding) => finding.code === "stale-path-reference");

    expect(firstResponse.status).toBe(200);
    expect(stalePath).toBeDefined();

    const secondResponse = await app.request("/context/validate", { method: "POST" });
    expect(secondResponse.status).toBe(200);

    const findingId = encodeURIComponent(stalePath?.id ?? "");
    const feedbackResponse = await app.request(`/findings/${findingId}/feedback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state: "false-positive", note: "Generated path." })
    });
    expect(feedbackResponse.status).toBe(200);

    const findingResponse = await app.request(`/findings/${findingId}`);
    const findingBody = (await findingResponse.json()) as { ok: true; data: { userState?: string; evidence: unknown[] } };

    expect(findingBody.data.userState).toBe("false-positive");
    expect(findingBody.data.evidence).not.toHaveLength(0);
  });
});

async function openWorkspace(app: ReturnType<typeof createApp>): Promise<void> {
  const response = await app.request("/workspace/open", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceRoot: fixtureRoot })
  });

  expect(response.status).toBe(200);
}
