export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    recoverable: boolean;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type SourceRange = {
  file: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
};

export type WorkspaceStatus = {
  workspaceRoot: string;
  indexedCommit?: string;
  indexState: "not-indexed" | "indexing" | "ready" | "error";
  activeJobId?: string;
  lastIndexedAt?: string;
  fileCount: number;
  contextFileCount: number;
  symbolCount: number;
};

export type JobStatus = {
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

export type Evidence = {
  kind: "source-range" | "path" | "command" | "package-json" | "dependency" | "diff-hunk" | "symbol";
  label: string;
  value: string;
  range?: SourceRange;
};

export type Finding = {
  id: string;
  workspaceId: string;
  reviewSessionId?: string;
  source: "rule" | "ai-assisted" | "stale-context" | "diff-analysis" | "human-feedback";
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  evidence: Evidence[];
  suggestedFix?: string;
  trustState: "deterministic" | "evidence-linked-ai" | "human-confirmed" | "unsupported";
  userState?: "false-positive" | "confirmed" | "ignored" | "needs-context-update";
  sourceRange?: SourceRange;
  createdAt: string;
  resolvedAt?: string;
};

export type FindingFeedbackRequest = {
  state: "false-positive" | "confirmed" | "ignored" | "needs-context-update";
  note?: string;
};
