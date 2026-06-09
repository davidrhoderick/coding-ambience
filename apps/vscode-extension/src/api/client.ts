import type { ApiResponse, Finding } from "@semantic-agent/shared";

export class SemanticAgentClient {
  constructor(
    private readonly serverUrl: string,
    private readonly fetchFn: typeof fetch = fetch
  ) {}

  async ping(): Promise<ApiResponse<{ status: string }>> {
    return this.request("/health");
  }

  async openWorkspace(workspaceRoot: string): Promise<ApiResponse<unknown>> {
    return this.request("/workspace/open", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceRoot })
    });
  }

  async validateWorkspaceContext(): Promise<ApiResponse<{ contextFiles: unknown[]; findings: Finding[] }>> {
    return this.request("/context/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
  }

  private async request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await this.fetchFn(`${this.serverUrl}${path}`, init);
      return (await response.json()) as ApiResponse<T>;
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "server-unreachable",
          message: "Unable to reach the Semantic Agent server.",
          recoverable: true,
          details: error instanceof Error ? error.message : error
        }
      };
    }
  }
}
