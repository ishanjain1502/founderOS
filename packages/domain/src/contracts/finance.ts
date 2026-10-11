import { z } from "zod";
import { EpistemicKind } from "../epistemic";

/**
 * One canonical finance metric from cfo.ai mapping (SP-02 Q29).
 * When the vendor omits a field, `provided` is false and `value` is absent.
 */
export const mappedFinanceMetricSchema = z
  .object({
    provided: z.boolean(),
    value: z.number().optional(),
  })
  .superRefine((metric, ctx) => {
    if (metric.provided && metric.value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "provided metrics require a numeric value",
        path: ["value"],
      });
    }
    if (!metric.provided && metric.value !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "omit value when provided is false",
        path: ["value"],
      });
    }
  });

export type MappedFinanceMetric = z.infer<typeof mappedFinanceMetricSchema>;

/** SP-02 Q29 concepts — all required keys, values nullable via `provided`. */
export const financialMappedMetricsSchema = z.object({
  cost: mappedFinanceMetricSchema,
  pricing: mappedFinanceMetricSchema,
  revenue: mappedFinanceMetricSchema,
  margin: mappedFinanceMetricSchema,
  burn: mappedFinanceMetricSchema,
  runway: mappedFinanceMetricSchema,
  adoption: mappedFinanceMetricSchema,
});

export type FinancialMappedMetrics = z.infer<typeof financialMappedMetricsSchema>;

const notProvided = { provided: false } as const;

/** Canonical mapped metrics with every Q29 slot present and unprovided. */
export function emptyFinancialMappedMetrics(): FinancialMappedMetrics {
  return {
    cost: notProvided,
    pricing: notProvided,
    revenue: notProvided,
    margin: notProvided,
    burn: notProvided,
    runway: notProvided,
    adoption: notProvided,
  };
}

/**
 * Mapped cfo.ai output for one scenario (SP-02 §2.5, Q28–Q29).
 * Stored as EpistemicKind.Inferred with mandatory assumption refs (§1).
 */
export const financialRunResultSchema = z.object({
  financeRunId: z.string().min(1),
  scenarioId: z.string().uuid(),
  rawPayloadRef: z.string().min(1),
  epistemicLabel: z.literal(EpistemicKind.Inferred),
  assumptionRefs: z.array(z.string().uuid()).min(1),
  sourceRefs: z.array(z.string().uuid()).optional(),
  mapped: financialMappedMetricsSchema,
});

export type FinancialRunResult = z.infer<typeof financialRunResultSchema>;
