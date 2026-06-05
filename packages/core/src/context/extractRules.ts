import type { SourceRange } from "@semantic-agent/shared";
import type { ParsedContextFile } from "./parseContextFile.js";

export type AgentRule = {
  id: string;
  sourceFile: string;
  sourceRange: SourceRange;
  title: string;
  ruleType:
    | "path-reference"
    | "command-reference"
    | "package-manager-reference"
    | "metadata-scope"
    | "dependency-reference";
  appliesTo: string[];
  severity: "info" | "warning" | "blocking";
  confidence: number;
  text: string;
};

const pathPattern = /`([A-Za-z0-9_.\-/]+\/[A-Za-z0-9_.\-/*]+)`/g;
const commandPattern = /`((npm|pnpm|yarn|bun)\s+run\s+[A-Za-z0-9:_-]+)`/g;
const dependencyNames = ["TanStack Query", "Apollo", "Supabase"];

export function extractRules(parsed: ParsedContextFile): AgentRule[] {
  const rules: AgentRule[] = [];

  for (const line of parsed.lines) {
    for (const match of line.text.matchAll(pathPattern)) {
      rules.push(createRule(parsed.path, line.line, "path-reference", match[1] ?? match[0], line.text));
    }

    for (const match of line.text.matchAll(commandPattern)) {
      const command = match[1] ?? match[0];
      rules.push(createRule(parsed.path, line.line, "command-reference", command, line.text));
      rules.push(
        createRule(parsed.path, line.line, "package-manager-reference", command.split(" ")[0] ?? command, line.text)
      );
    }
  }

  for (const block of parsed.metadataBlocks) {
    if (typeof block.value === "object" && block.value !== null && "appliesTo" in block.value) {
      const appliesTo = Array.isArray(block.value.appliesTo)
        ? block.value.appliesTo.filter((value): value is string => typeof value === "string")
        : [];

      rules.push({
        id: `${parsed.path}:${block.startLine}:metadata-scope`,
        sourceFile: parsed.path,
        sourceRange: {
          file: parsed.path,
          startLine: block.startLine,
          startColumn: 1,
          endLine: block.endLine,
          endColumn: 1
        },
        title: "Metadata scope",
        ruleType: "metadata-scope",
        appliesTo,
        severity: "warning",
        confidence: 0.9,
        text: JSON.stringify(block.value)
      });
    }
  }

  for (const line of parsed.lines) {
    for (const dependencyName of dependencyNames) {
      if (line.text.includes(dependencyName)) {
        rules.push(createRule(parsed.path, line.line, "dependency-reference", dependencyName, line.text));
      }
    }
  }

  return rules;
}

function createRule(
  sourceFile: string,
  line: number,
  ruleType: AgentRule["ruleType"],
  title: string,
  text: string
): AgentRule {
  return {
    id: `${sourceFile}:${line}:${ruleType}:${title}`,
    sourceFile,
    sourceRange: {
      file: sourceFile,
      startLine: line,
      startColumn: 1,
      endLine: line,
      endColumn: text.length + 1
    },
    title,
    ruleType,
    appliesTo: [],
    severity: "warning",
    confidence: 0.85,
    text
  };
}
