import { GoalChip, RunMode, type IntakeDraftPartial } from "@ceo-sandbox/domain";
import { featureOneLiner } from "./feature-one-liner";

export function buildRecapModel(
  intake: IntakeDraftPartial,
  _status: string,
) {
  const chips = (intake.goals?.chips ?? []).slice(0, 2);
  return {
    question: intake.decision?.questionText ?? "",
    featureOneLiner: featureOneLiner(intake.feature),
    goalChips: chips.map((c) => c as GoalChip),
    budgetUsd: intake.constraints?.budgetUsd,
    executionMonths: intake.constraints?.executionMonths,
    illustrative: intake.mode === RunMode.Demo,
    provideLater: intake.financials?.provideLater === true,
    outsideSpecIntent: intake.outsideSpecIntent === true,
    alreadyLive: intake.alreadyLive === true,
    scopeStatus: intake.scopeCheck?.status,
  };
}
