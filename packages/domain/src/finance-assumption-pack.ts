import type { CfoAiMapping } from "./cfo-ai-mapping";
import type { EpistemicSnapshot } from "./contracts/epistemic-snapshot";
import { ClaimKind } from "./contracts/enums";
import { ClaimStatus } from "./contracts/claim";
import type { SessionDraftAssumption } from "./contracts/session";

export const FINANCE_SCENARIO_KEYS = ["pilot", "broad_launch"] as const;
export type FinanceScenarioKey = (typeof FINANCE_SCENARIO_KEYS)[number];

const SHARED_MAPS_TO = [
  "build_cost",
  "build_timeline_months",
  "price_per_seat",
  "inference_cost_per_user",
] as const;

const PER_SCENARIO_MAPS_TO = ["adoption_rate"] as const;

const PILOT_ONLY_MAPS_TO = ["pilot_cohort_size"] as const;

export type FinancePackValues = Record<
  string,
  Record<string, number>
>;

export type ValidateFinanceAssumptionPackInput = {
  assumptions: SessionDraftAssumption[];
  epistemic: EpistemicSnapshot;
  mapping: CfoAiMapping;
};

export type ValidateFinanceAssumptionPackOk = {
  ok: true;
  valuesByScenario: FinancePackValues;
  assumptionRefs: string[];
  packHash: string;
};

export type ValidateFinanceAssumptionPackFail = {
  ok: false;
  errors: string[];
};

export function buildAssumptionPackDigest(
  valuesByScenario: FinancePackValues,
): string {
  const scenarioKeys = Object.keys(valuesByScenario).sort();
  const parts: string[] = [];
  for (const scenario of scenarioKeys) {
    const row = valuesByScenario[scenario];
    const maps = Object.keys(row).sort();
    for (const mapsTo of maps) {
      parts.push(`${scenario}:${mapsTo}=${row[mapsTo]}`);
    }
  }
  return parts.join("|");
}

function numericValue(row: SessionDraftAssumption): number | null {
  if (!row.numeric) {
    return null;
  }
  return row.numeric.value;
}

function findAssumption(
  assumptions: SessionDraftAssumption[],
  mapsTo: string,
  scenarioKey: string,
): SessionDraftAssumption | undefined {
  const exact = assumptions.find(
    (row) => row.mapsTo === mapsTo && row.scenarioKey === scenarioKey,
  );
  if (exact) {
    return exact;
  }
  return assumptions.find(
    (row) => row.mapsTo === mapsTo && row.scenarioKey === undefined,
  );
}

function panelBridgeWithoutDerived(
  epistemic: EpistemicSnapshot,
  assumption: SessionDraftAssumption,
): boolean {
  if (!/panel/i.test(assumption.statement)) {
    return false;
  }
  const claim = epistemic.claims.find((c) => c.id === assumption.id);
  if (claim?.kind !== ClaimKind.Assumption) {
    return false;
  }
  return !claim.derivedFrom;
}

export function validateFinanceAssumptionPack(
  input: ValidateFinanceAssumptionPackInput,
): ValidateFinanceAssumptionPackOk | ValidateFinanceAssumptionPackFail {
  const errors: string[] = [];
  const { assumptions, epistemic } = input;
  const valuesByScenario: FinancePackValues = {};
  const assumptionRefs: string[] = [];

  for (const scenarioKey of FINANCE_SCENARIO_KEYS) {
    valuesByScenario[scenarioKey] = {};
    const requiredMaps = [
      ...SHARED_MAPS_TO,
      ...PER_SCENARIO_MAPS_TO,
      ...(scenarioKey === "pilot" ? PILOT_ONLY_MAPS_TO : []),
    ];

    for (const mapsTo of requiredMaps) {
      const row = findAssumption(assumptions, mapsTo, scenarioKey);
      if (!row) {
        errors.push(
          `missing assumption mapsTo=${mapsTo} for scenario ${scenarioKey}`,
        );
        continue;
      }
      const value = numericValue(row);
      if (value === null) {
        errors.push(`assumption ${row.id} missing numeric value`);
        continue;
      }
      if (panelBridgeWithoutDerived(epistemic, row)) {
        errors.push(
          `assumption ${row.id} references panel without derivedFrom on claim`,
        );
      }
      valuesByScenario[scenarioKey][mapsTo] = value;
      assumptionRefs.push(row.id);
    }
  }

  const openConflicts = epistemic.claims.filter(
    (c) => c.kind === ClaimKind.Assumption && c.status === ClaimStatus.Contradicted,
  );
  if (openConflicts.length > 0) {
    errors.push("unresolved contradicted assumptions");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    valuesByScenario,
    assumptionRefs: [...new Set(assumptionRefs)],
    packHash: buildAssumptionPackDigest(valuesByScenario),
  };
}
