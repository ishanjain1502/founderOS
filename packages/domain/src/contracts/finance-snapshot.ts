import { z } from "zod";
import { financialMappedMetricsSchema } from "./finance";

export const financeCheckSchema = z.object({
  code: z.string().min(1),
  severity: z.enum(["warn", "info"]),
  message: z.string().min(1),
});

export const financeBaselineSchema = z.object({
  cashUsd: z.number().optional(),
  mrrUsd: z.number().optional(),
  runwayMonthsUserInput: z.number().optional(),
  assumptionRefs: z.array(z.string().uuid()).default([]),
});

export const financeSensitivitySnippetSchema = z.object({
  onScenario: z.string().min(1),
  price: z.object({ low: z.number(), base: z.number(), high: z.number() }),
  adoption: z.object({ low: z.number(), base: z.number(), high: z.number() }),
  topDrivers: z.array(z.enum(["price", "adoption"])).max(2).optional(),
});

export const financeStateSchema = z.object({
  status: z.enum([
    "idle",
    "deferred",
    "complete",
    "incomplete",
    "fallback",
    "unavailable",
    "failed",
  ]),
  source: z.enum(["live", "fixture", "recorded"]).optional(),
  financeRunId: z.string().min(1).optional(),
  ranAt: z.string().datetime().optional(),
  mcpCallCount: z.number().int().nonnegative().optional(),
  mappingSetupStatus: z.string().optional(),
  financeAssumptionsApproved: z.boolean().optional(),
  assumptionPackHash: z.string().optional(),
  baseline: financeBaselineSchema.optional(),
  compare: z
    .object({
      pilot: financialMappedMetricsSchema,
      broad_launch: financialMappedMetricsSchema,
    })
    .optional(),
  sensitivity: financeSensitivitySnippetSchema.optional(),
  checks: z.array(financeCheckSchema).optional(),
  rawPayloadRef: z.string().min(1).optional(),
  error: z.string().max(500).optional(),
});

export type FinanceState = z.infer<typeof financeStateSchema>;
