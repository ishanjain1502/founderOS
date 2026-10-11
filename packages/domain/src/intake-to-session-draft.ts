import { FeatureChangeType } from "./contracts/enums";
import type { IntakeDraftPartial } from "./contracts/intake";
import type { SessionDraft } from "./contracts/session";
import { sessionDraftSchema } from "./contracts/session";

export function intakeDraftToSessionDraft(
  intake: IntakeDraftPartial,
): SessionDraft {
  const companyName = intake.company?.name;
  const featureTitle = intake.feature?.title;

  const parsed = sessionDraftSchema.parse({
    mode: intake.mode,
    decision: {
      questionText: intake.decision?.questionText ?? "",
      questionRevision: intake.decision?.questionRevision ?? 1,
    },
    companyProfile: {
      ...(companyName !== undefined && companyName !== ""
        ? { name: companyName }
        : {}),
      productSummary: intake.company?.productSummary ?? "",
      customerCount: intake.financials?.customerCount,
      cashUsd: intake.financials?.cashUsd,
      mrrUsd: intake.financials?.mrrUsd,
      runwayMonths: intake.financials?.runwayMonths,
    },
    featureProposal: {
      ...(featureTitle !== undefined && featureTitle !== ""
        ? { title: featureTitle }
        : {}),
      description: intake.feature?.description ?? "",
      changeType: intake.feature?.changeType ?? FeatureChangeType.Feature,
    },
    scenarios: intake.scenarios ?? [],
    assumptions: intake.assumptions ?? [],
  });
  return parsed;
}
