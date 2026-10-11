import { z } from "zod";
import { baseEntitySchema } from "./base";
import { EpistemicKind } from "../epistemic";
import { primarySegmentSchema, recommendationStatusSchema } from "./enums";

const sessionScopedBaseSchema = baseEntitySchema.extend({
  sessionId: z.string().uuid(),
});

/** Summarized OSS tool output for code impact (SP-02 Appendix A). */
export const codeImpactToolOutputSchema = z.object({
  tool: z.string().min(1),
  summary: z.string().min(1),
  blobRef: z.string().min(1).optional(),
});

export type CodeImpactToolOutput = z.infer<typeof codeImpactToolOutputSchema>;

/** Deterministic code-impact analysis artifact (SP-02 §2.1, SP-12). */
export const codeImpactArtifactSchema = baseEntitySchema.extend({
  runId: z.string().uuid(),
  repoRef: z.string().min(1),
  commitSha: z.string().min(1),
  candidatePaths: z.array(z.string().min(1)),
  toolOutputs: z.array(codeImpactToolOutputSchema),
  narrativeSummary: z.string().min(1).optional(),
  epistemicLabel: z.literal(EpistemicKind.Inferred).default(
    EpistemicKind.Inferred,
  ),
  skippedReason: z.string().min(1).optional(),
});

export type CodeImpactArtifact = z.infer<typeof codeImpactArtifactSchema>;

export const uncertaintyConflictSchema = z.object({
  description: z.string().min(1),
  evidenceRefs: z.array(z.string().uuid()).optional(),
  claimRefs: z.array(z.string().uuid()).optional(),
});

export type UncertaintyConflict = z.infer<typeof uncertaintyConflictSchema>;

/** Structured uncertainty on a recommendation (SP-02-Q32). */
export const uncertaintySchema = z.object({
  missingData: z.array(z.string().min(1)),
  conflicts: z.array(uncertaintyConflictSchema),
  narrative: z.string().min(1).optional(),
});

export type Uncertainty = z.infer<typeof uncertaintySchema>;

export const inferenceSchema = z.object({
  statement: z.string().min(1),
  refIds: z.array(z.string().uuid()).min(1),
});

export type Inference = z.infer<typeof inferenceSchema>;

export const tradeoffSchema = z.object({
  topic: z.string().min(1),
  gain: z.string().min(1),
  loss: z.string().min(1),
});

export type Tradeoff = z.infer<typeof tradeoffSchema>;

export const rejectedAlternativeSchema = z.object({
  scenarioId: z.string().uuid(),
  strategyLabel: z.string().min(1),
  whyNotChosen: z.string().min(1),
});

export type RejectedAlternative = z.infer<typeof rejectedAlternativeSchema>;

export const validationStepOwnerSchema = z.enum(["user", "agent"]);

export type ValidationStepOwner = z.infer<typeof validationStepOwnerSchema>;

/** One material validation action (SP-08-Q29). */
export const nextValidationStepItemSchema = z.object({
  method: z.string().min(1),
  targetSegment: primarySegmentSchema.optional(),
  assumptionTested: z.string().uuid(),
  durationWeeks: z.number().positive(),
  estimatedCost: z.string().min(1),
  successCriterion: z.string().min(1),
  owner: validationStepOwnerSchema,
  failCriterion: z.string().min(1).optional(),
});

export type NextValidationStepItem = z.infer<
  typeof nextValidationStepItemSchema
>;

/** Published decision output with structured refs (SP-02-Q30). */
export const recommendationSchema = sessionScopedBaseSchema.extend({
  headline: z.string().min(1),
  chosenScenarioId: z.string().uuid(),
  evidenceRefs: z.array(z.string().uuid()),
  assumptionRefs: z.array(z.string().uuid()),
  inferences: z.array(inferenceSchema),
  uncertainty: uncertaintySchema,
  tradeoffs: z.array(tradeoffSchema),
  rejectedAlternatives: z.array(rejectedAlternativeSchema),
  nextValidationStep: z.array(nextValidationStepItemSchema).max(3),
  panelDisagreementSummary: z.string().min(1),
  runId: z.string().uuid(),
  status: recommendationStatusSchema,
  codeImpactRunId: z.string().uuid().optional(),
  latestPanelRunId: z.string().uuid().optional(),
  latestFinanceRunId: z.string().uuid().optional(),
  executiveSummary: z.string().min(1).optional(),
});

export type Recommendation = z.infer<typeof recommendationSchema>;

/** Links recommendation versions after new evidence (SP-02 §2.3, SP-09). */
export const revisionSchema = baseEntitySchema.extend({
  sessionId: z.string().uuid(),
  priorRecommendationId: z.string().uuid(),
  newRecommendationId: z.string().uuid(),
  reason: z.string().min(1),
  triggeringEvidenceIds: z.array(z.string().uuid()),
  contradictedClaimIds: z.array(z.string().uuid()).optional(),
  recommendationUnchanged: z.boolean().optional(),
});

export type Revision = z.infer<typeof revisionSchema>;
