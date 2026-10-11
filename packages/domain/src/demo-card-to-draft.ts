import type { DemoDecisionCard } from "./demo-card";
import { demoCardToIntakeDraft } from "./demo-card-to-intake";
import type { SessionDraft } from "./contracts/session";
import { intakeDraftToSessionDraft } from "./intake-to-session-draft";

/**
 * Maps a demo decision card into an in-memory {@link SessionDraft} (not persisted).
 */
export function demoCardToSessionDraft(card: DemoDecisionCard): SessionDraft {
  return intakeDraftToSessionDraft(demoCardToIntakeDraft(card));
}
