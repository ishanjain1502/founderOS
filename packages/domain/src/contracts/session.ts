import { z } from "zod";
import { baseEntitySchema, CONTRACT_VERSION } from "./base";
import { featureChangeTypeSchema } from "./enums";
import { RunMode } from "../run-mode";

export const runModeSchema = z.nativeEnum(RunMode);

/** Persisted sandbox session (SP-02 §2.1, Appendix A). */
export const sessionSchema = baseEntitySchema.extend({
  mode: runModeSchema,
});

export type Session = z.infer<typeof sessionSchema>;

const sessionScopedBaseSchema = baseEntitySchema.extend({
  sessionId: z.string().uuid(),
});

/** Decision question under evaluation; not the recommendation (SP-02-Q03). */
export const decisionSchema = baseEntitySchema
  .omit({ id: true })
  .extend({
    decisionId: z.string().uuid(),
    sessionId: z.string().uuid(),
    questionText: z.string().min(1),
    questionRevision: z.number().int().min(1).default(1),
  });

export type Decision = z.infer<typeof decisionSchema>;

/** Company context attached to a session (SP-02 Appendix A). */
export const companyProfileSchema = sessionScopedBaseSchema.extend({
  name: z.string().min(1),
  productSummary: z.string().min(1),
  customerCount: z.number().int().nonnegative().optional(),
  cashUsd: z.number().nonnegative().optional(),
  mrrUsd: z.number().nonnegative().optional(),
  runwayMonths: z.number().nonnegative().optional(),
});

export type CompanyProfile = z.infer<typeof companyProfileSchema>;

/** Feature or packaging change under evaluation (SP-02 §4.5). */
export const featureProposalSchema = sessionScopedBaseSchema.extend({
  title: z.string().min(1).optional(),
  description: z.string().min(1),
  changeType: featureChangeTypeSchema,
});

export type FeatureProposal = z.infer<typeof featureProposalSchema>;

const sessionDraftDecisionSchema = z.object({
  questionText: z.string().min(1),
  questionRevision: z.number().int().min(1).optional(),
});

const sessionDraftCompanyProfileSchema = z.object({
  name: z.string().min(1).optional(),
  productSummary: z.string().min(1),
});

const sessionDraftFeatureProposalSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1),
  changeType: featureChangeTypeSchema,
});

/** In-memory intake shape before first persist (SP-02 §6). */
export const sessionDraftSchema = z.object({
  mode: runModeSchema,
  decision: sessionDraftDecisionSchema,
  companyProfile: sessionDraftCompanyProfileSchema,
  featureProposal: sessionDraftFeatureProposalSchema,
});

export type SessionDraft = z.infer<typeof sessionDraftSchema>;
