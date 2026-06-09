import * as vscode from "vscode";
import { SemanticAgentClient } from "./api/client.js";
import { registerCommands } from "./commands/registerCommands.js";
import { ContextHealthView } from "./views/contextHealthView.js";

export function activate(context: vscode.ExtensionContext): void {
  const config = vscode.workspace.getConfiguration("semanticAgent");
  const serverUrl = config.get<string>("serverUrl", "http://127.0.0.1:4317");
  const client = new SemanticAgentClient(serverUrl);
  const contextHealthView = new ContextHealthView();

  context.subscriptions.push(vscode.window.registerTreeDataProvider("semanticAgent.contextHealth", contextHealthView));
  registerCommands(context, client, contextHealthView);
}

export function deactivate(): void {}
