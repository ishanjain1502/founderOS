import { z } from "zod";
import { baseEntitySchema } from "./base";
import { ClaimKind } from "./enums";

/** Hypothesis resolution from linked evidence (SP-02 §3, Q15). */
export enum ClaimResolution {
  Open = "open",
  Supported = "supported",
  Refuted = "refuted",
}

export const claimResolutionSchema = z.nativeEnum(ClaimResolution);

/** Why an assumption exists (SP-02 §3 rationale tags). */
export enum ClaimRationaleTag {
  UserProvided = "user_provided",
  MissingEvidence = "missing_evidence",
  DemoFixture = "demo_fixture",
  SystemDefault = "system_default",
  AgentGapFill = "agent_gap_fill",
  Reconciliation = "reconciliation",
}

export const claimRationaleTagSchema = z.nativeEnum(ClaimRationaleTag);

const percentAssumptionNumericSchema = z.object({
  unit: z.literal("percent"),
  value: z.number().min(0).max(100),
});

const moneyAssumptionNumericSchema = z.object({
  unit: z.literal("money"),
  value: z.number(),
  currency: z.string().min(1),
  period: z.string().min(1),
});

/** Assumption value with explicit unit; percentages use 0–100 scale (SP-02 Q40). */
export const assumptionNumericSchema = z.discriminatedUnion("unit", [
  percentAssumptionNumericSchema,
  moneyAssumptionNumericSchema,
]);

const claimCommonFields = {
  sessionId: z.string().uuid(),
  statement: z.string().min(1),
  locked: z.boolean().optional(),
  rationaleTag: claimRationaleTagSchema.optional(),
};

const hypothesisClaimSchema = baseEntitySchema.extend({
  ...claimCommonFields,
  kind: z.literal(ClaimKind.Hypothesis),
  resolution: claimResolutionSchema.default(ClaimResolution.Open),
});

const assumptionClaimSchema = baseEntitySchema.extend({
  ...claimCommonFields,
  kind: z.literal(ClaimKind.Assumption),
  numeric: assumptionNumericSchema.optional(),
});

const unknownClaimSchema = baseEntitySchema.extend({
  ...claimCommonFields,
  kind: z.literal(ClaimKind.Unknown),
});

export const claimSchema = z.discriminatedUnion("kind", [
  hypothesisClaimSchema,
  assumptionClaimSchema,
  unknownClaimSchema,
]);

export type AssumptionNumeric = z.infer<typeof assumptionNumericSchema>;
export type Claim = z.infer<typeof claimSchema>;
