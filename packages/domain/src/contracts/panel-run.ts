import { z } from "zod";
import { baseEntitySchema } from "./base";
import { EpistemicKind } from "../epistemic";
import {
  panelPrimaryChoiceSchema,
  primarySegmentSchema,
} from "./enums";

const sessionScopedBaseSchema = baseEntitySchema.extend({
  sessionId: z.string().uuid(),
});

const likertScaleSchema = z.number().int().min(1).max(5);

export const switchingCostSchema = z.enum(["low", "medium", "high"]);

export type SwitchingCost = z.infer<typeof switchingCostSchema>;

export const buyingAuthoritySchema = z.enum([
  "none",
  "influencer",
  "decider",
]);

export type BuyingAuthority = z.infer<typeof buyingAuthoritySchema>;

export const primaryPurchasePrioritySchema = z.enum([
  "price",
  "features",
  "security",
  "ease",
  "support",
]);

export type PrimaryPurchasePriority = z.infer<
  typeof primaryPurchasePrioritySchema
>;

/** Structured persona fields (SP-06 profile contract). */
export const archetypeProfileSchema = z.object({
  companySizeBand: z.string().min(1),
  budgetSensitivity: likertScaleSchema,
  painLevel: likertScaleSchema,
  workflowSummary: z.string().min(1),
  aiAdoptionComfort: likertScaleSchema,
  switchingCost: switchingCostSchema,
  buyingAuthority: buyingAuthoritySchema,
  primaryPurchasePriority: primaryPurchasePrioritySchema,
  industry: z.string().min(1).optional(),
  region: z.string().min(1).optional(),
});

export type ArchetypeProfile = z.infer<typeof archetypeProfileSchema>;

/** Stable persona template for a session (SP-02 §2.4, Appendix A). */
export const archetypeSchema = sessionScopedBaseSchema
  .merge(archetypeProfileSchema)
  .extend({
    primarySegment: primarySegmentSchema,
    tags: z.array(primarySegmentSchema).optional(),
  });

export type Archetype = z.infer<typeof archetypeSchema>;

/** Frozen stimulus + profile seen by a simulated respondent (SP-02-Q24). */
export const respondentEvaluationSnapshotSchema = z.object({
  archetypeProfile: archetypeProfileSchema,
  questionnaireVersion: z.number().int().min(1),
  panelStimulusId: z.string().uuid(),
  stimulusVersion: z.number().int().min(1),
  featureSummary: z.string().min(1),
  productSummary: z.string().min(1),
  modelSettingsHash: z.string().min(1).optional(),
});

export type RespondentEvaluationSnapshot = z.infer<
  typeof respondentEvaluationSnapshotSchema
>;

const panelChoiceCountsSchema = z.record(
  panelPrimaryChoiceSchema,
  z.number().int().nonnegative(),
);

const panelChoiceRatesPercentSchema = z.record(
  panelPrimaryChoiceSchema,
  z.number().min(0).max(100),
);

/** One archetype instance's answers for a panel run (SP-02 Appendix A). */
export const respondentEvaluationSchema = baseEntitySchema.extend({
  panelRunId: z.string().uuid(),
  archetypeId: z.string().uuid(),
  panelStimulusId: z.string().uuid(),
  primaryChoice: panelPrimaryChoiceSchema,
  snapshot: respondentEvaluationSnapshotSchema,
});

export type RespondentEvaluation = z.infer<typeof respondentEvaluationSchema>;

/**
 * Segment-level primary-choice rollup; always labeled simulated (SP-02-Q42).
 * `epistemicLabel` mirrors storage/display enum; `simulatedLabel` is the required literal flag.
 */
export const segmentAggregateSchema = baseEntitySchema.extend({
  panelRunId: z.string().uuid(),
  primarySegment: primarySegmentSchema,
  respondentCount: z.number().int().nonnegative(),
  choiceCounts: panelChoiceCountsSchema,
  choiceRatesPercent: panelChoiceRatesPercentSchema,
  disagreementSummary: z.string().min(1),
  simulatedLabel: z.literal(true),
  epistemicLabel: z.literal(EpistemicKind.Simulated).default(
    EpistemicKind.Simulated,
  ),
});

export type SegmentAggregate = z.infer<typeof segmentAggregateSchema>;

/** One synthetic panel execution under an agent Run (SP-02 §2.1). */
export const panelRunSchema = sessionScopedBaseSchema.extend({
  runId: z.string().uuid(),
  panelStimulusId: z.string().uuid(),
  panelSeed: z.string().min(1).optional(),
});

export type PanelRun = z.infer<typeof panelRunSchema>;
