# Semantic Agent IDE Extension — Development Spec

## 1. Concept

Build an IDE-native semantic intelligence layer for software projects. The tool should help developers understand code, review branches, and keep agentic context files accurate.

The product is not another chat sidebar and not a replacement for IntelliSense. It is a local semantic map of the codebase, connected to source ranges, branch diffs, architectural rules, and agent instructions.

The core idea:

> A developer opens a file, selects a symbol, or reviews a branch, and the extension instantly shows the relevant codebase context, applicable repo instructions, likely risks, stale context, and review guidance.

The tool should work for humans and coding agents. It should help developers understand the codebase while also making Copilot, Claude, Cursor, Codex, and other agents less likely to follow outdated or incomplete project context.

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
        contracts.ts

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

Start with VS Code only. Do not spend MVP time on compatibility with other VS Code-like editors.

### 7.2 Local Server

Recommended:

- Node.js.
- TypeScript.
- Hono.
- Type-safe internal RPC/client types generated or inferred from the Hono route definitions.

Hono is the preferred server framework because the service is mostly lightweight local routes plus background jobs, and Hono keeps the path open for multiple runtimes. The extension/server API is internal, not public. Do not maintain a separate OpenAPI-style public schema unless external consumers later require it.

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
- unified/remark for Markdown.
- Optional fenced JSON metadata blocks for structured context, if needed.

Avoid introducing YAML config. Most context should stay in normal Markdown; any structured metadata should use JSON-compatible shapes that TypeScript can type-check and parse predictably.

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

The core should be deterministic. AI may summarize, classify, propose, and explain, but it must not become the source of truth. The system should parse, map, diff, validate, and ground.

Any AI-assisted output must include source links back to code, context files, docs, diff hunks, or deterministic findings. If an output cannot point to reviewable evidence, it should be labeled as unsupported and excluded from enforcement.

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

```json
{
  "appliesTo": ["src/api/**/*.ts"]
}
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

```json
{
  "rules": [
    {
      "id": "frontend.data.graphql-only",
      "appliesTo": ["apps/web/src/**/*.tsx"],
      "severity": "warning",
      "instruction": "New frontend data fetching should use GraphQL generated hooks. Do not add direct Supabase SDK calls in React components.",
      "validation": {
        "forbiddenImports": ["@supabase/supabase-js"],
        "preferredImports": ["generated/graphql"]
      }
    }
  ]
}
```

Finding shape:

```ts
type Finding = {
  id: string;
  severity: "info" | "warning" | "error";
  source: "rule" | "ai-assisted" | "stale-context" | "diff-analysis" | "human-feedback";
  message: string;
  evidence: Evidence[];
  suggestedFix?: string;
  trustState: "deterministic" | "evidence-linked-ai" | "human-confirmed" | "unsupported";
};
```

The LLM can help judge ambiguous contradictions, but should not be the primary enforcement engine. AI-assisted findings must include evidence links to exact source ranges, docs, or diff hunks. Findings without reviewable evidence must be marked `unsupported` and kept out of blocking workflows.

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

Use VS Code locally first. Do not begin compatibility testing for other editors.

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

If marketplace distribution matters later, investigate the VS Code Marketplace.

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

## 19. MVP Scope Boundary

The implementation MVP is a VS Code-first local extension plus local semantic server. It should prove that agentic context files can be indexed, validated, and connected to branch changes before investing in richer semantic wiki generation.

### 19.1 MVP Outcomes

The MVP is successful when a developer can:

1. Open a repository in VS Code.
2. Run `Semantic Agent: Validate Workspace Context`.
3. See agent context files, extracted rules, stale path/command findings, and package-manager mismatches in the sidebar.
4. Select a target branch and run `Semantic Agent: Start Review Mode`.
5. See changed files and changed TS/TSX symbols grouped with applicable rules and findings.
6. Open a TS/TSX file and run `Semantic Agent: Show Current Symbol Context`.
7. See a deterministic symbol summary, related tests, related context rules, and staleness metadata.

### 19.2 MVP In Scope

- VS Code extension scaffold.
- Local Node/TypeScript server.
- Workspace indexing command.
- Context file discovery for known agent files.
- Markdown parsing and optional fenced JSON metadata parsing.
- Rule extraction for obvious path, command, package-manager, dependency, and scope statements.
- Deterministic validation findings.
- SQLite persistence.
- Git diff review against a selected target branch.
- TS/TSX symbol extraction for changed files and active editor context.
- Sidebar with current context, review mode, and context health sections.
- Hono-based internal API with type-safe extension client.
- Manual rescanning for context files, current file, and workspace index.
- Human feedback on findings, including false positive, confirmed, ignored, and needs context update states.
- Model provider interface stubbed behind disabled-by-default settings.

### 19.3 MVP Out of Scope

- Autonomous code changes.
- Automatic context file edits.
- Marketplace publishing.
- JetBrains, Zed, or other editor support.
- Compatibility testing for non-VS Code editors.
- Deep call graph analysis.
- Full semantic wiki generation for every symbol.
- Mouse-following UI.
- Always-on LLM review.
- Organization dashboards.
- GitHub PR comment posting.
- Multi-language symbol extraction beyond TS/TSX.

### 19.4 Platform Runway

The MVP should avoid decisions that block the broader product:

- Store semantic records with stable IDs rather than display-only strings.
- Keep provider-specific model code behind adapters.
- Keep MCP tools as wrappers around core services, not separate logic.
- Keep VS Code commands thin and route behavior through the local server/core packages.
- Persist evidence for every finding so future UI, PR export, and CI modes can reuse the same data.

## 20. Functional Requirements

### 20.1 Workspace Indexing

`Semantic Agent: Index Workspace` must:

- Identify the workspace root.
- Read package manager and scripts from root and workspace package manifests.
- Discover context files using the supported patterns.
- Discover TS/TSX source files while respecting `.gitignore` and common generated/build directories.
- Extract document symbols for TS/TSX files.
- Persist file metadata, context file metadata, extracted rules, symbols, and index status.
- Return a job ID immediately for long-running indexing work.

The command must be safe to run repeatedly. Re-indexing should update changed files, remove deleted records, and leave unchanged records intact.

### 20.2 Context Validation

`Semantic Agent: Validate Workspace Context` must:

- Run context discovery if no index exists.
- Extract candidate rules and references from context files.
- Validate referenced paths, globs, commands, package managers, dependencies, and scoped applicability.
- Produce findings with severity, evidence, source range, and suggested fix text where deterministic.
- Show findings in the sidebar grouped by context file and severity.
- Allow users to recheck a finding after editing code or context.
- Allow users to mark a finding as false positive, confirmed, ignored, or needing a context update.

The MVP should prefer fewer high-confidence findings over broad speculative output.

### 20.3 Review Mode

`Semantic Agent: Start Review Mode` must:

- Read the current branch.
- Use the configured target branch or prompt the user to select one.
- Compute `git merge-base HEAD <target>`.
- Parse changed files and zero-context diff hunks.
- Map changed TS/TSX ranges to nearest symbols.
- Retrieve applicable context rules for changed files/symbols.
- Run deterministic validators against changed files and diff contents.
- Persist a review session and display it in the sidebar.

Review mode must not require network access. It should work on local branches and already-fetched remote refs.

### 20.4 Current Symbol Context

`Semantic Agent: Show Current Symbol Context` must:

- Read the active editor file and cursor/selection range.
- Resolve the nearest TS/TSX symbol.
- Display symbol name, kind, range, containing file, exports/imports where available, related tests, applicable rules, and known findings.
- Include staleness status based on file hash and indexed commit.

This command may use VS Code/LSP data when available, but the server should be able to answer from its stored index after indexing.

### 20.5 Sidebar Requirements

The sidebar must have three stable top-level sections:

```txt
Current Context
Review Mode
Context Health
```

The sidebar must support:

- Empty state before indexing.
- Indexing state with job progress.
- Error state with retry action.
- Findings grouped by severity.
- Click-through navigation to source files and ranges.
- Manual refresh.
- Finding actions: recheck, mark false positive, confirm, ignore, and mark needs context update.

### 20.6 Human Feedback Loop

Human feedback should be included in the MVP because trust is part of the product, not a later polish pass.

The MVP feedback loop should support:

- Re-run validation for one finding, one context file, the current file, or the whole workspace.
- Persist user feedback on findings without modifying source files automatically.
- Show user-confirmed and user-dismissed state in the sidebar.
- Keep deterministic evidence visible after feedback so future users can audit the decision.
- Treat human feedback as metadata, not as a replacement for source-of-truth context files.

Automatic context file edits remain out of scope. The tool may suggest text, but a human should make or approve the edit.

## 21. Extension-to-Server API Contract

The extension and server should communicate through local HTTP in the MVP using Hono. Treat this as an internal API, not a public platform API.

Prefer a tRPC-like developer experience without committing to a separate public schema:

- Define route handlers and request/response types in TypeScript.
- Generate or infer the extension client types from Hono route definitions where practical.
- Keep shared DTO types in `packages/shared`.
- Use runtime validation at trust boundaries, but do not maintain a duplicate OpenAPI/schema layer for private extension-server calls.
- Keep request/response shapes stable enough for tests and future MCP wrappers.

### 21.1 Common Response Shapes

```ts
type ApiSuccess<T> = {
  ok: true;
  data: T;
};

type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    recoverable: boolean;
    details?: unknown;
  };
};

type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
```

All source locations should use one-based line and column numbers for UI consistency.

```ts
type SourceRange = {
  file: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
};
```

### 21.2 Workspace Routes

```txt
POST /workspace/open
POST /workspace/index
GET  /workspace/status
GET  /workspace/files
```

```ts
type OpenWorkspaceRequest = {
  workspaceRoot: string;
};

type WorkspaceStatus = {
  workspaceRoot: string;
  indexedCommit?: string;
  indexState: "not-indexed" | "indexing" | "ready" | "error";
  activeJobId?: string;
  lastIndexedAt?: string;
  fileCount: number;
  contextFileCount: number;
  symbolCount: number;
};
```

### 21.3 Job Routes

```txt
GET    /jobs/:jobId
DELETE /jobs/:jobId
```

```ts
type JobStatus = {
  id: string;
  type:
    | "index-workspace"
    | "validate-context"
    | "start-review"
    | "refresh-file"
    | "refresh-context-file"
    | "recheck-finding";
  state: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  progress?: {
    completed: number;
    total?: number;
    message?: string;
  };
  createdAt: string;
  updatedAt: string;
  error?: ApiFailure["error"];
};
```

### 21.4 Context Routes

```txt
POST /context/validate
GET  /context/files
GET  /context/rules
GET  /context/current?file=...&line=...&column=...
POST /context/files/:id/refresh
POST /context/suggest-update
```

`POST /context/suggest-update` should be disabled unless a model provider is available and external or provider-mediated model calls are allowed by settings.

### 21.5 Review Routes

```txt
POST /review/start
GET  /review/session/:id
GET  /review/session/:id/findings
DELETE /review/session/:id
```

```ts
type StartReviewRequest = {
  targetBranch: string;
  includeUncommitted?: boolean;
};

type ReviewSessionSummary = {
  id: string;
  currentBranch: string;
  targetBranch: string;
  mergeBase: string;
  changedFileCount: number;
  changedSymbolCount: number;
  findingCount: number;
  createdAt: string;
};
```

### 21.6 Symbol Routes

```txt
GET  /symbol/current?file=...&line=...&column=...
POST /symbol/explain
GET  /symbol/:id
```

`POST /symbol/explain` should first return deterministic context. AI-generated explanation is an optional enrichment when enabled.

### 21.7 Finding Routes

```txt
GET  /findings
GET  /findings/:id
POST /findings/:id/recheck
POST /findings/:id/feedback
```

```ts
type FindingFeedbackRequest = {
  state: "false-positive" | "confirmed" | "ignored" | "needs-context-update";
  note?: string;
};
```

Feedback routes should update finding metadata and create an audit record. They must not rewrite context files.

## 22. Data Model and SQLite Schema

The local database should be workspace-scoped. A single physical DB can contain multiple workspaces, but every table that stores repo data must include `workspace_id`.

### 22.1 Core Tables

```sql
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  root_path TEXT NOT NULL UNIQUE,
  current_commit TEXT,
  package_manager TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE files (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  path TEXT NOT NULL,
  kind TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  last_indexed_commit TEXT,
  last_indexed_at TEXT,
  deleted_at TEXT,
  UNIQUE(workspace_id, path)
);

CREATE TABLE symbols (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  start_line INTEGER NOT NULL,
  start_column INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  end_column INTEGER NOT NULL,
  export_kind TEXT,
  parent_symbol_id TEXT,
  content_hash TEXT,
  semantic_id TEXT
);

CREATE INDEX idx_symbols_lookup
  ON symbols(workspace_id, file_id, start_line, end_line);
```

### 22.2 Context Tables

```sql
CREATE TABLE context_files (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  context_type TEXT NOT NULL,
  parser_version TEXT NOT NULL,
  last_validated_at TEXT,
  UNIQUE(workspace_id, file_id)
);

CREATE TABLE agent_rules (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  context_file_id TEXT NOT NULL,
  title TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  text TEXT NOT NULL,
  applies_to_json TEXT NOT NULL,
  source_start_line INTEGER NOT NULL,
  source_start_column INTEGER NOT NULL,
  source_end_line INTEGER NOT NULL,
  source_end_column INTEGER NOT NULL,
  confidence REAL NOT NULL,
  last_validated_commit TEXT
);

CREATE TABLE findings (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  review_session_id TEXT,
  source TEXT NOT NULL,
  severity TEXT NOT NULL,
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  suggested_fix TEXT,
  trust_state TEXT NOT NULL,
  user_state TEXT,
  source_file TEXT,
  source_start_line INTEGER,
  source_start_column INTEGER,
  source_end_line INTEGER,
  source_end_column INTEGER,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE TABLE finding_feedback (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  finding_id TEXT NOT NULL,
  state TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);
```

### 22.3 Review Tables

```sql
CREATE TABLE review_sessions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  current_branch TEXT NOT NULL,
  target_branch TEXT NOT NULL,
  merge_base TEXT NOT NULL,
  include_uncommitted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE changed_files (
  id TEXT PRIMARY KEY,
  review_session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  status TEXT NOT NULL,
  additions INTEGER NOT NULL DEFAULT 0,
  deletions INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE changed_symbols (
  id TEXT PRIMARY KEY,
  review_session_id TEXT NOT NULL,
  symbol_id TEXT,
  file_path TEXT NOT NULL,
  symbol_name TEXT,
  symbol_kind TEXT,
  start_line INTEGER,
  end_line INTEGER,
  risk_level TEXT NOT NULL DEFAULT 'unknown'
);
```

### 22.4 Semantic Document Tables

```sql
CREATE TABLE semantic_docs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  semantic_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  details TEXT,
  related_json TEXT NOT NULL,
  confidence REAL NOT NULL,
  generated_from_commit TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  stale_state TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(workspace_id, semantic_id)
);
```

## 23. Indexing Lifecycle

### 23.1 Cold Index

A cold index should:

1. Create or load the workspace record.
2. Read package metadata.
3. Discover context files.
4. Parse context files and extracted rules.
5. Discover TS/TSX files.
6. Extract symbols and source ranges.
7. Compute content hashes.
8. Persist all records in a transaction per batch.
9. Mark workspace status as ready.

### 23.2 Incremental Index

An incremental index should compare current file hashes to stored hashes:

- New file: insert file and parse if supported.
- Changed file: update file hash and re-parse derived records.
- Deleted file: mark deleted and remove active derived records.
- Unchanged file: skip parsing.

The server should expose enough progress information for the extension to show indexing without freezing the UI.

### 23.3 Watchers and Manual Refresh

The extension may register file watchers for context files and TS/TSX files. Watchers should enqueue refresh jobs, not parse directly in the extension.

Manual refresh commands:

```txt
Semantic Agent: Refresh Current File
Semantic Agent: Refresh Workspace Index
Semantic Agent: Refresh Context Files
```

### 23.4 Staleness States

```ts
type StaleState = "fresh" | "partially-stale" | "stale" | "unknown";
```

Rules:

- `fresh`: content hash and commit match indexed data.
- `partially-stale`: related files changed after generation.
- `stale`: source file changed after generation.
- `unknown`: missing commit/hash metadata.

## 24. Validation Engine Specification

### 24.1 Extractors

Initial extractors should be deterministic and conservative:

- Markdown heading and bullet extractor.
- Optional fenced JSON metadata extractor for `appliesTo`, `severity`, `description`, and `globs`.
- Inline code path extractor for path-like strings.
- Command extractor for fenced shell blocks and inline `npm/pnpm/yarn/bun` commands.
- Package manager extractor.
- Dependency/framework mention extractor.

Extractor output should preserve source ranges so findings can navigate back to the relevant instruction.

### 24.2 Validators

Initial validators:

```txt
path-exists
glob-matches-files
command-exists
package-manager-matches
dependency-mentioned-installed
forbidden-import-in-diff
context-file-applies-to-changed-file
```

Each validator should return zero or more findings and must include evidence.

```ts
type Evidence = {
  kind:
    | "source-range"
    | "path"
    | "command"
    | "package-json"
    | "dependency"
    | "diff-hunk"
    | "symbol";
  label: string;
  value: string;
  range?: SourceRange;
};
```

### 24.3 Severity Rules

Default severity mapping:

- `error`: explicit blocking rule violated or command/path prevents a documented workflow from running.
- `warning`: likely stale instruction, missing path, package-manager mismatch, or forbidden import.
- `info`: low-risk drift, weak signal, or optional suggested cleanup.

LLM-originated findings should not be `error` in the MVP unless backed by a deterministic validator.

### 24.4 Suggested Fixes

Suggested fixes in the MVP are text-only. The extension must not apply patches automatically.

Good suggested fixes:

- "Replace `npm run test` with `pnpm test`."
- "Update `src/graphql` to `server/graphql` if this instruction still describes GraphQL ownership."
- "Remove this `appliesTo` glob or point it at the current source directory."

Avoid suggested fixes when the current state cannot be inferred from deterministic evidence.

## 25. Review Pipeline Specification

### 25.1 Diff Parsing

Use Git CLI output as the source of truth:

```bash
git diff --name-status <base>...HEAD
git diff --numstat <base>...HEAD
git diff --unified=0 <base>...HEAD
```

The parser should preserve:

- File status.
- Old and new paths for renames.
- Added/deleted line ranges.
- Hunk text where needed for validators.

### 25.2 Range to Symbol Mapping

For TS/TSX files:

1. Load indexed symbols for the changed file.
2. Find symbols whose ranges intersect changed ranges.
3. If no symbol intersects, select the nearest containing parent symbol.
4. If still unknown, group changes under file-level context.

### 25.3 Risk Scoring

Risk scoring should be explainable and rule-based in the MVP.

Signals:

- Changed exported symbol.
- Changed context/provider/hook/component.
- Changed file with applicable blocking/warning rules.
- Changed file with stale or missing tests.
- Changed dependency/import boundary.
- Large deletion or rename.

Output:

```ts
type RiskLevel = "low" | "medium" | "high" | "unknown";
```

### 25.4 Findings Generation

Findings should be generated in this order:

1. Deterministic validators.
2. Rule applicability checks.
3. Optional AI-assisted review notes when enabled.

The UI should label AI-assisted notes separately from deterministic findings.

## 26. Privacy, Security, and Model Boundaries

### 26.1 Default Privacy Posture

The default configuration must not send source code or context files to external model providers.

```json
{
  "semanticAgent.allowExternalModelCalls": false,
  "semanticAgent.modelProvider": "auto"
}
```

If `allowExternalModelCalls` is false, direct OpenAI, Anthropic, Azure OpenAI, or Ollama-over-network calls must not run. VS Code Language Model API and GitHub Copilot provider use should still be explicit and visible in settings because enterprise policies vary.

### 26.2 Prompt Grounding

When model calls are enabled, prompts must include bounded evidence only:

- Relevant source ranges.
- Applicable rules.
- Diff hunks.
- Existing deterministic findings.
- Explicit instruction to avoid claims not supported by evidence.

Model output for review and validation must use structured JSON and should be rejected if it cannot be parsed.

Every AI-assisted claim must include evidence references that a human can open quickly:

- Source file and range.
- Context file and range.
- Documentation file and range or URL.
- Diff hunk.
- Deterministic finding ID.

The UI must render those references as click-through links. AI-assisted output without evidence links must be treated as unsupported, not deterministic. Unsupported output can be displayed only as a low-trust note and must not be used for blocking findings, risk scores, or context source-of-truth decisions.

### 26.3 Source of Truth and Determinism

The source of truth is the repository plus user-reviewed metadata. AI output is never source of truth by itself.

Deterministic records should be reproducible from:

- Current file contents.
- Git commit and diff data.
- Context files.
- Package manifests.
- Persisted human feedback.

Generated summaries must store:

- Evidence links.
- Generator type and version.
- Source commit.
- Input content hashes.
- Staleness state.
- Trust state.

If any required evidence is missing or stale, the UI should make that visible before the user relies on the output.

### 26.4 Secrets

The indexer must avoid storing `.env` files and common secret files. The extension should respect `.gitignore` and also exclude:

```txt
.env
.env.*
**/*.pem
**/*.key
**/id_rsa
**/id_ed25519
```

Findings may reference the existence of excluded files only when needed for configuration analysis; they must not store file contents.

## 27. Error Handling and Failure Modes

The extension should handle common local failures clearly:

- Server not running: offer to start or restart server.
- Index job failed: show error and retry action.
- Git target branch missing: ask user to select another branch.
- Merge base unavailable: explain that histories may be unrelated.
- Workspace is not a Git repo: disable review mode but allow context validation.
- SQLite migration failed: show database path and recovery guidance.
- Model provider unavailable: fall back to deterministic-only results.

Errors should be actionable and should not erase existing index data unless migration requires it.

## 28. Acceptance Criteria

### 28.1 Context Validation Acceptance

Given a fixture repo with:

- `AGENTS.md` referencing `src/graphql`.
- Actual GraphQL files under `server/graphql`.
- `packageManager` set to `pnpm`.
- Context instructions using `npm run test`.

When the user runs `Semantic Agent: Validate Workspace Context`, the sidebar must show:

- The discovered `AGENTS.md`.
- A stale path warning for `src/graphql`.
- A package-manager mismatch warning for `npm`.
- Evidence pointing to the relevant source ranges.

### 28.2 Review Mode Acceptance

Given a branch with TS/TSX changes and a valid target branch:

When the user runs `Semantic Agent: Start Review Mode`, the sidebar must show:

- Current branch.
- Target branch.
- Merge base.
- Changed files.
- Changed symbols for TS/TSX files.
- Applicable rules for changed files.
- Deterministic findings generated from the diff.

### 28.3 Current Symbol Acceptance

Given an indexed workspace and an active TS/TSX editor:

When the cursor is inside an exported function/component and the user runs `Semantic Agent: Show Current Symbol Context`, the sidebar must show:

- Symbol name and kind.
- Source range.
- Related tests by naming/path convention.
- Applicable agent rules.
- Staleness status.

### 28.4 Privacy Acceptance

Given default settings:

When indexing, validating context, starting review mode, or showing current symbol context:

- No external model provider should be called.
- The UI should still produce deterministic findings and context.
- Any command requiring model output should show a disabled/provider-unavailable state.

## 29. Implementation Milestones

### 29.1 Milestone A: Extension and Server Skeleton

Deliver:

- Extension activation.
- Local server startup or connection setting.
- Shared API types package.
- Hono server with type-safe extension client.
- `Ping Server` command.
- Sidebar shell with empty/indexing/error states.

Acceptance:

- Running the extension in VS Code Extension Development Host shows the sidebar and successful ping.

### 29.2 Milestone B: Context Registry and Validation

Deliver:

- Context file discovery.
- Rule/reference extraction.
- SQLite persistence.
- Path, command, package-manager, dependency, and glob validators.
- Context health sidebar.
- Manual context refresh and finding recheck.
- Persisted finding feedback states.

Acceptance:

- Fixture stale-context repo produces expected findings without model calls.
- A false-positive finding can be marked, persisted, and shown as dismissed without deleting the underlying evidence.

### 29.3 Milestone C: Review Mode

Deliver:

- Target branch selection.
- Merge-base and diff parsing.
- Changed file and range persistence.
- TS/TSX changed symbol mapping.
- Rule lookup against changed files.
- Review sidebar grouping.

Acceptance:

- Fixture branch review shows changed symbols and deterministic findings.

### 29.4 Milestone D: Current Symbol Context

Deliver:

- Active editor command.
- TS/TSX symbol lookup.
- Related test detection.
- Applicable rule display.
- Staleness metadata.

Acceptance:

- Cursor inside an exported symbol displays relevant context in under one second after indexing.

### 29.5 Milestone E: Optional Model Provider Enrichment

Deliver:

- Provider interface.
- Disabled-by-default settings.
- Structured JSON response validation.
- Required evidence-link validation for every AI-assisted claim.
- AI-assisted symbol explanation or review note behind explicit opt-in.

Acceptance:

- With external calls disabled, deterministic behavior still works.
- With a configured provider enabled, model output is labeled, grounded in evidence, and rejected or marked unsupported when evidence links are missing.

## 30. MVP Plan

### Phase 0 — Skeleton

Goal: prove extension/server communication.

Build:

- VS Code extension scaffold.
- Local Hono server.
- Type-safe internal extension client.
- Command: `Semantic Agent: Ping Server`.
- Sidebar shell with empty, indexing, and error states.
- Workspace settings.

### Phase 1 — Context Registry

Goal: scan and validate agent context files.

Build:

- Find known context files.
- Parse Markdown and optional fenced JSON metadata.
- Extract obvious rules, commands, paths, and package manager mentions.
- Detect stale paths.
- Detect missing commands.
- Detect package manager mismatch.
- Support manual recheck for a finding or context file.
- Persist false-positive, confirmed, ignored, and needs-context-update feedback.
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
- Deterministic symbol summaries with source links.
- Optional generated summaries through selected model provider only when evidence-linked.
- Sidebar follows current file/symbol.

### Phase 4 — AI-Assisted Review Notes

Goal: produce useful review findings.

Build:

- Model provider adapter.
- Direct OpenAI or Vercel AI SDK first.
- Structured JSON output for review findings.
- Evidence-link validator for AI-assisted findings.
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

### Phase 6 — Packaging

Goal: test outside extension development mode.

Build:

- Package `.vsix`.
- Install in local VS Code.
- Test with real repos.
- Later consider VS Code Marketplace distribution.

## 31. Initial Prototype Recommendation

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

## 32. Non-Goals for MVP

Do not start with:

- Full autonomous coding agent.
- Mouse-following UI.
- Multi-editor support.
- Marketplace publishing.
- Perfect multi-language support.
- Deep call graph analysis.
- Full LLM-generated architecture wiki.
- Automatic context file modification without review.

## 33. Risks

### 33.1 Stale AI Summaries

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

### 33.2 Noise

If the sidebar constantly changes with low-value content, developers will ignore it.

Mitigation:

- Start with explicit commands.
- Allow pinning sidebar context.
- Use quiet/default/deep modes later.
- Keep hover concise.

### 33.3 Enterprise Model Restrictions

At work, external OpenAI/Anthropic calls may not be allowed.

Mitigation:

- Provider abstraction.
- VS Code Language Model API option.
- GitHub Copilot SDK option.
- MCP server option.
- `allowExternalModelCalls: false` setting.

## 34. Long-Term Direction

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
- Compile one source of truth into `AGENTS.md`, `CLAUDE.md`, Copilot instructions, Cursor rules, `SKILL.md`, and other agent instruction files.
- PR comment export.
- GitHub Action mode.
- Organization-wide context governance dashboard.
- JetBrains/Zed support.
- Visual dependency/risk maps.
- Rule authoring UI.
- Agent prompt export per file/symbol/diff.

## 35. Final Working Definition

This project is:

> A VS Code-first local semantic indexing and context validation extension that maps code, branch diffs, and agentic instruction files into a navigable, reviewable, and enforceable project knowledge layer.

The MVP should focus on three practical wins:

1. Validate and detect stale agentic context files.
2. Review a checked-out branch against a target branch inside the IDE.
3. Show file/symbol-specific semantic context in a sidebar.

Everything else should support those goals.
