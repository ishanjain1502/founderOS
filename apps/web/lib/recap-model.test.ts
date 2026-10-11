import { describe, expect, it } from "vitest";
import { emptyIntakeDraft, GoalChip, RunMode } from "@ceo-sandbox/domain";
import { buildRecapModel } from "./recap-model";

describe("buildRecapModel", () => {
  it("shows two goal chips, budget, time, and illustrative for demo", () => {
    const intake = emptyIntakeDraft(RunMode.Demo);
    intake.decision = { questionText: "Launch?" };
    intake.feature = { title: "AI add-on", description: "Insights." };
    intake.goals = {
      chips: [GoalChip.Revenue, GoalChip.Expansion, GoalChip.Enterprise],
    };
    intake.constraints = { budgetUsd: 250000, executionMonths: 4 };
    const model = buildRecapModel(intake, "draft");
    expect(model.question).toBe("Launch?");
    expect(model.featureOneLiner).toBe("AI add-on");
    expect(model.goalChips).toEqual(["revenue", "expansion"]);
    expect(model.budgetUsd).toBe(250000);
    expect(model.executionMonths).toBe(4);
    expect(model.illustrative).toBe(true);
  });
});
