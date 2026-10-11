import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { loadDemoCard } from "./demo-card";
import { demoCardToIntakeDraft } from "./demo-card-to-intake";
import { intakeDraftToSessionDraft } from "./intake-to-session-draft";
import { demoCardToSessionDraft } from "./demo-card-to-draft";
import {
  FieldSource,
  GoalChip,
  intakeDraftSchema,
  isIntakeComplete,
} from "./contracts/intake";
import { sessionDraftSchema } from "./contracts/session";
import { RunMode } from "./run-mode";

describe("demoCardToIntakeDraft", () => {
  it("hydrates a complete illustrative intake", () => {
    const card = loadDemoCard(
      JSON.parse(
        readFileSync(
          join(__dirname, "../../../fixtures/demo/decision-card-ai-analytics.json"),
          "utf8",
        ),
      ),
    );
    const intake = demoCardToIntakeDraft(card);
    expect(intake.mode).toBe(RunMode.Demo);
    expect(intake.scopeCheck.status).toBe("skipped");
    expect(intake.company.category).toBe(card.company.category);
    expect(intake.goals.chips).toEqual([
      GoalChip.Revenue,
      GoalChip.Expansion,
      GoalChip.Enterprise,
    ]);
    expect(intake.goals.primaryChip).toBe(GoalChip.Expansion);
    expect(intake.constraints.budgetUsd).toBe(250000);
    expect(intake.constraints.executionMonths).toBe(4);
    expect(intake.constraints.extraText).toBe(card.constraints.notes);
    expect(intake.feature.packaging).toBe(card.feature.packaging);
    expect(intake.financials.mrrUsd).toBe(80000);
    expect(intake.financials.provideLater).toBe(false);
    expect(intake.fieldSources["company.name"]).toBe(FieldSource.DemoFixture);
    expect(intakeDraftSchema.safeParse(intake).success).toBe(true);
    expect(isIntakeComplete(intake).ok).toBe(true);

    const projected = intakeDraftToSessionDraft(intake);
    expect(sessionDraftSchema.safeParse(projected).success).toBe(true);
    expect(projected.companyProfile.mrrUsd).toBe(80000);
    expect(demoCardToSessionDraft(card)).toEqual(projected);
  });
});
