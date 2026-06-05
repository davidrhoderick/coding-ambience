import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("semanticAgent.pingServer", async () => {
      await vscode.window.showInformationMessage("Semantic Agent server integration is not configured yet.");
    }),
    vscode.commands.registerCommand("semanticAgent.validateWorkspaceContext", async () => {
      await vscode.window.showInformationMessage("Semantic Agent context validation is not configured yet.");
    })
  );
}

export function deactivate(): void {}
