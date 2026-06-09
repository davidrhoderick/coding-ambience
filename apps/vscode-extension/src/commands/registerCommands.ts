import * as vscode from "vscode";
import type { SemanticAgentClient } from "../api/client.js";
import type { ContextHealthView } from "../views/contextHealthView.js";

export function registerCommands(
  context: vscode.ExtensionContext,
  client: SemanticAgentClient,
  view: ContextHealthView
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("semanticAgent.pingServer", async () => {
      const response = await client.ping();
      if (response.ok) {
        await vscode.window.showInformationMessage("Semantic Agent server is reachable.");
      } else {
        await vscode.window.showErrorMessage(response.error.message);
      }
    }),
    vscode.commands.registerCommand("semanticAgent.validateWorkspaceContext", async () => {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        await vscode.window.showErrorMessage("Open a workspace before validating context.");
        return;
      }

      const openResponse = await client.openWorkspace(workspaceRoot);
      if (!openResponse.ok) {
        await vscode.window.showErrorMessage(openResponse.error.message);
        return;
      }

      const validationResponse = await client.validateWorkspaceContext();
      if (!validationResponse.ok) {
        await vscode.window.showErrorMessage(validationResponse.error.message);
        return;
      }

      view.setItems(
        validationResponse.data.findings.map((finding) => ({
          label: finding.message,
          description: finding.code,
          severity: finding.severity
        }))
      );
    })
  );
}
