import type { FindingFeedbackRequest } from "@semantic-agent/shared";

export function createFindingFeedbackRecord(input: {
  id: string;
  workspaceId: string;
  findingId: string;
  request: FindingFeedbackRequest;
  createdAt: string;
}) {
  return {
    id: input.id,
    workspaceId: input.workspaceId,
    findingId: input.findingId,
    state: input.request.state,
    note: input.request.note,
    createdAt: input.createdAt
  };
}
