import { z } from "zod";
import { CONTRACT_VERSION } from "./base";
import { featureChangeTypeSchema, primarySegmentSchema } from "./enums";
import {
  sessionDraftAssumptionSchema,
  sessionDraftScenarioSchema,
} from "./session";
import { RunMode } from "../run-mode";

export const LAST_SESSION_COOKIE = "ceoSandboxLastSessionId";

export enum GoalChip {
  Revenue = "revenue",
  Retention = "retention",
  Expansion = "expansion",
  Enterprise = "enterprise",
  Efficiency = "efficiency",
  CompetitiveDefense = "competitive_defense",
  Other = "other",
}

export enum SizeBand {
  Smb = "smb",
  Mid = "mid",
  Enterprise = "enterprise",
}

export enum DecisionHorizon {
  ThisQuarter = "this_quarter",
  Months6 = "months_6",
  Months12 = "months_12",
  UntilRunway = "until_runway",
}

export enum FieldSource {
  User = "user",
  DemoFixture = "demo_fixture",
  SystemDefault = "system_default",
  ProvideLater = "provide_later",
}

export enum ScopeCheckStatus {
  Skipped = "skipped",
  Unknown = "unknown",
  InScope = "in_scope",
  OutOfScope = "out_of_scope",
}

export const SHORT_TEXT_MAX = 200;
export const QUESTION_MAX = 500;
export const PRODUCT_SUMMARY_MAX = 2000;
export const FEATURE_DESCRIPTION_MAX = 4000;
export const MARKET_BEHAVIOR_MAX = 4000;

const runModeSchema = z.nativeEnum(RunMode);
const goalChipSchema = z.nativeEnum(GoalChip);
const sizeBandSchema = z.nativeEnum(SizeBand);
const decisionHorizonSchema = z.nativeEnum(DecisionHorizon);
const fieldSourceSchema = z.nativeEnum(FieldSource);
const scopeCheckStatusSchema = z.nativeEnum(ScopeCheckStatus);

const shortTextSchema = z.string().min(1).max(SHORT_TEXT_MAX);
const optionalShortTextSchema = z.string().max(SHORT_TEXT_MAX).optional();

const scopeCheckSchema = z
  .object({
    status: scopeCheckStatusSchema,
    reason: z.string().optional(),
    ranAt: z.string().datetime().optional(),
  })
  .strict();

const decisionPartialSchema = z
  .object({
    questionText: z.string().min(1).max(QUESTION_MAX).optional(),
    questionRevision: z.number().int().min(1).optional(),
  })
  .strict();

const decisionCompleteSchema = z
  .object({
    questionText: z.string().min(1).max(QUESTION_MAX),
    questionRevision: z.number().int().min(1).optional(),
  })
  .strict();

const companyPartialSchema = z
  .object({
    name: shortTextSchema.optional(),
    productSummary: z.string().min(1).max(PRODUCT_SUMMARY_MAX).optional(),
    category: shortTextSchema.optional(),
    primaryBuyer: shortTextSchema.optional(),
    jobToBeDone: shortTextSchema.optional(),
    deliveryModel: z.literal("saas").optional(),
    sizeBand: sizeBandSchema.optional(),
    repoUrl: z.string().min(1).optional(),
    domain: optionalShortTextSchema,
    geography: optionalShortTextSchema,
    competitors: z.array(z.string().max(SHORT_TEXT_MAX)).max(10).optional(),
  })
  .strict();

const companyCompleteSchema = z
  .object({
    name: shortTextSchema,
    productSummary: z.string().min(1).max(PRODUCT_SUMMARY_MAX),
    category: shortTextSchema,
    primaryBuyer: shortTextSchema,
    jobToBeDone: shortTextSchema,
    deliveryModel: z.literal("saas"),
    sizeBand: sizeBandSchema,
    repoUrl: z.string().min(1).optional(),
    domain: optionalShortTextSchema,
    geography: optionalShortTextSchema,
    competitors: z.array(z.string().max(SHORT_TEXT_MAX)).max(10).optional(),
  })
  .strict();

const marketPartialSchema = z
  .object({
    targetMarketBehavior: z
      .string()
      .min(1)
      .max(MARKET_BEHAVIOR_MAX)
      .optional(),
    segmentChips: z.array(primarySegmentSchema).optional(),
  })
  .strict();

const marketCompleteSchema = z
  .object({
    targetMarketBehavior: z.string().min(1).max(MARKET_BEHAVIOR_MAX),
    segmentChips: z.array(primarySegmentSchema).optional(),
  })
  .strict();

const goalsSchema = z
  .object({
    chips: z.array(goalChipSchema).optional(),
    primaryChip: goalChipSchema.optional(),
    nuance: z.string().max(500).optional(),
    horizon: decisionHorizonSchema.optional(),
  })
  .strict();

const constraintsPartialSchema = z
  .object({
    budgetUsd: z.number().nonnegative().optional(),
    executionMonths: z.number().optional(),
    extraText: z.string().optional(),
    legalPrivacy: z.string().optional(),
    segmentRestrictions: z.string().optional(),
    pricingRules: z.string().optional(),
    hiringRaiseLimits: z.string().optional(),
    teamCapacityFte: z.number().nonnegative().optional(),
    teamSkillsNote: z.string().optional(),
  })
  .strict();

const constraintsCompleteSchema = z
  .object({
    budgetUsd: z.number().nonnegative(),
    executionMonths: z.number(),
    extraText: z.string().optional(),
    legalPrivacy: z.string().optional(),
    segmentRestrictions: z.string().optional(),
    pricingRules: z.string().optional(),
    hiringRaiseLimits: z.string().optional(),
    teamCapacityFte: z.number().nonnegative().optional(),
    teamSkillsNote: z.string().optional(),
  })
  .strict();

const proposedPricePeriodSchema = z.enum(["monthly", "annual", "one_time"]);

const featurePartialSchema = z
  .object({
    title: shortTextSchema.optional(),
    description: z.string().min(1).max(FEATURE_DESCRIPTION_MAX).optional(),
    changeType: featureChangeTypeSchema.optional(),
    packaging: z.string().optional(),
    proposedPriceUsd: z.number().nonnegative().optional(),
    proposedPricePeriod: proposedPricePeriodSchema.optional(),
    currentPricingText: z.string().optional(),
  })
  .strict();

const featureCompleteSchema = z
  .object({
    title: shortTextSchema.optional(),
    description: z.string().min(1).max(FEATURE_DESCRIPTION_MAX),
    changeType: featureChangeTypeSchema,
    packaging: z.string().optional(),
    proposedPriceUsd: z.number().nonnegative().optional(),
    proposedPricePeriod: proposedPricePeriodSchema.optional(),
    currentPricingText: z.string().optional(),
  })
  .strict();

const financialsPartialSchema = z
  .object({
    provideLater: z.boolean().optional(),
    cashUsd: z.number().optional(),
    customerCount: z.number().int().nonnegative().optional(),
    mrrUsd: z.number().nonnegative().optional(),
    runwayMonths: z.number().nonnegative().optional(),
  })
  .strict();

const financialsCompleteSchema = z
  .object({
    provideLater: z.boolean(),
    cashUsd: z.number().optional(),
    customerCount: z.number().int().nonnegative().optional(),
    mrrUsd: z.number().nonnegative().optional(),
    runwayMonths: z.number().nonnegative().optional(),
  })
  .strict();

function refinePrimaryChipInChips(
  goals: { chips?: GoalChip[]; primaryChip?: GoalChip } | undefined,
  ctx: z.RefinementCtx,
): void {
  if (!goals?.primaryChip) {
    return;
  }
  const chips = goals.chips ?? [];
  if (!chips.includes(goals.primaryChip)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "primaryChip must be included in chips",
      path: ["goals", "primaryChip"],
    });
  }
}

function refineFinancialRule(
  financials: { provideLater?: boolean } | undefined,
  ctx: z.RefinementCtx,
  pathPrefix: (string | number)[] = ["financials"],
): void {
  if (!financials) {
    return;
  }
  const provideLater = financials.provideLater === true;
  if (!provideLater && financialMetricCount(financials) < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Provide at least two financial metrics or set provideLater to true",
      path: pathPrefix,
    });
  }
}

export const intakeDraftPartialSchema = z
  .object({
    contractVersion: z.literal(CONTRACT_VERSION),
    mode: runModeSchema,
    currency: z.literal("USD"),
    outsideSpecIntent: z.boolean().optional(),
    alreadyLive: z.boolean().optional(),
    scopeCheck: scopeCheckSchema.optional(),
    decision: decisionPartialSchema.optional(),
    company: companyPartialSchema.optional(),
    market: marketPartialSchema.optional(),
    goals: goalsSchema.optional(),
    constraints: constraintsPartialSchema.optional(),
    feature: featurePartialSchema.optional(),
    financials: financialsPartialSchema.optional(),
    fieldSources: z.record(z.string(), fieldSourceSchema).optional(),
    scenarios: z.array(sessionDraftScenarioSchema).optional(),
    assumptions: z.array(sessionDraftAssumptionSchema).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    refinePrimaryChipInChips(data.goals, ctx);
  });

export const intakeDraftSchema = z
  .object({
    contractVersion: z.literal(CONTRACT_VERSION),
    mode: runModeSchema,
    currency: z.literal("USD"),
    outsideSpecIntent: z.boolean().optional(),
    alreadyLive: z.boolean().optional(),
    scopeCheck: scopeCheckSchema.optional(),
    decision: decisionCompleteSchema,
    company: companyCompleteSchema,
    market: marketCompleteSchema,
    goals: goalsSchema.optional(),
    constraints: constraintsCompleteSchema,
    feature: featureCompleteSchema,
    financials: financialsCompleteSchema,
    fieldSources: z.record(z.string(), fieldSourceSchema).optional(),
    scenarios: z.array(sessionDraftScenarioSchema).optional(),
    assumptions: z.array(sessionDraftAssumptionSchema).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    refinePrimaryChipInChips(data.goals, ctx);
    refineFinancialRule(data.financials, ctx);
  });

export type IntakeDraftPartial = z.infer<typeof intakeDraftPartialSchema>;
export type IntakeDraft = z.infer<typeof intakeDraftSchema>;

export function emptyIntakeDraft(mode: RunMode): IntakeDraftPartial {
  const scopeStatus =
    mode === RunMode.Demo
      ? ScopeCheckStatus.Skipped
      : ScopeCheckStatus.Unknown;

  return {
    contractVersion: CONTRACT_VERSION,
    mode,
    currency: "USD",
    outsideSpecIntent: false,
    alreadyLive: false,
    scopeCheck: { status: scopeStatus },
    company: { deliveryModel: "saas" },
    financials: { provideLater: false },
    scenarios: [],
    assumptions: [],
    fieldSources: {
      currency: FieldSource.SystemDefault,
      "company.deliveryModel": FieldSource.SystemDefault,
    },
  };
}

export function financialMetricCount(
  financials:
    | {
        cashUsd?: number;
        customerCount?: number;
        mrrUsd?: number;
        runwayMonths?: number;
      }
    | undefined,
): number {
  if (!financials) {
    return 0;
  }
  const keys = [
    "cashUsd",
    "customerCount",
    "mrrUsd",
    "runwayMonths",
  ] as const;
  return keys.filter((key) => typeof financials[key] === "number").length;
}

function isNonEmptyTrimmed(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidRepoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validateFinancialsStep(
  financials: IntakeDraftPartial["financials"],
  errors: Record<string, string>,
): void {
  const provideLater = financials?.provideLater === true;
  if (!provideLater && financialMetricCount(financials) < 2) {
    errors["financials"] =
      "Provide at least two financial metrics or set provideLater to true";
  }

  if (
    financials?.customerCount !== undefined &&
    (!Number.isInteger(financials.customerCount) ||
      financials.customerCount < 0)
  ) {
    errors["financials.customerCount"] =
      "customerCount must be a non-negative integer";
  }

  if (financials?.mrrUsd !== undefined && financials.mrrUsd < 0) {
    errors["financials.mrrUsd"] = "mrrUsd must be zero or greater";
  }

  if (financials?.runwayMonths !== undefined && financials.runwayMonths < 0) {
    errors["financials.runwayMonths"] = "runwayMonths must be zero or greater";
  }
}

export function validateIntakeStep(
  step: 1 | 2 | 3 | 4 | 5,
  draft: IntakeDraftPartial,
): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (step === 1) {
    const company = draft.company;
    if (!isNonEmptyTrimmed(company?.name)) {
      errors["company.name"] = "Company name is required";
    }
    if (!isNonEmptyTrimmed(company?.productSummary)) {
      errors["company.productSummary"] = "Product summary is required";
    }
    if (!isNonEmptyTrimmed(company?.category)) {
      errors["company.category"] = "Category is required";
    }
    if (!isNonEmptyTrimmed(company?.primaryBuyer)) {
      errors["company.primaryBuyer"] = "Primary buyer is required";
    }
    if (!isNonEmptyTrimmed(company?.jobToBeDone)) {
      errors["company.jobToBeDone"] = "Job to be done is required";
    }
    if (!isNonEmptyTrimmed(company?.deliveryModel)) {
      errors["company.deliveryModel"] = "Delivery model is required";
    }
    if (!company?.sizeBand) {
      errors["company.sizeBand"] = "Size band is required";
    }
    if (
      company?.repoUrl !== undefined &&
      company.repoUrl !== "" &&
      !isValidRepoUrl(company.repoUrl)
    ) {
      errors["company.repoUrl"] = "repoUrl must be an http or https URL";
    }
  }

  if (step === 2) {
    if (!isNonEmptyTrimmed(draft.market?.targetMarketBehavior)) {
      errors["market.targetMarketBehavior"] =
        "Target market behavior is required";
    }
  }

  if (step === 3) {
    const constraints = draft.constraints;
    if (
      typeof constraints?.budgetUsd !== "number" ||
      constraints.budgetUsd < 0
    ) {
      errors["constraints.budgetUsd"] =
        "Budget must be a number zero or greater";
    }
    if (
      typeof constraints?.executionMonths !== "number" ||
      constraints.executionMonths <= 0
    ) {
      errors["constraints.executionMonths"] =
        "Execution months must be greater than zero";
    }
  }

  if (step === 4) {
    if (!isNonEmptyTrimmed(draft.feature?.description)) {
      errors["feature.description"] = "Feature description is required";
    }
    if (!draft.feature?.changeType) {
      errors["feature.changeType"] = "Change type is required";
    }
    if (!isNonEmptyTrimmed(draft.decision?.questionText)) {
      errors["decision.questionText"] = "Decision question is required";
    }
  }

  if (step === 5) {
    validateFinancialsStep(draft.financials, errors);
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

function intakeDraftWithDefaults(draft: IntakeDraftPartial): unknown {
  return {
    ...draft,
    outsideSpecIntent: draft.outsideSpecIntent ?? false,
    alreadyLive: draft.alreadyLive ?? false,
    scopeCheck: draft.scopeCheck ?? { status: ScopeCheckStatus.Unknown },
    financials: {
      provideLater: draft.financials?.provideLater ?? false,
      ...draft.financials,
    },
    fieldSources: draft.fieldSources ?? {},
    scenarios: draft.scenarios ?? [],
    assumptions: draft.assumptions ?? [],
  };
}

export function isIntakeComplete(draft: IntakeDraftPartial): {
  ok: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  for (let step = 1; step <= 5; step += 1) {
    const result = validateIntakeStep(step as 1 | 2 | 3 | 4 | 5, draft);
    if (!result.ok) {
      Object.assign(errors, result.errors);
    }
  }

  const parsed = intakeDraftSchema.safeParse(intakeDraftWithDefaults(draft));
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (!errors[path]) {
        errors[path] = issue.message;
      }
    }
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function intakeWarnings(
  draft: IntakeDraftPartial,
): { path: string; message: string }[] {
  const warnings: { path: string; message: string }[] = [];

  if (
    draft.financials?.cashUsd !== undefined &&
    draft.financials.cashUsd < 0
  ) {
    warnings.push({
      path: "financials.cashUsd",
      message: "Cash is negative; confirm this reflects your books",
    });
  }

  if (draft.financials?.customerCount === 0) {
    warnings.push({
      path: "financials.customerCount",
      message: "Customer count is zero",
    });
  }

  if (draft.financials?.provideLater === true) {
    warnings.push({
      path: "financials.provideLater",
      message: "Financial metrics will be provided later",
    });
  }

  if (draft.alreadyLive === true) {
    warnings.push({
      path: "alreadyLive",
      message: "Feature is marked as already live",
    });
  }

  if (draft.outsideSpecIntent === true) {
    warnings.push({
      path: "outsideSpecIntent",
      message: "Decision may be outside the sandbox scope",
    });
  }

  const scopeStatus = draft.scopeCheck?.status;
  if (
    scopeStatus === ScopeCheckStatus.Unknown ||
    scopeStatus === ScopeCheckStatus.OutOfScope
  ) {
    warnings.push({
      path: "scopeCheck",
      message: "Scope check is unknown or out of scope",
    });
  }

  return warnings;
}

const ARRAY_REPLACE_PATHS = new Set([
  "company.competitors",
  "market.segmentChips",
  "goals.chips",
  "scenarios",
  "assumptions",
]);

const FIELD_SOURCE_EXCLUDED = new Set([
  "scopeCheck",
  "currency",
  "company.deliveryModel",
]);

function collectPatchPaths(
  value: unknown,
  prefix: string,
  paths: string[],
): void {
  if (value === undefined) {
    return;
  }
  if (Array.isArray(value)) {
    if (prefix) {
      paths.push(prefix);
    }
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (nested !== undefined) {
        if (
          nested !== null &&
          typeof nested === "object" &&
          !Array.isArray(nested)
        ) {
          collectPatchPaths(nested, path, paths);
        } else {
          paths.push(path);
        }
      }
    }
    return;
  }
  if (prefix) {
    paths.push(prefix);
  }
}

function mergePlainObjects(
  base: Record<string, unknown> | undefined,
  patch: Record<string, unknown>,
  arrayKeys: string[],
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...(base ?? {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      continue;
    }
    if (arrayKeys.includes(key) && Array.isArray(value)) {
      merged[key] = [...value];
    } else if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      merged[key] !== null &&
      typeof merged[key] === "object" &&
      !Array.isArray(merged[key])
    ) {
      merged[key] = mergePlainObjects(
        merged[key] as Record<string, unknown>,
        value as Record<string, unknown>,
        [],
      );
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

export function deepMergeIntake(
  base: IntakeDraftPartial,
  patch: Record<string, unknown>,
): IntakeDraftPartial {
  const result: IntakeDraftPartial = {
    ...base,
    company: base.company ? { ...base.company } : undefined,
    market: base.market ? { ...base.market } : undefined,
    goals: base.goals ? { ...base.goals } : undefined,
    constraints: base.constraints ? { ...base.constraints } : undefined,
    feature: base.feature ? { ...base.feature } : undefined,
    decision: base.decision ? { ...base.decision } : undefined,
    financials: base.financials ? { ...base.financials } : undefined,
    scopeCheck: base.scopeCheck ? { ...base.scopeCheck } : undefined,
    fieldSources: { ...(base.fieldSources ?? {}) },
    scenarios: base.scenarios ? [...base.scenarios] : undefined,
    assumptions: base.assumptions ? [...base.assumptions] : undefined,
  };

  if ("scopeCheck" in patch) {
    result.scopeCheck = mergePlainObjects(
      result.scopeCheck as Record<string, unknown> | undefined,
      patch.scopeCheck as Record<string, unknown>,
      [],
    ) as IntakeDraftPartial["scopeCheck"];
  }

  if ("company" in patch && patch.company) {
    result.company = mergePlainObjects(
      result.company as Record<string, unknown> | undefined,
      patch.company as Record<string, unknown>,
      ["competitors"],
    ) as IntakeDraftPartial["company"];
  }

  if ("market" in patch && patch.market) {
    result.market = mergePlainObjects(
      result.market as Record<string, unknown> | undefined,
      patch.market as Record<string, unknown>,
      ["segmentChips"],
    ) as IntakeDraftPartial["market"];
  }

  if ("goals" in patch && patch.goals) {
    result.goals = mergePlainObjects(
      result.goals as Record<string, unknown> | undefined,
      patch.goals as Record<string, unknown>,
      ["chips"],
    ) as IntakeDraftPartial["goals"];
  }

  if ("constraints" in patch && patch.constraints) {
    result.constraints = mergePlainObjects(
      result.constraints as Record<string, unknown> | undefined,
      patch.constraints as Record<string, unknown>,
      [],
    ) as IntakeDraftPartial["constraints"];
  }

  if ("feature" in patch && patch.feature) {
    result.feature = mergePlainObjects(
      result.feature as Record<string, unknown> | undefined,
      patch.feature as Record<string, unknown>,
      [],
    ) as IntakeDraftPartial["feature"];
  }

  if ("decision" in patch && patch.decision) {
    result.decision = mergePlainObjects(
      result.decision as Record<string, unknown> | undefined,
      patch.decision as Record<string, unknown>,
      [],
    ) as IntakeDraftPartial["decision"];
  }

  if ("financials" in patch && patch.financials) {
    result.financials = mergePlainObjects(
      result.financials as Record<string, unknown> | undefined,
      patch.financials as Record<string, unknown>,
      [],
    ) as IntakeDraftPartial["financials"];
  }

  if ("scenarios" in patch && Array.isArray(patch.scenarios)) {
    result.scenarios = [...(patch.scenarios as IntakeDraftPartial["scenarios"])];
  }

  if ("assumptions" in patch && Array.isArray(patch.assumptions)) {
    result.assumptions = [
      ...(patch.assumptions as IntakeDraftPartial["assumptions"]),
    ];
  }

  if ("outsideSpecIntent" in patch) {
    result.outsideSpecIntent = patch.outsideSpecIntent as boolean;
  }
  if ("alreadyLive" in patch) {
    result.alreadyLive = patch.alreadyLive as boolean;
  }
  if ("mode" in patch) {
    result.mode = patch.mode as RunMode;
  }

  const patchPaths: string[] = [];
  collectPatchPaths(patch, "", patchPaths);

  for (const path of patchPaths) {
    if (FIELD_SOURCE_EXCLUDED.has(path)) {
      continue;
    }
    if (ARRAY_REPLACE_PATHS.has(path)) {
      result.fieldSources![path] = FieldSource.User;
      continue;
    }
    result.fieldSources![path] = FieldSource.User;
  }

  return result;
}
