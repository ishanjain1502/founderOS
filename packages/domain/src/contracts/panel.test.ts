import { describe, it, expect } from "vitest";
import { EntitySource } from "./base";
import { PanelPrimaryChoice } from "./enums";
import {
  panelStimulusSchema,
  panelQuestionnaireSchema,
  panelQuestionSchema,
} from "./panel";

const SESSION_ID = "00000000-0000-4000-8000-000000000001";
const STIMULUS_ID = "00000000-0000-4000-8000-000000000010";
const CREATED_AT = "2026-01-01T00:00:00.000Z";

describe("panelStimulusSchema", () => {
  it("requires featureSummary, productSummary, and questionnaireVersion", () => {
    const r = panelStimulusSchema.safeParse({
      id: STIMULUS_ID,
      sessionId: SESSION_ID,
      contractVersion: 1,
      createdAt: CREATED_AT,
      source: EntitySource.Agent,
      stimulusVersion: 1,
      featureSummary: "Premium AI analytics add-on on project data.",
      productSummary: "B2B workflow SaaS for mid-market ops teams.",
      questionnaireVersion: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.featureSummary).toContain("analytics");
      expect(r.data.productSummary).toContain("workflow");
      expect(r.data.questionnaireVersion).toBe(1);
    }
  });

  it("rejects missing featureSummary", () => {
    const r = panelStimulusSchema.safeParse({
      id: STIMULUS_ID,
      sessionId: SESSION_ID,
      contractVersion: 1,
      createdAt: CREATED_AT,
      source: EntitySource.Agent,
      stimulusVersion: 1,
      productSummary: "B2B workflow SaaS.",
      questionnaireVersion: 1,
    });
    expect(r.success).toBe(false);
  });
});

describe("panelQuestionSchema", () => {
  it("accepts a question with prompt and primary choice response kind", () => {
    const r = panelQuestionSchema.safeParse({
      id: "primary_choice",
      prompt: "If this were offered at the stated price, what would you do?",
      responseKind: "primary_choice",
      choices: Object.values(PanelPrimaryChoice),
    });
    expect(r.success).toBe(true);
  });
});

describe("panelQuestionnaireSchema", () => {
  it("requires id, version, and a non-empty questions array", () => {
    const r = panelQuestionnaireSchema.safeParse({
      id: "panel-q-demo",
      version: 1,
      questions: [
        {
          id: "primary_choice",
          prompt: "If this were offered at the stated price, what would you do?",
          responseKind: "primary_choice",
          choices: [
            PanelPrimaryChoice.PayExtra,
            PanelPrimaryChoice.UseIfIncluded,
            PanelPrimaryChoice.TryNotPay,
            PanelPrimaryChoice.Ignore,
            PanelPrimaryChoice.ConsiderSwitching,
          ],
        },
      ],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.questions).toHaveLength(1);
      expect(r.data.version).toBe(1);
    }
  });

  it("rejects an empty questions array", () => {
    const r = panelQuestionnaireSchema.safeParse({
      id: "panel-q-demo",
      version: 1,
      questions: [],
    });
    expect(r.success).toBe(false);
  });
});
