import { describe, it, expect } from "vitest";
import { EntitySource } from "./base";
import { PanelPrimaryChoice, PrimarySegment } from "./enums";
import {
  archetypeSchema,
  respondentEvaluationSchema,
  segmentAggregateSchema,
  panelRunSchema,
} from "./panel-run";

const SESSION_ID = "00000000-0000-4000-8000-000000000001";
const RUN_ID = "00000000-0000-4000-8000-000000000002";
const PANEL_RUN_ID = "00000000-0000-4000-8000-000000000003";
const ARCHETYPE_ID = "00000000-0000-4000-8000-000000000004";
const STIMULUS_ID = "00000000-0000-4000-8000-000000000010";
const EVAL_ID = "00000000-0000-4000-8000-000000000020";
const AGG_ID = "00000000-0000-4000-8000-000000000030";
const CREATED_AT = "2026-01-01T00:00:00.000Z";

const archetypeProfile = {
  companySizeBand: "mid",
  usesProduct: true,
  budgetSensitivity: 3,
  painLevel: 4,
  workflowSummary: "Coordinates weekly ops reviews across three tools.",
  aiAdoptionComfort: 3,
  switchingCost: "medium",
  buyingAuthority: "influencer",
  primaryPurchasePriority: "features",
};

const evaluationSnapshot = {
  archetypeProfile,
  questionnaireVersion: 1,
  panelStimulusId: STIMULUS_ID,
  stimulusVersion: 1,
  featureSummary: "Premium AI analytics add-on.",
  productSummary: "B2B workflow SaaS.",
  modelSettingsHash: "sha256:demo-panel-v1",
};

describe("archetypeSchema", () => {
  it("accepts structured profile fields with primarySegment", () => {
    const r = archetypeSchema.safeParse({
      id: ARCHETYPE_ID,
      sessionId: SESSION_ID,
      contractVersion: 1,
      createdAt: CREATED_AT,
      source: EntitySource.Agent,
      primarySegment: PrimarySegment.EnterpriseBuyer,
      ...archetypeProfile,
    });
    expect(r.success).toBe(true);
  });

  it("rejects a company size outside smb, mid, and enterprise", () => {
    const r = archetypeSchema.safeParse({
      id: ARCHETYPE_ID,
      sessionId: SESSION_ID,
      contractVersion: 1,
      createdAt: CREATED_AT,
      source: EntitySource.Agent,
      primarySegment: PrimarySegment.EnterpriseBuyer,
      ...archetypeProfile,
      companySizeBand: "mid_market",
    });
    expect(r.success).toBe(false);
  });
});

describe("respondentEvaluationSchema", () => {
  it("requires primaryChoice, snapshot, and panelStimulusId", () => {
    const r = respondentEvaluationSchema.safeParse({
      id: EVAL_ID,
      contractVersion: 1,
      createdAt: CREATED_AT,
      source: EntitySource.Agent,
      panelRunId: PANEL_RUN_ID,
      archetypeId: ARCHETYPE_ID,
      panelStimulusId: STIMULUS_ID,
      primaryChoice: PanelPrimaryChoice.PayExtra,
      confidence: 72.5,
      objection: "Price is the blocker.",
      snapshot: evaluationSnapshot,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.primaryChoice).toBe(PanelPrimaryChoice.PayExtra);
      expect(r.data.snapshot.questionnaireVersion).toBe(1);
      expect(r.data.panelStimulusId).toBe(STIMULUS_ID);
    }
  });

  it("rejects missing snapshot", () => {
    const r = respondentEvaluationSchema.safeParse({
      id: EVAL_ID,
      contractVersion: 1,
      createdAt: CREATED_AT,
      source: EntitySource.Agent,
      panelRunId: PANEL_RUN_ID,
      archetypeId: ARCHETYPE_ID,
      panelStimulusId: STIMULUS_ID,
      primaryChoice: PanelPrimaryChoice.Ignore,
    });
    expect(r.success).toBe(false);
  });

  it("rejects missing panelStimulusId", () => {
    const r = respondentEvaluationSchema.safeParse({
      id: EVAL_ID,
      contractVersion: 1,
      createdAt: CREATED_AT,
      source: EntitySource.Agent,
      panelRunId: PANEL_RUN_ID,
      archetypeId: ARCHETYPE_ID,
      primaryChoice: PanelPrimaryChoice.Ignore,
      snapshot: evaluationSnapshot,
    });
    expect(r.success).toBe(false);
  });

  it("rejects an evaluation without confidence", () => {
    const r = respondentEvaluationSchema.safeParse({
      id: EVAL_ID,
      contractVersion: 1,
      createdAt: CREATED_AT,
      source: EntitySource.Agent,
      panelRunId: PANEL_RUN_ID,
      archetypeId: ARCHETYPE_ID,
      panelStimulusId: STIMULUS_ID,
      primaryChoice: PanelPrimaryChoice.PayExtra,
      objection: "Price is the blocker.",
      snapshot: evaluationSnapshot,
    });
    expect(r.success).toBe(false);
  });
});

describe("segmentAggregateSchema", () => {
  it("requires simulatedLabel true literal", () => {
    const r = segmentAggregateSchema.safeParse({
      id: AGG_ID,
      contractVersion: 1,
      createdAt: CREATED_AT,
      source: EntitySource.Agent,
      panelRunId: PANEL_RUN_ID,
      primarySegment: PrimarySegment.PowerUser,
      respondentCount: 6,
      choiceCounts: {
        [PanelPrimaryChoice.PayExtra]: 2,
        [PanelPrimaryChoice.UseIfIncluded]: 3,
        [PanelPrimaryChoice.TryNotPay]: 1,
        [PanelPrimaryChoice.Ignore]: 0,
        [PanelPrimaryChoice.ConsiderSwitching]: 0,
      },
      choiceRatesPercent: {
        [PanelPrimaryChoice.PayExtra]: 33.33,
        [PanelPrimaryChoice.UseIfIncluded]: 50,
        [PanelPrimaryChoice.TryNotPay]: 16.67,
        [PanelPrimaryChoice.Ignore]: 0,
        [PanelPrimaryChoice.ConsiderSwitching]: 0,
      },
      disagreementSummary:
        "Power users split between pay_extra and use_if_included.",
      simulatedLabel: true,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.simulatedLabel).toBe(true);
    }
  });

  it("rejects simulatedLabel false or omitted", () => {
    const base = {
      id: AGG_ID,
      contractVersion: 1,
      createdAt: CREATED_AT,
      source: EntitySource.Agent,
      panelRunId: PANEL_RUN_ID,
      primarySegment: PrimarySegment.PowerUser,
      respondentCount: 1,
      choiceCounts: {
        [PanelPrimaryChoice.PayExtra]: 1,
        [PanelPrimaryChoice.UseIfIncluded]: 0,
        [PanelPrimaryChoice.TryNotPay]: 0,
        [PanelPrimaryChoice.Ignore]: 0,
        [PanelPrimaryChoice.ConsiderSwitching]: 0,
      },
      choiceRatesPercent: {
        [PanelPrimaryChoice.PayExtra]: 100,
        [PanelPrimaryChoice.UseIfIncluded]: 0,
        [PanelPrimaryChoice.TryNotPay]: 0,
        [PanelPrimaryChoice.Ignore]: 0,
        [PanelPrimaryChoice.ConsiderSwitching]: 0,
      },
      disagreementSummary: "n=1 segment; interpret with caution.",
    };

    expect(
      segmentAggregateSchema.safeParse({ ...base, simulatedLabel: false })
        .success,
    ).toBe(false);
    expect(segmentAggregateSchema.safeParse(base).success).toBe(false);
  });
});

describe("panelRunSchema", () => {
  it("links session, agent run, and panel stimulus", () => {
    const r = panelRunSchema.safeParse({
      id: PANEL_RUN_ID,
      sessionId: SESSION_ID,
      contractVersion: 1,
      createdAt: CREATED_AT,
      source: EntitySource.Agent,
      runId: RUN_ID,
      panelStimulusId: STIMULUS_ID,
      panelSeed: "demo-panel-seed-2026",
    });
    expect(r.success).toBe(true);
  });
});
