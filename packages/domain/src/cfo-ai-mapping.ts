import { z } from "zod";

const canonicalMetricSchema = z.enum([
  "cost",
  "pricing",
  "revenue",
  "margin",
  "burn",
  "runway",
  "adoption",
]);

export const cfoAiMappingSchema = z.object({
  contractVersion: z.literal(1),
  orgId: z.string().min(1).optional(),
  mcpUrl: z.string().url(),
  setupStatus: z.enum(["ready", "deferred_per_tenant"]),
  setupNote: z.string().optional(),
  scenarios: z.record(
    z.object({
      strategyKind: z.enum(["pilot", "broad_launch"]),
      cfoScenarioName: z.string().min(1),
      cfoScenarioRef: z.string().min(1),
    }),
  ),
  compare: z.object({
    inspectTableBlocks: z.object({
      page: z.string().min(1),
      table: z.string().min(1),
      scenarios: z.array(z.string().min(1)).min(2),
    }),
  }),
  inputs: z.record(
    z.object({
      page: z.string().min(1),
      table: z.string().min(1),
      row: z.string().min(1),
      mapsToAssumption: z.string().min(1),
      perScenario: z.boolean().optional(),
      scenarioOnly: z.enum(["pilot"]).optional(),
    }),
  ),
  outputs: z.record(
    z.object({
      page: z.string().min(1),
      table: z.string().min(1),
      row: z.string().min(1),
      canonical: canonicalMetricSchema,
    }),
  ),
  sensitivity: z.object({
    applyToScenario: z.string().min(1),
    inputs: z.array(z.string().min(1)).min(1),
  }),
});

export type CfoAiMapping = z.infer<typeof cfoAiMappingSchema>;

export function loadCfoAiMappingFromJson(json: unknown): CfoAiMapping {
  return cfoAiMappingSchema.parse(json);
}
