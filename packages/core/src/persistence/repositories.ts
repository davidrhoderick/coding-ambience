import type { Finding } from "@semantic-agent/shared";
import type { SemanticAgentDatabase } from "./database.js";

export type WorkspaceRecord = {
  id: string;
  rootPath: string;
  packageManager?: string;
};

export type FindingFeedbackRecord = {
  id: string;
  workspaceId: string;
  findingId: string;
  state: NonNullable<Finding["userState"]>;
  note?: string;
  createdAt: string;
};

export function createRepositories(database: SemanticAgentDatabase) {
  return {
    workspaces: {
      upsert(record: WorkspaceRecord): void {
        const now = new Date(0).toISOString();
        database
          .prepare(
            `INSERT INTO workspaces (id, root_path, package_manager, created_at, updated_at)
             VALUES (@id, @rootPath, @packageManager, @now, @now)
             ON CONFLICT(id) DO UPDATE SET
               root_path = excluded.root_path,
               package_manager = excluded.package_manager,
               updated_at = excluded.updated_at`
          )
          .run({ ...record, packageManager: record.packageManager ?? null, now });
      }
    },
    findings: {
      save(finding: Finding): void {
        database
          .prepare(
            `INSERT INTO findings (
              id, workspace_id, review_session_id, source, severity, code, message, evidence_json,
              suggested_fix, trust_state, user_state, source_file, source_start_line, source_start_column,
              source_end_line, source_end_column, created_at, resolved_at
            ) VALUES (
              @id, @workspaceId, @reviewSessionId, @source, @severity, @code, @message, @evidenceJson,
              @suggestedFix, @trustState, @userState, @sourceFile, @sourceStartLine, @sourceStartColumn,
              @sourceEndLine, @sourceEndColumn, @createdAt, @resolvedAt
            )`
          )
          .run(toFindingRow(finding));
      },
      get(id: string): Finding | undefined {
        const row = database.prepare("SELECT * FROM findings WHERE id = ?").get(id) as FindingRow | undefined;
        return row ? fromFindingRow(row) : undefined;
      },
      addFeedback(record: FindingFeedbackRecord): void {
        database.transaction((feedback: FindingFeedbackRecord) => {
          const result = database
            .prepare("UPDATE findings SET user_state = ? WHERE id = ?")
            .run(feedback.state, feedback.findingId);

          if (result.changes === 0) {
            throw new Error(`Finding does not exist: ${feedback.findingId}`);
          }

          database
            .prepare(
              `INSERT INTO finding_feedback (id, workspace_id, finding_id, state, note, created_at)
               VALUES (@id, @workspaceId, @findingId, @state, @note, @createdAt)`
            )
            .run({ ...feedback, note: feedback.note ?? null });
        })(record);
      },
      listFeedback(findingId: string): FindingFeedbackRecord[] {
        const rows = database
          .prepare("SELECT id, workspace_id, finding_id, state, note, created_at FROM finding_feedback WHERE finding_id = ?")
          .all(findingId) as FindingFeedbackRow[];

        return rows.map((row) => ({
          id: row.id,
          workspaceId: row.workspace_id,
          findingId: row.finding_id,
          state: row.state,
          note: row.note ?? undefined,
          createdAt: row.created_at
        }));
      }
    }
  };
}

type FindingRow = {
  id: string;
  workspace_id: string;
  review_session_id: string | null;
  source: Finding["source"];
  severity: Finding["severity"];
  code: string;
  message: string;
  evidence_json: string;
  suggested_fix: string | null;
  trust_state: Finding["trustState"];
  user_state: Finding["userState"] | null;
  source_file: string | null;
  source_start_line: number | null;
  source_start_column: number | null;
  source_end_line: number | null;
  source_end_column: number | null;
  created_at: string;
  resolved_at: string | null;
};

type FindingFeedbackRow = {
  id: string;
  workspace_id: string;
  finding_id: string;
  state: FindingFeedbackRecord["state"];
  note: string | null;
  created_at: string;
};

function toFindingRow(finding: Finding) {
  return {
    id: finding.id,
    workspaceId: finding.workspaceId,
    reviewSessionId: finding.reviewSessionId ?? null,
    source: finding.source,
    severity: finding.severity,
    code: finding.code,
    message: finding.message,
    evidenceJson: JSON.stringify(finding.evidence),
    suggestedFix: finding.suggestedFix ?? null,
    trustState: finding.trustState,
    userState: finding.userState ?? null,
    sourceFile: finding.sourceRange?.file ?? null,
    sourceStartLine: finding.sourceRange?.startLine ?? null,
    sourceStartColumn: finding.sourceRange?.startColumn ?? null,
    sourceEndLine: finding.sourceRange?.endLine ?? null,
    sourceEndColumn: finding.sourceRange?.endColumn ?? null,
    createdAt: finding.createdAt,
    resolvedAt: finding.resolvedAt ?? null
  };
}

function fromFindingRow(row: FindingRow): Finding {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    reviewSessionId: row.review_session_id ?? undefined,
    source: row.source,
    severity: row.severity,
    code: row.code,
    message: row.message,
    evidence: JSON.parse(row.evidence_json) as Finding["evidence"],
    suggestedFix: row.suggested_fix ?? undefined,
    trustState: row.trust_state,
    userState: row.user_state ?? undefined,
    sourceRange:
      row.source_file !== null &&
      row.source_start_line !== null &&
      row.source_start_column !== null &&
      row.source_end_line !== null &&
      row.source_end_column !== null
        ? {
            file: row.source_file,
            startLine: row.source_start_line,
            startColumn: row.source_start_column,
            endLine: row.source_end_line,
            endColumn: row.source_end_column
          }
        : undefined,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined
  };
}
