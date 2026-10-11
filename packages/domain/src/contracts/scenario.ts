import { z } from "zod";
import { baseEntitySchema } from "./base";
import { strategyKindSchema } from "./enums";

const sessionScopedBaseSchema = baseEntitySchema.extend({
  sessionId: z.string().uuid(),
});

/**
 * Strategic option under evaluation (SP-02 §2.1, Q25).
 * Adoption and similar drivers reference Assumption claims via `assumptionRefs`.
 */
export const scenarioSchema = sessionScopedBaseSchema
  .extend({
    strategyKind: strategyKindSchema,
    scope: z.string().min(1),
    label: z.string().min(1),
    assumptionRefs: z.array(z.string().uuid()),
    /** Pilot / broad_launch paths require cfo.ai mapping (SP-07). */
    requiresFinance: z.boolean().default(false),
    latestPanelRunId: z.string().uuid().optional(),
    latestFinanceRunId: z.string().uuid().optional(),
  })
  .superRefine((scenario, ctx) => {
    if (scenario.requiresFinance && scenario.assumptionRefs.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Scenarios that require finance must reference at least one assumption",
        path: ["assumptionRefs"],
      });
    }
  });

export type Scenario = z.infer<typeof scenarioSchema>;
