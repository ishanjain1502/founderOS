import { describe, it, expect } from "vitest";
import {
  PrimarySegment,
  PanelPrimaryChoice,
  StrategyKind,
  FeatureChangeType,
  ClaimKind,
  RecommendationStatus,
  RunStatus,
  panelPrimaryChoiceSchema,
  primarySegmentSchema,
  strategyKindSchema,
  featureChangeTypeSchema,
  claimKindSchema,
  recommendationStatusSchema,
  runStatusSchema,
} from "./enums";

describe("PanelPrimaryChoice", () => {
  it("parses pay_extra and rejects maybe", () => {
    expect(panelPrimaryChoiceSchema.safeParse("pay_extra").success).toBe(true);
    expect(panelPrimaryChoiceSchema.safeParse("maybe").success).toBe(false);
  });

  it("accepts all closed choices", () => {
    for (const value of Object.values(PanelPrimaryChoice)) {
      expect(panelPrimaryChoiceSchema.safeParse(value).success).toBe(true);
    }
  });
});

describe("PrimarySegment", () => {
  it("parses catalog values", () => {
    expect(
      primarySegmentSchema.safeParse(PrimarySegment.EnterpriseBuyer).success,
    ).toBe(true);
    expect(primarySegmentSchema.safeParse("not_a_segment").success).toBe(false);
  });
});

describe("StrategyKind", () => {
  it("parses known kinds", () => {
    expect(strategyKindSchema.safeParse(StrategyKind.Pilot).success).toBe(true);
    expect(
      strategyKindSchema.safeParse("enterprise_segment_launch").success,
    ).toBe(true);
  });

  it("allows custom snake_case kinds for Full mode", () => {
    expect(strategyKindSchema.safeParse("partner_channel_launch").success).toBe(
      true,
    );
  });

  it("rejects empty or invalid kinds", () => {
    expect(strategyKindSchema.safeParse("").success).toBe(false);
    expect(strategyKindSchema.safeParse("Broad-Launch").success).toBe(false);
  });
});

describe("FeatureChangeType", () => {
  it("parses feature and rejects invalid", () => {
    expect(featureChangeTypeSchema.safeParse("feature").success).toBe(true);
    expect(featureChangeTypeSchema.safeParse("billing").success).toBe(false);
  });
});

describe("ClaimKind", () => {
  it("parses hypothesis, assumption, unknown", () => {
    expect(claimKindSchema.safeParse(ClaimKind.Hypothesis).success).toBe(true);
    expect(claimKindSchema.safeParse(ClaimKind.Assumption).success).toBe(true);
    expect(claimKindSchema.safeParse(ClaimKind.Unknown).success).toBe(true);
    expect(claimKindSchema.safeParse("evidence").success).toBe(false);
  });
});

describe("RecommendationStatus", () => {
  it("parses draft, current, superseded", () => {
    expect(
      recommendationStatusSchema.safeParse(RecommendationStatus.Draft).success,
    ).toBe(true);
    expect(
      recommendationStatusSchema.safeParse(RecommendationStatus.Current).success,
    ).toBe(true);
    expect(
      recommendationStatusSchema.safeParse(RecommendationStatus.Superseded)
        .success,
    ).toBe(true);
    expect(recommendationStatusSchema.safeParse("final").success).toBe(false);
  });
});

describe("RunStatus", () => {
  it("parses lifecycle statuses", () => {
    for (const value of Object.values(RunStatus)) {
      expect(runStatusSchema.safeParse(value).success).toBe(true);
    }
    expect(runStatusSchema.safeParse("running").success).toBe(false);
  });
});
