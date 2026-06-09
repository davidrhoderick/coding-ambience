import type { Evidence, Finding } from "@semantic-agent/shared";
import type { AgentRule } from "../context/extractRules.js";
import type { PackageMetadata } from "../workspace/readPackageMetadata.js";

export type ValidateRulesInput = {
  workspaceId: string;
  rules: AgentRule[];
  packageMetadata: PackageMetadata;
  workspaceFiles: string[];
};

const dependencyAliases: Record<string, string[]> = {
  apollo: ["apollo"],
  graphql: ["graphql"],
  supabase: ["supabase"],
  "tanstack query": ["tanstack/query", "react-query"]
};

export function validateRules(input: ValidateRulesInput): Finding[] {
  const findings: Finding[] = [];

  for (const rule of input.rules) {
    if (rule.ruleType === "path-reference" && !pathExists(rule.title, input.workspaceFiles)) {
      findings.push(
        createFinding(input.workspaceId, rule, "stale-path-reference", `Referenced path does not exist: ${rule.title}`, "path")
      );
    }

    if (rule.ruleType === "command-reference" && !commandExists(rule.title, input.packageMetadata.scripts)) {
      findings.push(
        createFinding(input.workspaceId, rule, "missing-command", `Referenced package script does not exist: ${rule.title}`, "command")
      );
    }

    if (
      rule.ruleType === "package-manager-reference" &&
      input.packageMetadata.packageManager &&
      rule.title !== input.packageMetadata.packageManager
    ) {
      findings.push(
        createFinding(
          input.workspaceId,
          rule,
          "package-manager-mismatch",
          `Instruction uses ${rule.title}, but package manager is ${input.packageMetadata.packageManager}.`,
          "command",
          `Replace \`${rule.title}\` with \`${input.packageMetadata.packageManager}\`.`
        )
      );
    }

    if (
      rule.ruleType === "metadata-scope" &&
      rule.appliesTo.length > 0 &&
      !rule.appliesTo.some((glob) => input.workspaceFiles.some((file) => globMatches(glob, file)))
    ) {
      findings.push(
        createFinding(
          input.workspaceId,
          rule,
          "empty-glob-scope",
          `No files match appliesTo scope: ${rule.appliesTo.join(", ")}`,
          "path"
        )
      );
    }

    if (rule.ruleType === "dependency-reference" && !dependencyIsInstalled(rule.title, input.packageMetadata.dependencies)) {
      findings.push(
        createFinding(
          input.workspaceId,
          rule,
          "dependency-mentioned-not-installed",
          `Instruction mentions ${rule.title}, but that dependency is not installed.`,
          "dependency"
        )
      );
    }
  }

  return findings;
}

function pathExists(path: string, workspaceFiles: string[]): boolean {
  const normalized = path.replace(/^\.\//, "").replace(/\/+$/, "");
  return workspaceFiles.some((file) => file === normalized || file.startsWith(`${normalized}/`));
}

function commandExists(command: string, scripts: Record<string, string>): boolean {
  const match = command.match(/^(?:npm|pnpm|yarn|bun)\s+run\s+([A-Za-z0-9:_-]+)$/);
  return match?.[1] !== undefined && Object.hasOwn(scripts, match[1]);
}

function globMatches(glob: string, file: string): boolean {
  const normalized = glob.replace(/^\.\//, "");
  let expression = "";

  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    const nextCharacter = normalized[index + 1];
    const followingCharacter = normalized[index + 2];

    if (character === "*" && nextCharacter === "*" && followingCharacter === "/") {
      expression += "(?:.*/)?";
      index += 2;
    } else if (character === "*" && nextCharacter === "*") {
      expression += ".*";
      index += 1;
    } else if (character === "*") {
      expression += "[^/]*";
    } else if (character === "?") {
      expression += "[^/]";
    } else {
      expression += escapeRegex(character ?? "");
    }
  }

  return new RegExp(`^${expression}$`).test(file);
}

function escapeRegex(value: string): string {
  return value.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

function dependencyIsInstalled(name: string, dependencies: string[]): boolean {
  const aliases = dependencyAliases[name.toLowerCase()] ?? [name.toLowerCase()];
  return dependencies.some((dependency) => aliases.some((alias) => dependency.toLowerCase().includes(alias)));
}

function createFinding(
  workspaceId: string,
  rule: AgentRule,
  code: string,
  message: string,
  evidenceKind: Evidence["kind"],
  suggestedFix?: string
): Finding {
  return {
    id: `${rule.id}:${code}`,
    workspaceId,
    source: "stale-context",
    severity: "warning",
    code,
    message,
    evidence: [
      {
        kind: evidenceKind,
        label: rule.title,
        value: rule.title,
        range: rule.sourceRange
      }
    ],
    suggestedFix,
    trustState: "deterministic",
    sourceRange: rule.sourceRange,
    createdAt: new Date(0).toISOString()
  };
}
