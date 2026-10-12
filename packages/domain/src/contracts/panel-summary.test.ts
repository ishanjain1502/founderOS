import { describe, expect, it } from "vitest";
import { emptyEpistemicSnapshot, epistemicSnapshotSchema } from "./epistemic-snapshot";
import { panelSummarySchema } from "./panel-summary";

describe("panelSummarySchema", () => {
  it("accepts a live complete summary and keeps old snapshots valid", () => {
    const summary = {
      status: "complete",
      source: "live",
      panelRunId: "00000000-0000-4000-8000-000000000099",
      panelSeed: "42",
      modelId: "deepseek/deepseek-v4-flash",
      questionnaireVersion: 1,
      nRequested: 10,
      nCompleted: 10,
      evaluationAttempts: 10,
      stopReason: "none",
      lowDisagreement: false,
      priceShown: null,
      packaging: null,
      currentUserCount: 7,
      promptTokens: 100,
      completionTokens: 50,
      cacheReadTokens: 0,
      estimatedUsd: 0.001,
      segments: [],
      noSimulatedRespondents: [],
      overall: {
        n: 0,
        choiceCounts: {
          pay_extra: 0,
          use_if_included: 0,
          try_not_pay: 0,
          ignore: 0,
          consider_switching: 0,
        },
        choiceRatesPercent: {
          pay_extra: 0,
          use_if_included: 0,
          try_not_pay: 0,
          ignore: 0,
          consider_switching: 0,
        },
        meanConfidence: 0,
      },
      disagreement: false,
      polarizedPairs: [],
      rerunCount: 0,
    };
    expect(panelSummarySchema.safeParse(summary).success).toBe(true);
    const snap = emptyEpistemicSnapshot();
    expect(epistemicSnapshotSchema.safeParse(snap).success).toBe(true);
    expect(
      epistemicSnapshotSchema.safeParse({ ...snap, panel: summary }).success,
    ).toBe(true);
  });
});
