import { z } from "zod";
import { claimSchema } from "./claim";
import { evidenceSchema } from "./evidence";
import { financialRunResultSchema } from "./finance";
import {
  archetypeSchema,
  panelRunSchema,
  respondentEvaluationSchema,
  segmentAggregateSchema,
} from "./panel-run";
import { panelStimulusSchema } from "./panel";
import {
  codeImpactArtifactSchema,
  recommendationSchema,
  revisionSchema,
} from "./recommendation";
import { runSchema } from "./run";
import { scenarioSchema } from "./scenario";
import {
  companyProfileSchema,
  decisionSchema,
  featureProposalSchema,
  sessionSchema,
} from "./session";

/** Persisted session export shape for SQLite JSON rows / replay bundles (SP-02 §6, SP-09). */
export const sessionBundleSchema = z.object({
  session: sessionSchema,
  decision: decisionSchema,
  companyProfile: companyProfileSchema,
  featureProposal: featureProposalSchema,
  panelStimulus: z.array(panelStimulusSchema).default([]),
  archetypes: z.array(archetypeSchema).default([]),
  scenarios: z.array(scenarioSchema).default([]),
  evidence: z.array(evidenceSchema).default([]),
  claims: z.array(claimSchema).default([]),
  runs: z.array(runSchema).default([]),
  codeImpactArtifacts: z.array(codeImpactArtifactSchema).default([]),
  panelRuns: z.array(panelRunSchema).default([]),
  respondentEvaluations: z.array(respondentEvaluationSchema).default([]),
  segmentAggregates: z.array(segmentAggregateSchema).default([]),
  financialRunResults: z.array(financialRunResultSchema).default([]),
  recommendations: z.array(recommendationSchema).default([]),
  revisions: z.array(revisionSchema).default([]),
});

export type SessionBundle = z.infer<typeof sessionBundleSchema>;

export function validateSessionBundle(json: unknown) {
  return sessionBundleSchema.safeParse(json);
}
