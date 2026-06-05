# Semantic Agent IDE Extension — Development Spec

## 1. Concept

Build an IDE-native semantic intelligence layer for software projects. The tool should help developers understand code, review branches, and keep agentic context files accurate.

The product is not another chat sidebar and not a replacement for IntelliSense. It is a local semantic map of the codebase, connected to source ranges, branch diffs, architectural rules, and agent instructions.

The core idea:

> A developer opens a file, selects a symbol, or reviews a branch, and the extension instantly shows the relevant codebase context, applicable repo instructions, likely risks, stale context, and review guidance.

The tool should work for humans and coding agents. It should help developers understand the codebase while also making Copilot, Claude, Cursor, Windsurf, Codex, and other agents less likely to follow outdated or incomplete project context.

## 2. Product Positioning

Current coding agents generally operate in one of three modes:

1. Chat inside the IDE.
2. Autocomplete / inline suggestions.
3. CLI or autonomous coding sessions.

This tool adds a fourth mode:

> Ambient semantic code intelligence.

It should behave more like “Google Maps for a codebase” than like a chatbot.

Primary value:

- Explain what code means in the project, not just what the syntax does.
- Show why a symbol exists and what can break if it changes.
- Connect source code to repo-level architectural instructions.
- Validate branch changes against agentic context files and project rules.
- Detect stale instructions before agents or developers follow them.
- Support IDE-local PR review by comparing the current branch to a selected target branch.

## 3. Core Modes

### 3.1 Ambient Mode

The extension follows the active editor/cursor/selection and displays relevant semantic context.

Initial signals:

- Active file.
- Cursor position.
- Selected symbol/range.
- Nearest function/component/class/export.

Avoid starting with mouse-follow behavior. Mouse movement is often noisy. Cursor, selection, and explicit hover are stronger developer-intent signals.

Ambient mode should show:

- Current symbol summary.
- Domain/module ownership.
- Relevant imports/exports.
- Upstream callers and downstream dependencies where available.
- Related tests.
- Known risks and side effects.
- Applicable project/agent instructions.
- Staleness/trust metadata.

### 3.2 Review Mode

The developer checks out a branch, selects a target branch, and the extension computes a local review model.

Example:

```txt
Current branch: feature/refactor-quote-runtime
Target branch: origin/main
Diff base: git merge-base HEAD origin/main
```

Review mode should analyze:

- Changed files.
- Changed ranges.
- Changed symbols.
- Changed semantic responsibilities.
- Applicable agent/context rules.
- Possible violations.
- Missing or affected tests.
- Stale context files revealed by the diff.

This should feel like local IDE code review, not a SaaS bot. The developer should be able to navigate the diff directly inside the IDE.

### 3.3 Context Governance Mode

The extension scans and validates agentic context files.

Supported files should include:

```txt
AGENTS.md
CLAUDE.md
.github/copilot-instructions.md
.github/instructions/*.instructions.md
.cursor/rules/*
.windsurf/rules/*
**/SKILL.md
docs/**/*.md, where configured
```

This mode should answer:

- What instructions apply to this file/symbol/diff?
- Are the instructions still accurate?
- Do referenced paths still exist?
- Do referenced commands still exist?
- Do package manager assumptions match the repo?
- Are framework/library instructions stale?
- Do branch changes imply context files should be updated?

This is the tool’s agentic control-plane layer.

## 4. Key Design Principle

Do not rebuild IntelliSense.

Use existing language tooling for:

- Symbol identification.
- Hover ranges.
- Definitions.
- References.
- Imports/exports.
- Type info.
- Diagnostics.
- Document symbols.
- Workspace symbols.

Then add semantic/project-specific context above it.

IntelliSense can tell you:

```ts
function calculateReferralStatus(quote: Quote): ReferralStatus
```

This tool should tell you:

```md
This function controls referral classification for the Workers Comp quote flow.
It affects quote summary display and may now affect bind-flow blocking.
Changes here should be reviewed against carrier-specific referral rules.
Related tests are currently weak around bind blocking behavior.
```

The language server identifies the code object. The semantic index explains its meaning in the project.

## 5. High-Level Architecture

```txt
VS Code Extension
  ├─ Commands
  ├─ Sidebar / Webview
  ├─ Hover / CodeLens providers later
  ├─ Workspace settings
  └─ Talks to local semantic server

Local Semantic Server
  ├─ Repo Indexer
  ├─ Git Diff Engine
  ├─ Semantic Wiki Engine
  ├─ Agent Context Registry
  ├─ Validation Engine
  ├─ Model Provider Registry
  └─ Optional MCP Server

Storage
  ├─ SQLite local DB
  ├─ Optional vector index
  └─ Generated JSON artifacts
```

The extension should be thin. Heavy indexing, Git operations, model calls, validation, and storage should live in the local server/core packages.

## 6. Proposed Monorepo Structure

```txt
semantic-agent/
  apps/
    vscode-extension/
      package.json
      src/
        extension.ts
        commands/
        views/
        providers/
        settings/

    local-server/
      package.json
      src/
        index.ts
        routes/
        indexer/
        git/
        validation/
        context/
        model-providers/
        mcp/

  packages/
    core/
      src/
        symbols/
        semantic-map/
        review/
        rules/
        context-files/
        validation/

    shared/
      src/
        api-types.ts
        schemas.ts

  fixtures/
    sample-next-app/
    sample-nx-app/
    sample-graphql-app/
    stale-context-repo/
```

## 7. Recommended Tech Stack

### 7.1 Extension

- VS Code Extension API.
- TypeScript.
- Webview or Tree View sidebar.
- Command Palette commands.
- Workspace configuration.

Start with VS Code only. Test Windsurf later via `.vsix` once core behavior is stable.

### 7.2 Local Server

Recommended:

- Node.js.
- TypeScript.
- Hono or Fastify.
- Zod for schemas.

Hono is a good fit because the service is mostly lightweight local routes plus background jobs.

Example API routes:

```txt
POST /workspace/index
GET  /context/current?file=...&line=...
POST /review/start
GET  /review/session/:id
POST /context/validate
POST /symbol/explain
POST /context/suggest-update
```

### 7.3 Parsing and Code Intelligence

Use deterministic tools first:

- TypeScript Compiler API for TS/TSX.
- VS Code/LSP APIs for active symbol information where useful.
- tree-sitter later for broader language support.
- Git CLI for branch/diff operations.
- unified/remark/gray-matter/yaml for Markdown and frontmatter.

Do not rely on LLMs for basic symbol discovery.

### 7.4 Storage

Use SQLite for local structured storage.

Potential tables:

```txt
files
symbols
symbol_ranges
references
semantic_docs
context_files
agent_rules
rule_scopes
review_sessions
findings
embeddings
```

Embeddings can be added later with:

- sqlite-vec, if keeping one local DB.
- LanceDB, if vector search becomes a major feature.

### 7.5 AI Layer

Initial options:

1. No framework: direct model calls or Vercel AI SDK.
2. Mastra later, once workflows stabilize.
3. LangGraph only if review/context workflows become complex durable graphs.

Recommendation:

- MVP: direct model calls or Vercel AI SDK.
- Upgrade path: Mastra.
- Avoid making LangChain the backbone.

The core should be deterministic. AI should summarize, classify, propose, and explain. The system should parse, map, diff, validate, and ground.

## 8. Model Provider Strategy

The tool should support multiple model providers through an adapter interface.

Provider options:

- VS Code Language Model API.
- GitHub Copilot SDK.
- OpenAI direct.
- Anthropic direct.
- Azure OpenAI.
- Local/Ollama later.

The model provider should be replaceable by configuration.

Example provider interface:

```ts
export type ModelProviderName =
  | "vscode-lm"
  | "github-copilot-sdk"
  | "openai"
  | "anthropic"
  | "azure-openai"
  | "ollama";

export type ModelRequest = {
  system: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
  metadata?: {
    repo?: string;
    file?: string;
    symbol?: string;
    operation:
      | "explain-symbol"
      | "review-diff"
      | "extract-rules"
      | "detect-stale-context"
      | "suggest-context-update";
  };
};

export type ModelResponse = {
  content: string;
  structured?: unknown;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  provider: ModelProviderName;
  model: string;
};

export interface ModelProvider {
  name: ModelProviderName;
  isAvailable(): Promise<boolean>;
  listModels?(): Promise<string[]>;
  complete(request: ModelRequest): Promise<ModelResponse>;
  stream?(request: ModelRequest): AsyncIterable<ModelResponse>;
}
```

Suggested settings:

```json
{
  "semanticAgent.modelProvider": "auto",
  "semanticAgent.preferredProviderOrder": [
    "vscode-lm",
    "github-copilot-sdk",
    "azure-openai",
    "openai",
    "anthropic"
  ],
  "semanticAgent.defaultReviewTargetBranch": "origin/main",
  "semanticAgent.allowExternalModelCalls": false
}
```

Enterprise/work usage may prefer:

```json
{
  "semanticAgent.modelProvider": "vscode-lm",
  "semanticAgent.allowExternalModelCalls": false
}
```

or:

```json
{
  "semanticAgent.modelProvider": "github-copilot-sdk",
  "semanticAgent.allowExternalModelCalls": false
}
```

Personal/dev usage may prefer:

```json
{
  "semanticAgent.modelProvider": "openai",
  "semanticAgent.allowExternalModelCalls": true
}
```

## 9. Copilot and Agent Integration Strategy

There are three different integration paths. Keep them separate.

### 9.1 Extension Uses a Model

The VS Code extension/local server calls a model provider directly.

Possible routes:

- VS Code Language Model API.
- GitHub Copilot SDK.
- OpenAI/Anthropic/Azure direct.

Use this for extension-owned workflows:

- Explain current symbol.
- Generate review note.
- Classify stale context.
- Suggest context-file patch.

### 9.2 Copilot Uses This Tool

Expose an MCP server so GitHub Copilot Agent Mode can call the semantic context engine.

Example MCP tools:

```txt
get_current_symbol_context
get_applicable_agent_rules
validate_diff_against_rules
detect_stale_context
explain_symbol_blast_radius
suggest_context_file_updates
```

This may be the best enterprise integration path because teams can continue using Copilot while this tool provides repo-specific intelligence.

### 9.3 Standalone Agent Workflows

Use GitHub Copilot SDK, Mastra, direct OpenAI calls, or another provider for standalone workflows outside the normal Copilot chat experience.

## 10. Semantic Source Map

Generate a semantic source map that links code ranges to semantic docs and rules.

Example:

```ts
{
  file: "apps/home/src/features/quote/context/QuoteProvider.tsx",
  symbol: "QuoteProvider",
  range: {
    startLine: 21,
    startColumn: 0,
    endLine: 188,
    endColumn: 1
  },
  kind: "react-provider",
  semanticId: "quote.runtime.global-provider",
  summaryId: "wiki://quote/runtime/provider",
  relatedIds: [
    "wiki://quote/referral-status",
    "wiki://quote/navigation-flow",
    "wiki://quote/graphql/fetch-policy"
  ],
  confidence: 0.86,
  lastValidatedCommit: "abc123"
}
```

The semantic source map enables fast lookup without calling an LLM on every cursor move.

## 11. Semantic Documents

Semantic docs should be structured data first. Markdown is only a rendering format.

Example:

```ts
type SemanticDoc = {
  id: string;
  title: string;
  kind:
    | "module"
    | "component"
    | "function"
    | "domain-concept"
    | "architecture-rule"
    | "data-flow"
    | "risk-note";

  summary: string;
  details?: string;
  relatedSymbols: SymbolRef[];
  relatedFiles: string[];
  relatedTests: string[];
  relatedDocs?: string[];
  confidence: number;
  generatedFromCommit: string;
  stale: boolean;
};
```

Important fields for developer value:

```ts
type SemanticInsight = {
  does: string;
  whyExists?: string;
  dependsOn: string[];
  usedBy: string[];
  sideEffects: string[];
  safeChangeGuidance: string[];
  knownPitfalls: string[];
};
```

The highest-value question to answer is not only “what does this do?” but:

> Why is this here, and what breaks if I change it?

## 12. Agent Context Registry

Agentic context files should be parsed into normalized rules.

Example:

```ts
type AgentRule = {
  id: string;
  sourceFile: string;
  sourceRange: Range;
  title: string;
  ruleType:
    | "architecture"
    | "testing"
    | "style"
    | "security"
    | "workflow"
    | "dependency"
    | "domain"
    | "review"
    | "deployment";

  appliesTo: string[];
  severity: "info" | "warning" | "blocking";
  confidence: number;
  text: string;
  examples?: string[];
  lastValidatedCommit?: string;
  relatedSymbols?: SymbolRef[];
  relatedFiles?: string[];
};
```

The registry should answer:

```txt
Which rules apply to this file?
Which rules apply to this symbol?
Which rules apply to this branch diff?
Which rules are stale?
Which rules were contradicted by this PR?
```

## 13. Context Validation and Staleness Detection

Start with deterministic checks.

### 13.1 Stale Path Detection

If an instruction references a path that no longer exists, flag it.

Example:

```md
GraphQL files live under src/graphql.
```

But repo has:

```txt
server/graphql/
```

Finding:

```txt
Stale path reference: src/graphql does not exist. server/graphql appears to be the current GraphQL location.
```

### 13.2 Stale Command Detection

If an instruction references a command that is not in `package.json`, flag it.

Example:

```bash
npm run test
```

But repo has:

```json
{
  "scripts": {
    "test": "vitest run"
  },
  "packageManager": "pnpm@..."
}
```

Possible finding:

```txt
Instruction uses npm, but repo package manager appears to be pnpm.
```

### 13.3 Stale Dependency or Framework Detection

If instructions say to use TanStack Query but the repo has migrated to Apollo, flag it.

Signals:

- Dependencies in package.json.
- Imports in source files.
- Generated files.
- Removed legacy paths.
- Recent branch diff.

### 13.4 Rule Applicability Drift

If a rule applies to paths that match no files, flag it.

Example:

```yaml
appliesTo:
  - "src/api/**/*.ts"
```

But `src/api` no longer exists.

### 13.5 Branch-Induced Context Staleness

If a PR changes architecture but context files still describe the old architecture, flag it.

Example:

```txt
This branch migrates client data fetching from REST to GraphQL.
AGENTS.md still instructs agents to add new REST clients.
```

## 14. Validation Engine

The validation engine should be custom and deterministic where possible.

Example rule config:

```yaml
rules:
  - id: frontend.data.graphql-only
    appliesTo:
      - "apps/web/src/**/*.tsx"
    severity: warning
    instruction: >
      New frontend data fetching should use GraphQL generated hooks.
      Do not add direct Supabase SDK calls in React components.
    validation:
      forbiddenImports:
        - "@supabase/supabase-js"
      preferredImports:
        - "generated/graphql"
```

Finding shape:

```ts
type Finding = {
  id: string;
  severity: "info" | "warning" | "error";
  source: "rule" | "ai" | "stale-context" | "diff-analysis";
  message: string;
  evidence: Evidence[];
  suggestedFix?: string;
};
```

The LLM can help judge ambiguous contradictions, but should not be the primary enforcement engine.

## 15. Review Mode Details

### 15.1 Branch Selection

The user should be able to select a target branch from the command palette.

Persist default target branch per workspace/repo:

```json
{
  "semanticAgent.defaultReviewTargetBranch": "origin/main"
}
```

### 15.2 Git Diff Flow

Use Git CLI initially:

```bash
git rev-parse --abbrev-ref HEAD
git merge-base HEAD origin/main
git diff --name-only <base>...HEAD
git diff --unified=0 <base>...HEAD
git show <base>:path/to/file
```

Review pipeline:

```txt
git diff
  → changed files
  → changed ranges
  → map ranges to symbols
  → map symbols to semantic docs
  → retrieve applicable context rules
  → run deterministic validators
  → optionally ask model for review notes
  → produce findings
```

### 15.3 Changed Symbol Model

```ts
type ReviewSession = {
  currentBranch: string;
  targetBranch: string;
  mergeBase: string;
  changedFiles: ChangedFile[];
  changedSymbols: ChangedSymbol[];
  applicableRules: AgentRule[];
  findings: ReviewFinding[];
};
```

The review sidebar should group by changed symbol, not only changed file.

Example UI:

```txt
Review: feature/foo → origin/main

Changed symbols
  QuoteProvider.tsx
    QuoteProvider
    Risk: high
    Rules: 4 applicable
    Findings: 2

  referralStatus.ts
    calculateReferralStatus
    Risk: high
    Tests: weak/missing
```

## 16. IDE UX

### 16.1 Initial Commands

Start with commands before hover behavior.

Recommended first commands:

```txt
Semantic Agent: Index Workspace
Semantic Agent: Validate Workspace Context
Semantic Agent: Select Target Branch
Semantic Agent: Start Review Mode
Semantic Agent: Show Current Symbol Context
Semantic Agent: Refresh Semantic Docs for Current File
Semantic Agent: Suggest Context Updates
```

### 16.2 Sidebar

Initial sidebar sections:

```txt
Current Context
  Current file
  Current symbol
  Summary
  Related rules
  Related tests
  Risks

Review Mode
  Target branch
  Changed files
  Changed symbols
  Findings

Context Health
  Context files found
  Stale paths
  Missing commands
  Contradictions
```

### 16.3 Hover and CodeLens Later

Add after the sidebar and commands are useful.

Possible CodeLens items:

```txt
Explain symbol
Show blast radius
Review changes
Show applicable rules
Validate against context
```

Hover should be concise and link to the sidebar for deeper detail.

## 17. VS Code Development and Testing Workflow

Use VS Code locally first. Do not begin with Windsurf compatibility testing.

### 17.1 Development Mode

Scaffold extension:

```bash
npx --package yo --package generator-code -- yo code
```

Open extension repo in VS Code and press:

```txt
F5
```

This opens an Extension Development Host window.

In that second window, open a fixture repo and test the extension.

### 17.2 Local Server Dev

Run the local server separately at first.

Terminal 1:

```bash
pnpm --filter local-server dev
```

Terminal 2:

```bash
pnpm --filter vscode-extension watch
```

VS Code:

```txt
Press F5
Open test repo in Extension Development Host
Run Semantic Agent commands
```

Later the extension can spawn the local server automatically.

### 17.3 Package as VSIX

When ready for real local testing:

```bash
npm install -g @vscode/vsce
vsce package
code --install-extension semantic-agent-0.0.1.vsix
```

For Windsurf later, try installing the same `.vsix`. If marketplace distribution matters, investigate Open VSX.

## 18. Testing Strategy

### 18.1 Core Unit Tests

Use Vitest for core logic.

Test:

- Parse `AGENTS.md`.
- Parse Copilot instructions.
- Parse `CLAUDE.md`.
- Parse `SKILL.md`.
- Detect stale paths.
- Detect missing commands.
- Detect package manager mismatch.
- Map diff ranges to symbols.
- Map rules to files.
- Detect forbidden imports.

### 18.2 Fixture Repo Tests

Create fixtures that represent common scenarios.

Example:

```txt
fixtures/stale-context-repo/
  AGENTS.md
  package.json
  server/graphql/
  src/old-api/
```

Expected finding:

```txt
AGENTS.md references src/graphql, but repo uses server/graphql.
```

### 18.3 Extension Integration Tests

Keep these light initially:

- Extension activates.
- Commands register.
- Sidebar opens.
- Local server connection works.
- Target branch setting persists.

### 18.4 Manual Product Testing

Manual testing will be important early.

Flow:

```txt
Open repo
Run Index Workspace
Open function/component
Check sidebar context
Switch branch
Select origin/main
Run Review Mode
Inspect changed-symbol findings
Modify AGENTS.md incorrectly
Run Validate Workspace Context
Confirm stale finding appears
```

## 19. MVP Plan

### Phase 0 — Skeleton

Goal: prove extension/server communication.

Build:

- VS Code extension scaffold.
- Local Hono/Fastify server.
- Command: `Semantic Agent: Ping Server`.
- Sidebar placeholder.
- Workspace settings.

### Phase 1 — Context Registry

Goal: scan and validate agent context files.

Build:

- Find known context files.
- Parse Markdown/frontmatter.
- Extract obvious rules, commands, paths, and package manager mentions.
- Detect stale paths.
- Detect missing commands.
- Detect package manager mismatch.
- Show context health in sidebar.

This should be the first valuable prototype.

### Phase 2 — Review Mode

Goal: IDE-local branch review.

Build:

- Select target branch.
- Persist default target branch.
- Compute merge base.
- Get changed files/ranges.
- Show changed files in sidebar.
- Map changed ranges to nearest symbols for TS/TSX.
- Run context validation against changed files.

### Phase 3 — Semantic Source Map

Goal: attach semantic context to code ranges.

Build:

- TypeScript symbol extraction.
- Exported symbols/components/hooks/providers.
- Symbol ranges.
- Related files/imports.
- Related tests using naming/path conventions.
- Basic generated summaries through selected model provider.
- Sidebar follows current file/symbol.

### Phase 4 — AI-Assisted Review Notes

Goal: produce useful review findings.

Build:

- Model provider adapter.
- Direct OpenAI or Vercel AI SDK first.
- Structured JSON output for review findings.
- Optional VS Code Language Model provider.
- Optional GitHub Copilot SDK provider.

### Phase 5 — MCP Server

Goal: let Copilot/other agents use this tool.

Build MCP tools:

```txt
get_current_symbol_context
get_applicable_agent_rules
validate_diff_against_rules
detect_stale_context
explain_symbol_blast_radius
suggest_context_file_updates
```

### Phase 6 — Packaging and Compatibility

Goal: test outside dev mode.

Build:

- Package `.vsix`.
- Install in local VS Code.
- Test with real repos.
- Try Windsurf install via `.vsix`.
- Later consider VS Code Marketplace and Open VSX.

## 20. Initial Prototype Recommendation

Do not start with real-time hover or complex AI review.

Start with:

```txt
Semantic Agent: Validate Workspace Context
```

Why:

- It proves context ingestion.
- It proves validation value.
- It avoids complex UI.
- It avoids constant LLM calls.
- It gives immediate utility for agentic development.

Then build:

```txt
Semantic Agent: Start Review Mode
```

Then build:

```txt
Sidebar follows current file/symbol
```

## 21. Non-Goals for MVP

Do not start with:

- Full autonomous coding agent.
- Mouse-following UI.
- Multi-editor support.
- Marketplace publishing.
- Perfect multi-language support.
- Deep call graph analysis.
- Full LLM-generated architecture wiki.
- Automatic context file modification without review.

## 22. Risks

### 22.1 Stale AI Summaries

AI-generated explanations can become dangerous if stale.

Every semantic doc should include:

```txt
Generated from commit
Current commit
Changed files since generation
Fresh / partially stale / stale status
Confidence
Evidence source
```

### 22.2 Noise

If the sidebar constantly changes with low-value content, developers will ignore it.

Mitigation:

- Start with explicit commands.
- Allow pinning sidebar context.
- Use quiet/default/deep modes later.
- Keep hover concise.

### 22.3 Enterprise Model Restrictions

At work, external OpenAI/Anthropic calls may not be allowed.

Mitigation:

- Provider abstraction.
- VS Code Language Model API option.
- GitHub Copilot SDK option.
- MCP server option.
- `allowExternalModelCalls: false` setting.

### 22.4 Windsurf Compatibility

VS Code APIs may not behave identically in Windsurf.

Mitigation:

- Build and test in VS Code first.
- Use stable VS Code APIs.
- Avoid early dependence on proposed APIs.
- Package `.vsix` and test later.

## 23. Long-Term Direction

The ambitious product is a semantic control plane for agentic software development.

It should know:

- What the code does.
- What the repo instructions say.
- Which instructions apply where.
- Whether code follows those instructions.
- Whether the instructions are stale.
- What changed in a branch.
- What context other agents should receive.

Possible future features:

- Generate canonical agent contract files.
- Compile one source of truth into `AGENTS.md`, `CLAUDE.md`, Copilot instructions, Cursor rules, Windsurf rules, and `SKILL.md` files.
- PR comment export.
- GitHub Action mode.
- Organization-wide context governance dashboard.
- JetBrains/Zed support.
- Visual dependency/risk maps.
- Rule authoring UI.
- Agent prompt export per file/symbol/diff.

## 24. Final Working Definition

This project is:

> A VS Code-first local semantic indexing and context validation extension that maps code, branch diffs, and agentic instruction files into a navigable, reviewable, and enforceable project knowledge layer.

The MVP should focus on three practical wins:

1. Validate and detect stale agentic context files.
2. Review a checked-out branch against a target branch inside the IDE.
3. Show file/symbol-specific semantic context in a sidebar.

Everything else should support those goals.
