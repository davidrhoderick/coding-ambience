export const schemaSql = `
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  root_path TEXT NOT NULL UNIQUE,
  current_commit TEXT,
  package_manager TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS findings (
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

CREATE TABLE IF NOT EXISTS finding_feedback (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  finding_id TEXT NOT NULL,
  state TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);
`;
