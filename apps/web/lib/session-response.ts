import type { SessionRecord } from "@ceo-sandbox/db";

export function sessionToJson(record: SessionRecord) {
  return {
    id: record.id,
    status: record.status,
    intake: record.intake,
    epistemic: record.epistemic,
  };
}
