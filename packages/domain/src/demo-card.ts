export interface DemoCompany {
  name: string;
  productSummary: string;
  customerCount: number;
  cashUsd: number;
  mrrUsd: number;
  runwayMonths: number;
}

export interface DemoFeature {
  title: string;
  description: string;
  packaging: string;
}

export interface DemoConstraints {
  budgetUsd: number;
  executionMonths: number;
  notes: string;
}

export interface DemoScenarioAssumptions {
  build_cost_usd: number;
  build_timeline_months: number;
  price_per_seat_usd: number;
  adoption_rate_percent: number;
  inference_cost_per_user_usd: number;
  pilot_cohort_size?: number;
}

export interface DemoQuantitativeScenario {
  strategyKind: string;
  label: string;
  scope: string;
  targetSegment?: string;
  pilotDurationWeeks?: number;
  successCriterion?: string;
  failCriterion?: string;
  assumptions: DemoScenarioAssumptions;
}

export interface DemoQualitativeScenario {
  strategyKind: string;
  label: string;
  scope: string;
}

export interface DemoDecisionCard {
  id: string;
  label: string;
  illustrative: boolean;
  decisionQuestion: string;
  company: DemoCompany;
  feature: DemoFeature;
  goals: string[];
  constraints: DemoConstraints;
  targetMarketBehavior: string;
  panelSeed: number;
  crustdataSearchHint: string;
  scenarios: Record<string, DemoQuantitativeScenario>;
  qualitativeScenarios: Record<string, DemoQualitativeScenario>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireField(
  obj: Record<string, unknown>,
  key: string,
  path = key,
): unknown {
  if (!(key in obj)) {
    throw new Error(`Missing required field: ${path}`);
  }
  return obj[key];
}

function requireString(
  obj: Record<string, unknown>,
  key: string,
  path = key,
): string {
  const value = requireField(obj, key, path);
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid or empty string for ${path}`);
  }
  return value;
}

function requireBoolean(
  obj: Record<string, unknown>,
  key: string,
  path = key,
): boolean {
  const value = requireField(obj, key, path);
  if (typeof value !== "boolean") {
    throw new Error(`Invalid boolean for ${path}`);
  }
  return value;
}

function requireNumber(
  obj: Record<string, unknown>,
  key: string,
  path = key,
): number {
  const value = requireField(obj, key, path);
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Invalid number for ${path}`);
  }
  return value;
}

function requireStringArray(
  obj: Record<string, unknown>,
  key: string,
  path = key,
): string[] {
  const value = requireField(obj, key, path);
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Invalid string array for ${path}`);
  }
  return value;
}

function parseCompany(raw: unknown): DemoCompany {
  if (!isRecord(raw)) {
    throw new Error("Invalid company");
  }
  return {
    name: requireString(raw, "name", "company.name"),
    productSummary: requireString(raw, "productSummary", "company.productSummary"),
    customerCount: requireNumber(raw, "customerCount", "company.customerCount"),
    cashUsd: requireNumber(raw, "cashUsd", "company.cashUsd"),
    mrrUsd: requireNumber(raw, "mrrUsd", "company.mrrUsd"),
    runwayMonths: requireNumber(raw, "runwayMonths", "company.runwayMonths"),
  };
}

function parseFeature(raw: unknown): DemoFeature {
  if (!isRecord(raw)) {
    throw new Error("Invalid feature");
  }
  return {
    title: requireString(raw, "title", "feature.title"),
    description: requireString(raw, "description", "feature.description"),
    packaging: requireString(raw, "packaging", "feature.packaging"),
  };
}

function parseConstraints(raw: unknown): DemoConstraints {
  if (!isRecord(raw)) {
    throw new Error("Invalid constraints");
  }
  return {
    budgetUsd: requireNumber(raw, "budgetUsd", "constraints.budgetUsd"),
    executionMonths: requireNumber(
      raw,
      "executionMonths",
      "constraints.executionMonths",
    ),
    notes: requireString(raw, "notes", "constraints.notes"),
  };
}

function parseAssumptions(raw: unknown): DemoScenarioAssumptions {
  if (!isRecord(raw)) {
    throw new Error("Invalid scenario assumptions");
  }
  const assumptions: DemoScenarioAssumptions = {
    build_cost_usd: requireNumber(
      raw,
      "build_cost_usd",
      "assumptions.build_cost_usd",
    ),
    build_timeline_months: requireNumber(
      raw,
      "build_timeline_months",
      "assumptions.build_timeline_months",
    ),
    price_per_seat_usd: requireNumber(
      raw,
      "price_per_seat_usd",
      "assumptions.price_per_seat_usd",
    ),
    adoption_rate_percent: requireNumber(
      raw,
      "adoption_rate_percent",
      "assumptions.adoption_rate_percent",
    ),
    inference_cost_per_user_usd: requireNumber(
      raw,
      "inference_cost_per_user_usd",
      "assumptions.inference_cost_per_user_usd",
    ),
  };
  if ("pilot_cohort_size" in raw) {
    assumptions.pilot_cohort_size = requireNumber(
      raw,
      "pilot_cohort_size",
      "assumptions.pilot_cohort_size",
    );
  }
  return assumptions;
}

function parseQuantitativeScenario(raw: unknown): DemoQuantitativeScenario {
  if (!isRecord(raw)) {
    throw new Error("Invalid quantitative scenario");
  }
  const scenario: DemoQuantitativeScenario = {
    strategyKind: requireString(raw, "strategyKind"),
    label: requireString(raw, "label"),
    scope: requireString(raw, "scope"),
    assumptions: parseAssumptions(requireField(raw, "assumptions", "assumptions")),
  };
  if ("targetSegment" in raw) {
    scenario.targetSegment = requireString(raw, "targetSegment");
  }
  if ("pilotDurationWeeks" in raw) {
    scenario.pilotDurationWeeks = requireNumber(raw, "pilotDurationWeeks");
  }
  if ("successCriterion" in raw) {
    scenario.successCriterion = requireString(raw, "successCriterion");
  }
  if ("failCriterion" in raw) {
    scenario.failCriterion = requireString(raw, "failCriterion");
  }
  return scenario;
}

function parseQualitativeScenario(raw: unknown): DemoQualitativeScenario {
  if (!isRecord(raw)) {
    throw new Error("Invalid qualitative scenario");
  }
  return {
    strategyKind: requireString(raw, "strategyKind"),
    label: requireString(raw, "label"),
    scope: requireString(raw, "scope"),
  };
}

function parseScenarioMap<T>(
  raw: unknown,
  label: string,
  parse: (value: unknown) => T,
): Record<string, T> {
  if (!isRecord(raw)) {
    throw new Error(`Invalid ${label}`);
  }
  const result: Record<string, T> = {};
  for (const [key, value] of Object.entries(raw)) {
    result[key] = parse(value);
  }
  return result;
}

export function loadDemoCard(json: unknown): DemoDecisionCard {
  if (!isRecord(json)) {
    throw new Error("Demo card must be a JSON object");
  }

  const decisionQuestion = requireString(json, "decisionQuestion");

  return {
    id: requireString(json, "id"),
    label: requireString(json, "label"),
    illustrative: requireBoolean(json, "illustrative"),
    decisionQuestion,
    company: parseCompany(requireField(json, "company", "company")),
    feature: parseFeature(requireField(json, "feature", "feature")),
    goals: requireStringArray(json, "goals"),
    constraints: parseConstraints(requireField(json, "constraints", "constraints")),
    targetMarketBehavior: requireString(json, "targetMarketBehavior"),
    panelSeed: requireNumber(json, "panelSeed"),
    crustdataSearchHint: requireString(json, "crustdataSearchHint"),
    scenarios: parseScenarioMap(
      requireField(json, "scenarios", "scenarios"),
      "scenarios",
      parseQuantitativeScenario,
    ),
    qualitativeScenarios: parseScenarioMap(
      requireField(json, "qualitativeScenarios", "qualitativeScenarios"),
      "qualitativeScenarios",
      parseQualitativeScenario,
    ),
  };
}
