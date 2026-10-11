import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { ClaimRationaleTag } from "./contracts/claim";
import { loadDemoCard } from "./demo-card";
import { demoCardToSessionDraft } from "./demo-card-to-draft";
import { sessionDraftSchema } from "./contracts/session";
import { RunMode } from "./run-mode";

describe("demoCardToSessionDraft", () => {
  it("maps decision-card-ai-analytics.json to a valid demo SessionDraft", () => {
    const raw = JSON.parse(
      readFileSync(
        join(__dirname, "../../../fixtures/demo/decision-card-ai-analytics.json"),
        "utf8",
      ),
    );
    const card = loadDemoCard(raw);
    const draft = demoCardToSessionDraft(card);

    expect(draft.mode).toBe(RunMode.Demo);
    expect(draft.decision.questionText).toBe(card.decisionQuestion);
    expect(draft.companyProfile.name).toBe("Example SaaS Co");
    expect(draft.featureProposal.title).toContain("AI-powered analytics");

    const adoptionAssumptions = draft.assumptions.filter(
      (row) =>
        row.mapsTo === "adoption_rate" &&
        row.rationaleTag === ClaimRationaleTag.DemoFixture,
    );
    expect(adoptionAssumptions.length).toBeGreaterThanOrEqual(2);

    for (const row of adoptionAssumptions) {
      expect(row.numeric.unit).toBe("percent");
      expect(row.numeric.value).toBeGreaterThanOrEqual(0);
      expect(row.numeric.value).toBeLessThanOrEqual(100);
    }

    const pilotAdoption = adoptionAssumptions.find(
      (row) => row.scenarioKey === "pilot",
    );
    const broadAdoption = adoptionAssumptions.find(
      (row) => row.scenarioKey === "broad_launch",
    );
    expect(pilotAdoption?.numeric).toEqual({ unit: "percent", value: 8 });
    expect(broadAdoption?.numeric).toEqual({ unit: "percent", value: 18 });

    const buildCosts = draft.assumptions.filter(
      (row) => row.mapsTo === "build_cost",
    );
    expect(buildCosts).toHaveLength(2);
    expect(buildCosts.every((row) => row.rationaleTag === ClaimRationaleTag.DemoFixture)).toBe(
      true,
    );

    expect(draft.scenarios.map((s) => s.key).sort()).toEqual([
      "broad_launch",
      "pilot",
    ]);
    for (const scenario of draft.scenarios) {
      expect(scenario.assumptionRefs.length).toBeGreaterThanOrEqual(2);
      for (const ref of scenario.assumptionRefs) {
        expect(draft.assumptions.some((row) => row.id === ref)).toBe(true);
      }
    }

    expect(sessionDraftSchema.safeParse(draft).success).toBe(true);
  });
});
