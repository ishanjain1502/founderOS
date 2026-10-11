import { describe, it, expect } from "vitest";
import { EntitySource } from "./base";
import { StrategyKind } from "./enums";
import { EpistemicKind } from "../epistemic";
import { scenarioSchema } from "./scenario";
import {
  financialRunResultSchema,
  mappedFinanceMetricSchema,
  emptyFinancialMappedMetrics,
} from "./finance";

const SESSION_ID = "00000000-0000-4000-8000-000000000001";
const SCENARIO_ID = "00000000-0000-4000-8000-000000000020";
const ASSUMPTION_ID = "00000000-0000-4000-8000-000000000030";
const CREATED_AT = "2026-01-01T00:00:00.000Z";

const scenarioBase = {
  id: SCENARIO_ID,
  sessionId: SESSION_ID,
  contractVersion: 1 as const,
  createdAt: CREATED_AT,
  source: EntitySource.User,
  strategyKind: StrategyKind.Pilot,
  scope: "50 design-partner accounts",
  label: "Pilot launch",
  assumptionRefs: [ASSUMPTION_ID],
};

describe("scenarioSchema", () => {
  it("accepts a scenario with assumption refs", () => {
    const r = scenarioSchema.safeParse(scenarioBase);
    expect(r.success).toBe(true);
  });

  it("rejects empty assumptionRefs when requiresFinance is true", () => {
    const r = scenarioSchema.safeParse({
      ...scenarioBase,
      requiresFinance: true,
      assumptionRefs: [],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("assumptionRefs"))).toBe(
        true,
      );
    }
  });

  it("allows empty assumptionRefs when requiresFinance is false", () => {
    const r = scenarioSchema.safeParse({
      ...scenarioBase,
      requiresFinance: false,
      assumptionRefs: [],
    });
    expect(r.success).toBe(true);
  });
});

describe("mappedFinanceMetricSchema", () => {
  it("accepts provided metric with value", () => {
    expect(
      mappedFinanceMetricSchema.safeParse({ provided: true, value: 8 }).success,
    ).toBe(true);
  });

  it("accepts not-provided metric without value", () => {
    expect(mappedFinanceMetricSchema.safeParse({ provided: false }).success).toBe(
      true,
    );
  });

  it("rejects value when provided is false", () => {
    expect(
      mappedFinanceMetricSchema.safeParse({ provided: false, value: 1 }).success,
    ).toBe(false);
  });
});

describe("financialRunResultSchema", () => {
  const financeBase = {
    financeRunId: "finance-run-001",
    scenarioId: SCENARIO_ID,
    rawPayloadRef: "data/blobs/finance-raw-001",
    epistemicLabel: EpistemicKind.Inferred,
    assumptionRefs: [ASSUMPTION_ID],
    mapped: {
      ...emptyFinancialMappedMetrics(),
      adoption: { provided: true, value: 8 },
    },
  };

  it("requires epistemicLabel Inferred and at least one assumptionRef", () => {
    const ok = financialRunResultSchema.safeParse(financeBase);
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.epistemicLabel).toBe(EpistemicKind.Inferred);
    }

    const noRefs = financialRunResultSchema.safeParse({
      ...financeBase,
      assumptionRefs: [],
    });
    expect(noRefs.success).toBe(false);

    const wrongLabel = financialRunResultSchema.safeParse({
      ...financeBase,
      epistemicLabel: EpistemicKind.Assumed,
    });
    expect(wrongLabel.success).toBe(false);
  });

  it("requires all Q29 mapped metric keys", () => {
    const mapped = emptyFinancialMappedMetrics();
    const { cost: _cost, ...withoutCost } = mapped;
    const r = financialRunResultSchema.safeParse({
      ...financeBase,
      mapped: withoutCost,
    });
    expect(r.success).toBe(false);
  });
});
