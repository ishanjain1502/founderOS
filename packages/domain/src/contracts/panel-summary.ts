import { z } from "zod";
import {
  panelPrimaryChoiceSchema,
  primarySegmentSchema,
} from "./enums";

const panelChoiceCountsSchema = z.record(
  panelPrimaryChoiceSchema,
  z.number().int().nonnegative(),
);

const panelChoiceRatesPercentSchema = z.record(
  panelPrimaryChoiceSchema,
  z.number(),
);

const panelOverallSchema = z.object({
  n: z.number().int().nonnegative(),
  choiceCounts: panelChoiceCountsSchema,
  choiceRatesPercent: panelChoiceRatesPercentSchema,
  meanConfidence: z.number(),
});

export const panelSummarySegmentSchema = z.object({
  primarySegment: primarySegmentSchema,
  n: z.number().int().nonnegative(),
  lowN: z.boolean(),
  choiceCounts: panelChoiceCountsSchema,
  choiceRatesPercent: panelChoiceRatesPercentSchema,
  meanConfidence: z.number(),
  topObjections: z.array(z.string()),
});

export const panelPolarizedPairSchema = z.object({
  choice: panelPrimaryChoiceSchema,
  left: primarySegmentSchema,
  right: primarySegmentSchema,
  leftObjection: z.string().nullable(),
  rightObjection: z.string().nullable(),
});

const panelPriceShownSchema = z
  .object({
    usd: z.number(),
    period: z.string(),
  })
  .nullable();

export const panelSummarySchema = z.object({
  status: z.enum([
    "complete",
    "incomplete",
    "failed",
    "fallback",
    "unavailable",
  ]),
  source: z.enum(["live", "fixture"]),
  panelRunId: z.string().uuid(),
  panelSeed: z.string(),
  modelId: z.string().min(1),
  questionnaireVersion: z.literal(1),
  nRequested: z.number().int().nonnegative(),
  nCompleted: z.number().int().nonnegative(),
  evaluationAttempts: z.number().int().nonnegative(),
  stopReason: z.enum(["none", "cost", "clock"]),
  lowDisagreement: z.boolean(),
  priceShown: panelPriceShownSchema,
  packaging: z.string().nullable(),
  currentUserCount: z.number().int().nonnegative(),
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  estimatedUsd: z.number().nonnegative(),
  segments: z.array(panelSummarySegmentSchema),
  noSimulatedRespondents: z.array(primarySegmentSchema),
  overall: panelOverallSchema,
  disagreement: z.boolean(),
  strongestSegment: z
    .object({
      primarySegment: primarySegmentSchema,
      positiveRate: z.number(),
    })
    .optional(),
  polarizedPairs: z.array(panelPolarizedPairSchema),
  rerunCount: z.number().int().nonnegative(),
});

export type PanelSummary = z.infer<typeof panelSummarySchema>;
