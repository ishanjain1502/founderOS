import { z } from "zod";
import { baseEntitySchema } from "./base";
import { runStatusSchema } from "./enums";

/** Agent run classification (SP-02 §2.6, SP-10). */
export const runKindSchema = z.enum(["standard", "fallback", "revision"]);

export type RunKind = z.infer<typeof runKindSchema>;

export const runMissingDataSchema = z.object({
  codeImpact: z.boolean().optional(),
});

export type RunMissingData = z.infer<typeof runMissingDataSchema>;

const sessionScopedBaseSchema = baseEntitySchema.extend({
  sessionId: z.string().uuid(),
});

/** Agent execution record for an investigation (SP-02 §2.6). */
export const runSchema = sessionScopedBaseSchema
  .extend({
    status: runStatusSchema,
    startedAt: z.string().datetime(),
    runKind: runKindSchema.default("standard"),
    neatlogsTraceId: z.string().min(1).optional(),
    codeImpactRunId: z.string().uuid().optional(),
    missingData: runMissingDataSchema.optional(),
    parentRunId: z.string().uuid().optional(),
  })
  .superRefine((run, ctx) => {
    if (run.runKind !== "fallback" && !run.neatlogsTraceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "neatlogsTraceId is required unless runKind is fallback",
        path: ["neatlogsTraceId"],
      });
    }
  });

export type Run = z.infer<typeof runSchema>;
