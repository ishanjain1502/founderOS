import { emptyFinancialMappedMetrics } from "./contracts/finance";
import type { FinanceState } from "./contracts/finance-snapshot";

type FixtureMetricRow = {
  revenue: number | null;
  burn: number | null;
  runway: number | null;
  margin: number | null;
  adoption: number | null;
};

export type FinanceFixtureDoc = {
  _fixtureLabel?: string;
  financeRunId: string;
  recordedAt?: string;
  baseline?: {
    cashUsd?: number;
    mrrUsd?: number;
    runwayMonthsUserInput?: number;
    source?: string;
  };
  mapped: {
    pilot: FixtureMetricRow;
    broad_launch: FixtureMetricRow;
  };
  sensitivity?: FinanceState["sensitivity"];
};

function mapRow(row: FixtureMetricRow) {
  const base = emptyFinancialMappedMetrics();
  const adoption =
    row.adoption !== null
      ? { provided: true as const, value: row.adoption }
      : base.adoption;
  const revenue =
    row.revenue !== null
      ? { provided: true as const, value: row.revenue }
      : base.revenue;
  const burn =
    row.burn !== null
      ? { provided: true as const, value: row.burn }
      : base.burn;
  const runway =
    row.runway !== null
      ? { provided: true as const, value: row.runway }
      : base.runway;
  const margin =
    row.margin !== null
      ? { provided: true as const, value: row.margin }
      : base.margin;
  return {
    ...base,
    adoption,
    revenue,
    burn,
    runway,
    margin,
  };
}

export function financeStateFromFixture(
  doc: FinanceFixtureDoc,
  opts: { financeRunId?: string } = {},
): FinanceState {
  const financeRunId = opts.financeRunId ?? doc.financeRunId;
  return {
    status: "fallback",
    source: "fixture",
    financeRunId,
    ranAt: doc.recordedAt
      ? new Date(`${doc.recordedAt}T12:00:00.000Z`).toISOString()
      : new Date().toISOString(),
    mcpCallCount: 0,
    baseline: doc.baseline
      ? {
          cashUsd: doc.baseline.cashUsd,
          mrrUsd: doc.baseline.mrrUsd,
          runwayMonthsUserInput: doc.baseline.runwayMonthsUserInput,
          assumptionRefs: [],
        }
      : undefined,
    compare: {
      pilot: mapRow(doc.mapped.pilot),
      broad_launch: mapRow(doc.mapped.broad_launch),
    },
    sensitivity: doc.sensitivity,
  };
}
