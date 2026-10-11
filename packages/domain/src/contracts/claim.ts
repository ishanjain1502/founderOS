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

export enum ClaimOwner {
  User = "user",
  Agent = "agent",
  System = "system",
  DemoFixture = "demo_fixture",
}

export enum ClaimStatus {
  Active = "active",
  Contradicted = "contradicted",
  Superseded = "superseded",
}

export const claimOwnerSchema = z.nativeEnum(ClaimOwner);
export const claimStatusSchema = z.nativeEnum(ClaimStatus);

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

const numericRangeSchema = z
  .object({
    min: z.number(),
    max: z.number(),
    unit: z.enum(["percent", "money"]),
  })
  .refine((r) => r.min <= r.max, { message: "numericRange min must be <= max" });

const claimCommonFields = {
  sessionId: z.string().uuid(),
  statement: z.string().min(1),
  locked: z.boolean().optional(),
  rationaleTag: claimRationaleTagSchema.optional(),
  owner: claimOwnerSchema,
  status: claimStatusSchema,
  contradictingEvidenceId: z.string().uuid().optional(),
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
  mapsTo: z.string().min(1).optional(),
  numericRange: numericRangeSchema.optional(),
});

const unknownClaimSchema = baseEntitySchema.extend({
  ...claimCommonFields,
  kind: z.literal(ClaimKind.Unknown),
});

const claimSchemaBase = z.discriminatedUnion("kind", [
  hypothesisClaimSchema,
  assumptionClaimSchema,
  unknownClaimSchema,
]);

export const claimSchema = claimSchemaBase.superRefine((data, ctx) => {
  if (data.status === ClaimStatus.Contradicted && !data.contradictingEvidenceId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "contradictingEvidenceId is required when status is contradicted",
      path: ["contradictingEvidenceId"],
    });
  }
  if (
    data.kind === ClaimKind.Assumption &&
    data.numericRange &&
    data.numeric &&
    data.numericRange.unit !== data.numeric.unit
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "numericRange.unit must match numeric.unit when both are present",
      path: ["numericRange", "unit"],
    });
  }
});

export type AssumptionNumeric = z.infer<typeof assumptionNumericSchema>;
export type Claim = z.infer<typeof claimSchema>;

export function mayAgentMutate(claim: {
  owner: ClaimOwner;
  locked?: boolean;
}): boolean {
  if (claim.locked) return false;
  if (claim.owner === ClaimOwner.User) return false;
  if (claim.owner === ClaimOwner.DemoFixture) return false;
  return claim.owner === ClaimOwner.Agent;
}

export function claimsConflict(
  a: { kind: string; mapsTo?: string; numeric?: { unit: string; value: number } },
  b: { kind: string; mapsTo?: string; numeric?: { unit: string; value: number } },
): boolean {
  if (a.kind !== "assumption" || b.kind !== "assumption") return false;
  if (!a.mapsTo || a.mapsTo !== b.mapsTo) return false;
  if (!a.numeric || !b.numeric) return false;
  return a.numeric.unit === b.numeric.unit && a.numeric.value !== b.numeric.value;
}

export function contradictionPredicate(
  _claim: { status: ClaimStatus },
  evidence: { summary: string },
): { suggest: boolean; operatorMustConfirm: true } {
  return {
    suggest: evidence.summary.trim().length > 0,
    operatorMustConfirm: true,
  };
}
