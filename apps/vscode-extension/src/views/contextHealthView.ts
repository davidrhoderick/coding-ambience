import * as vscode from "vscode";

export type ContextHealthItem = {
  label: string;
  description?: string;
  severity?: "info" | "warning" | "error";
};

export class ContextHealthView implements vscode.TreeDataProvider<ContextHealthItem> {
  private readonly changedEmitter = new vscode.EventEmitter<void>();
  private items: ContextHealthItem[] = [{ label: "No context validation has run.", severity: "info" }];

  readonly onDidChangeTreeData = this.changedEmitter.event;

  setItems(items: ContextHealthItem[]): void {
    this.items = items.length > 0 ? items : [{ label: "No findings.", severity: "info" }];
    this.changedEmitter.fire();
  }

  getTreeItem(element: ContextHealthItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    item.description = element.description;
    item.iconPath = new vscode.ThemeIcon(
      element.severity === "warning" ? "warning" : element.severity === "error" ? "error" : "info"
    );
    return item;
  }

  getChildren(): ContextHealthItem[] {
    return this.items;
  }
}
