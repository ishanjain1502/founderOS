import { z } from "zod";

/** Panel segment catalog (SP-02 §4.1). */
export enum PrimarySegment {
  PriceSensitiveSmb = "price_sensitive_smb",
  EnterpriseBuyer = "enterprise_buyer",
  PowerUser = "power_user",
  LoyalExisting = "loyal_existing",
  LowEngagement = "low_engagement",
  TechnicalEvaluator = "technical_evaluator",
  ProcurementEnterprise = "procurement_enterprise",
  EarlyAdopter = "early_adopter",
  ConservativeBuyer = "conservative_buyer",
  CompetitorLoyal = "competitor_loyal",
}

export const primarySegmentSchema = z.nativeEnum(PrimarySegment);

/** Closed primary choice on panel questionnaire (SP-02 §4.2). */
export enum PanelPrimaryChoice {
  PayExtra = "pay_extra",
  UseIfIncluded = "use_if_included",
  TryNotPay = "try_not_pay",
  Ignore = "ignore",
  ConsiderSwitching = "consider_switching",
}

export const panelPrimaryChoiceSchema = z.nativeEnum(PanelPrimaryChoice);

/** Scenario strategy kind; known values plus custom strings in Full mode (SP-02 §4.3). */
export enum StrategyKind {
  BroadLaunch = "broad_launch",
  EnterpriseSegmentLaunch = "enterprise_segment_launch",
  Pilot = "pilot",
  Delay = "delay",
  DoNotBuild = "do_not_build",
}

const knownStrategyKindValues = new Set<string>(
  Object.values(StrategyKind) as string[],
);

export const strategyKindSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      knownStrategyKindValues.has(value) ||
      /^[a-z][a-z0-9_]*$/.test(value),
    { message: "Invalid strategy kind" },
  );

export function isKnownStrategyKind(
  value: string,
): value is StrategyKind {
  return knownStrategyKindValues.has(value);
}

/** Feature proposal change type (SP-02 §4.5). */
export enum FeatureChangeType {
  Feature = "feature",
  Pricing = "pricing",
  Ui = "ui",
  Other = "other",
}

export const featureChangeTypeSchema = z.nativeEnum(FeatureChangeType);

/** Claim kind: hypothesis, assumption, or unknown (SP-02 §2, §3). */
export enum ClaimKind {
  Hypothesis = "hypothesis",
  Assumption = "assumption",
  Unknown = "unknown",
}

export const claimKindSchema = z.nativeEnum(ClaimKind);

/** Recommendation lifecycle (SP-02 §2.3). */
export enum RecommendationStatus {
  Draft = "draft",
  Current = "current",
  Superseded = "superseded",
}

export const recommendationStatusSchema = z.nativeEnum(RecommendationStatus);

/** Agent run execution status (SP-09 / SP-10). */
export enum RunStatus {
  Pending = "pending",
  InProgress = "in_progress",
  Completed = "completed",
  CompletedWithGaps = "completed_with_gaps",
  Failed = "failed",
}

export const runStatusSchema = z.nativeEnum(RunStatus);
