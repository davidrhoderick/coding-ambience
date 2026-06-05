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
const dependencyInstructionPattern = /\b(use|prefer|choose|standardize on)\s+(TanStack Query|Apollo|Supabase)\b/gi;
const negatedInstructionPrefixPattern = /\b(?:do not|don't|never|avoid)\s+$/i;

export function extractRules(parsed: ParsedContextFile): AgentRule[] {
  const rules: AgentRule[] = [];
  let occurrence = 0;

  for (const line of parsed.lines) {
    for (const match of line.text.matchAll(pathPattern)) {
      const title = match[1] ?? match[0];
      const startColumn = (match.index ?? 0) + 2;
      rules.push(
        createRule(parsed.path, line.line, startColumn, startColumn + title.length, "path-reference", title, line.text, [
          "path",
          occurrence.toString()
        ])
      );
      occurrence += 1;
    }

    for (const match of line.text.matchAll(commandPattern)) {
      const command = match[1] ?? match[0];
      const packageManager = command.split(" ")[0] ?? command;
      const startColumn = (match.index ?? 0) + 2;
      rules.push(
        createRule(
          parsed.path,
          line.line,
          startColumn,
          startColumn + command.length,
          "command-reference",
          command,
          line.text,
          ["command", occurrence.toString()]
        )
      );
      occurrence += 1;
      rules.push(
        createRule(
          parsed.path,
          line.line,
          startColumn,
          startColumn + packageManager.length,
          "package-manager-reference",
          packageManager,
          line.text,
          ["package-manager", occurrence.toString()]
        )
      );
      occurrence += 1;
    }
  }

  for (const block of parsed.metadataBlocks) {
    if (isMetadataScope(block.value)) {
      const appliesTo = Array.isArray(block.value.appliesTo)
        ? block.value.appliesTo.filter((value): value is string => typeof value === "string")
        : [];

      rules.push({
        id: `${parsed.path}:${block.startLine}:1-${block.endLine}:1:metadata-scope:metadata:${occurrence}`,
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
      occurrence += 1;
    }
  }

  for (const line of parsed.lines) {
    for (const match of line.text.matchAll(dependencyInstructionPattern)) {
      if (isNegatedInstruction(line.text, match.index ?? 0)) {
        continue;
      }

      const dependencyName = match[2] ?? match[0];
      const dependencyOffset = match[0].lastIndexOf(dependencyName);
      const startColumn = (match.index ?? 0) + dependencyOffset + 1;
      rules.push(
        createRule(
          parsed.path,
          line.line,
          startColumn,
          startColumn + dependencyName.length,
          "dependency-reference",
          dependencyName,
          line.text,
          ["dependency", occurrence.toString()]
        )
      );
      occurrence += 1;
    }
  }

  return rules.sort(compareRuleSourceRanges);
}

function createRule(
  sourceFile: string,
  line: number,
  startColumn: number,
  endColumn: number,
  ruleType: AgentRule["ruleType"],
  title: string,
  text: string,
  keyParts: string[]
): AgentRule {
  return {
    id: `${sourceFile}:${line}:${startColumn}-${endColumn}:${ruleType}:${keyParts.join(":")}:${title}`,
    sourceFile,
    sourceRange: {
      file: sourceFile,
      startLine: line,
      startColumn,
      endLine: line,
      endColumn
    },
    title,
    ruleType,
    appliesTo: [],
    severity: "warning",
    confidence: 0.85,
    text
  };
}

function isMetadataScope(value: unknown): value is { appliesTo?: unknown; parseError?: never } {
  return typeof value === "object" && value !== null && !("parseError" in value) && "appliesTo" in value;
}

function isNegatedInstruction(text: string, instructionIndex: number): boolean {
  return negatedInstructionPrefixPattern.test(text.slice(0, instructionIndex));
}

function compareRuleSourceRanges(left: AgentRule, right: AgentRule): number {
  return (
    left.sourceRange.startLine - right.sourceRange.startLine ||
    left.sourceRange.startColumn - right.sourceRange.startColumn ||
    left.id.localeCompare(right.id)
  );
}
