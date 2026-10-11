import { describe, it, expect } from "vitest";
import { EntitySource } from "./base";
import { EpistemicKind } from "../epistemic";
import { PrimarySegment, RecommendationStatus, RunStatus } from "./enums";
import { runSchema } from "./run";
import {
  recommendationSchema,
  revisionSchema,
  codeImpactArtifactSchema,
} from "./recommendation";

const SESSION_ID = "00000000-0000-4000-8000-000000000001";
const RUN_ID = "00000000-0000-4000-8000-000000000002";
const SCENARIO_ID = "00000000-0000-4000-8000-000000000010";
const REC_ID = "00000000-0000-4000-8000-000000000020";
const PRIOR_REC_ID = "00000000-0000-4000-8000-000000000021";
const NEW_REC_ID = "00000000-0000-4000-8000-000000000022";
const REVISION_ID = "00000000-0000-4000-8000-000000000030";
const CODE_IMPACT_ID = "00000000-0000-4000-8000-000000000040";
const ASSUMPTION_ID = "00000000-0000-4000-8000-000000000050";
const EVIDENCE_ID = "00000000-0000-4000-8000-000000000060";
const CREATED_AT = "2026-01-01T00:00:00.000Z";

const baseRun = {
  id: RUN_ID,
  sessionId: SESSION_ID,
  contractVersion: 1,
  createdAt: CREATED_AT,
  source: EntitySource.Agent,
  status: RunStatus.Completed,
  startedAt: CREATED_AT,
  runKind: "standard" as const,
};

const validationStep = {
  method: "customer_interviews",
  assumptionTested: ASSUMPTION_ID,
  durationWeeks: 2,
  estimatedCost: "low",
  successCriterion: "3 of 5 confirm pain",
  owner: "user" as const,
};

const baseRecommendation = {
  id: REC_ID,
  sessionId: SESSION_ID,
  contractVersion: 1,
  createdAt: CREATED_AT,
  source: EntitySource.Agent,
  headline: "Run a pilot before broad launch",
  chosenScenarioId: SCENARIO_ID,
  evidenceRefs: [EVIDENCE_ID],
  assumptionRefs: [ASSUMPTION_ID],
  inferences: [
    {
      statement: "Enterprise segment shows cautious interest",
      refIds: [EVIDENCE_ID],
    },
  ],
  uncertainty: {
    missingData: ["finance_runway"],
    conflicts: [],
  },
  tradeoffs: [
    {
      topic: "speed_vs_risk",
      gain: "Faster learning",
      loss: "Higher short-term burn",
    },
  ],
  rejectedAlternatives: [
    {
      scenarioId: SCENARIO_ID,
      strategyLabel: "broad_launch",
      whyNotChosen: "Runway constraint not validated",
    },
  ],
  nextValidationStep: [validationStep],
  panelDisagreementSummary:
    "Enterprise buyers split; price-sensitive SMB largely unfavorable.",
  runId: RUN_ID,
  status: RecommendationStatus.Draft,
};

describe("runSchema", () => {
  it("requires neatlogsTraceId unless runKind is fallback", () => {
    const withoutTrace = runSchema.safeParse(baseRun);
    expect(withoutTrace.success).toBe(false);

    const withTrace = runSchema.safeParse({
      ...baseRun,
      neatlogsTraceId: "trace-abc-123",
    });
    expect(withTrace.success).toBe(true);

    const fallback = runSchema.safeParse({
      ...baseRun,
      runKind: "fallback",
    });
    expect(fallback.success).toBe(true);
    if (fallback.success) {
      expect(fallback.data.neatlogsTraceId).toBeUndefined();
    }
  });

  it("accepts optional codeImpactRunId and missingData.codeImpact", () => {
    const r = runSchema.safeParse({
      ...baseRun,
      neatlogsTraceId: "trace-abc-123",
      codeImpactRunId: CODE_IMPACT_ID,
      missingData: { codeImpact: true },
    });
    expect(r.success).toBe(true);
  });
});

describe("codeImpactArtifactSchema", () => {
  it("requires inferred epistemic label and summarized tool outputs", () => {
    const r = codeImpactArtifactSchema.safeParse({
      id: CODE_IMPACT_ID,
      contractVersion: 1,
      createdAt: CREATED_AT,
      source: EntitySource.Agent,
      runId: RUN_ID,
      repoRef: "https://github.com/example/app",
      commitSha: "abc123def456",
      candidatePaths: ["src/analytics", "src/billing"],
      toolOutputs: [
        { tool: "rg", summary: "12 matches in analytics module" },
      ],
      epistemicLabel: EpistemicKind.Inferred,
      narrativeSummary: "Moderate touch surface in billing paths.",
    });
    expect(r.success).toBe(true);
  });
});

describe("recommendationSchema", () => {
  it("limits nextValidationStep to at most 3 items", () => {
    const fourSteps = {
      ...baseRecommendation,
      nextValidationStep: [
        validationStep,
        { ...validationStep, method: "landing_page_test" },
        { ...validationStep, method: "paid_pilot" },
        { ...validationStep, method: "waitlist" },
      ],
    };
    const r = recommendationSchema.safeParse(fourSteps);
    expect(r.success).toBe(false);

    const three = recommendationSchema.safeParse({
      ...baseRecommendation,
      nextValidationStep: [
        validationStep,
        { ...validationStep, method: "landing_page_test" },
        { ...validationStep, method: "paid_pilot" },
      ],
    });
    expect(three.success).toBe(true);
  });

  it("accepts Q30 core fields with optional aggregate links", () => {
    const r = recommendationSchema.safeParse({
      ...baseRecommendation,
      codeImpactRunId: CODE_IMPACT_ID,
      latestPanelRunId: "00000000-0000-4000-8000-000000000070",
      latestFinanceRunId: "00000000-0000-4000-8000-000000000080",
      nextValidationStep: [
        {
          ...validationStep,
          targetSegment: PrimarySegment.EnterpriseBuyer,
        },
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe("revisionSchema", () => {
  it("links prior and new recommendations with triggering evidence", () => {
    const r = revisionSchema.safeParse({
      id: REVISION_ID,
      sessionId: SESSION_ID,
      contractVersion: 1,
      createdAt: CREATED_AT,
      source: EntitySource.Agent,
      priorRecommendationId: PRIOR_REC_ID,
      newRecommendationId: NEW_REC_ID,
      reason: "New churn signal contradicts enterprise adoption assumption",
      triggeringEvidenceIds: [EVIDENCE_ID],
      contradictedClaimIds: [ASSUMPTION_ID],
    });
    expect(r.success).toBe(true);
  });
});
