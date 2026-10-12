import type {
  CfoAiMapping,
  FinancePackValues,
  FinanceScenarioKey,
  FinancialMappedMetrics,
} from "@ceo-sandbox/domain/server";
import {
  emptyFinancialMappedMetrics,
  FINANCE_SCENARIO_KEYS,
} from "@ceo-sandbox/domain/server";

const DEFAULT_VALUE_COLUMN = "Value";

export type ScenarioCompareResult = {
  pilot: FinancialMappedMetrics;
  broad_launch: FinancialMappedMetrics;
};

export function tableTarget(tableName: string): string {
  return tableName;
}

export function buildInputCellUpdates(args: {
  mapping: CfoAiMapping;
  scenarioKey: FinanceScenarioKey;
  values: FinancePackValues[string];
}): { table: string; page: string; updates: { row: string; value: number }[] } {
  const { mapping, scenarioKey, values } = args;
  const rows: { row: string; value: number }[] = [];
  let table = "";
  let page = "";

  for (const spec of Object.values(mapping.inputs)) {
    if (spec.scenarioOnly && spec.scenarioOnly !== scenarioKey) {
      continue;
    }
    const mapsTo = spec.mapsToAssumption;
    const value = values[mapsTo];
    if (value === undefined) {
      continue;
    }
    table = spec.table;
    page = spec.page;
    rows.push({ row: spec.row, value });
  }

  return { table, page, updates: rows };
}

export function buildEditInputsPayload(args: {
  orgId: string;
  mapping: CfoAiMapping;
  scenarioKey: FinanceScenarioKey;
  valuesByScenario: FinancePackValues;
}): Record<string, unknown> {
  const scenarioName =
    args.mapping.scenarios[args.scenarioKey].cfoScenarioName;
  const { table, updates } = buildInputCellUpdates({
    mapping: args.mapping,
    scenarioKey: args.scenarioKey,
    values: args.valuesByScenario[args.scenarioKey],
  });
  return {
    org_id: args.orgId,
    update: {
      target: tableTarget(table),
      scenario: scenarioName,
      cell_updates: updates.map((u) => ({
        rows: [u.row],
        columns: [DEFAULT_VALUE_COLUMN],
        value: u.value,
      })),
    },
  };
}

export function buildCompareReadPayload(args: {
  orgId: string;
  mapping: CfoAiMapping;
  baseScenario: string;
}): Record<string, unknown> {
  const compare = args.mapping.compare.inspectTableBlocks;
  const other = compare.scenarios.filter((s) => s !== args.baseScenario);
  return {
    org_id: args.orgId,
    read: {
      target: tableTarget(compare.table),
      scenario: args.baseScenario,
      comparison: {
        scenarios: other.length > 0 ? other : compare.scenarios,
        measures: ["VALUE"],
      },
      rows: Object.values(args.mapping.outputs).map((o) => o.row),
    },
  };
}

type RowValues = Record<string, number | null | undefined>;

function metricFromRowValues(
  mapping: CfoAiMapping,
  rowValues: RowValues,
): FinancialMappedMetrics {
  const base = emptyFinancialMappedMetrics();
  for (const output of Object.values(mapping.outputs)) {
    const raw = rowValues[output.row];
    const canonical = output.canonical;
    if (raw !== null && raw !== undefined && Number.isFinite(raw)) {
      base[canonical] = { provided: true, value: raw };
    }
  }
  const price = rowValues["Price per seat / month"];
  if (price !== null && price !== undefined && Number.isFinite(price)) {
    base.pricing = { provided: true, value: price };
  }
  const buildCost = rowValues["One-time build cost"];
  if (buildCost !== null && buildCost !== undefined && Number.isFinite(buildCost)) {
    base.cost = { provided: true, value: buildCost };
  }
  return base;
}

/** Test hook: `{ cfo_compare: { [scenarioName]: { [rowLabel]: number|null } } }` */
export function parseCompareInspectResponse(
  mapping: CfoAiMapping,
  response: unknown,
): ScenarioCompareResult | null {
  if (!response || typeof response !== "object") {
    return null;
  }
  const root = response as Record<string, unknown>;
  if (root.cfo_compare && typeof root.cfo_compare === "object") {
    const byScenario = root.cfo_compare as Record<string, RowValues>;
    const pilotName = mapping.scenarios.pilot.cfoScenarioName;
    const broadName = mapping.scenarios.broad_launch.cfoScenarioName;
    return {
      pilot: metricFromRowValues(mapping, byScenario[pilotName] ?? {}),
      broad_launch: metricFromRowValues(mapping, byScenario[broadName] ?? {}),
    };
  }

  const read = root.read ?? root;
  if (!read || typeof read !== "object") {
    return null;
  }
  const readObj = read as Record<string, unknown>;
  const scenariosBlock = readObj.scenarios ?? readObj.comparison;
  if (scenariosBlock && typeof scenariosBlock === "object") {
    const byScenario = scenariosBlock as Record<string, RowValues>;
    const pilotName = mapping.scenarios.pilot.cfoScenarioName;
    const broadName = mapping.scenarios.broad_launch.cfoScenarioName;
    return {
      pilot: metricFromRowValues(mapping, byScenario[pilotName] ?? {}),
      broad_launch: metricFromRowValues(mapping, byScenario[broadName] ?? {}),
    };
  }

  const rows = readObj.rows;
  if (!Array.isArray(rows)) {
    return null;
  }
  const pilotName = mapping.scenarios.pilot.cfoScenarioName;
  const broadName = mapping.scenarios.broad_launch.cfoScenarioName;
  const pilotRows: RowValues = {};
  const broadRows: RowValues = {};
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const label =
      (typeof r.label === "string" && r.label) ||
      (typeof r.display_name === "string" && r.display_name) ||
      (typeof r.name === "string" && r.name);
    if (!label) continue;
    const cells = r.cells ?? r.values;
    if (Array.isArray(cells)) {
      for (const cell of cells) {
        if (!cell || typeof cell !== "object") continue;
        const c = cell as Record<string, unknown>;
        const scenario =
          typeof c.scenario === "string"
            ? c.scenario
            : typeof c.scenario_name === "string"
              ? c.scenario_name
              : "";
        const value = c.value;
        const num =
          typeof value === "number"
            ? value
            : typeof value === "string"
              ? Number(value)
              : null;
        if (scenario === pilotName) pilotRows[label] = num;
        if (scenario === broadName) broadRows[label] = num;
      }
    }
  }
  return {
    pilot: metricFromRowValues(mapping, pilotRows),
    broad_launch: metricFromRowValues(mapping, broadRows),
  };
}

export function isCompareEmpty(compare: ScenarioCompareResult): boolean {
  for (const key of FINANCE_SCENARIO_KEYS) {
    const metrics = compare[key];
    for (const metric of Object.values(metrics)) {
      if (metric.provided && metric.value !== undefined) {
        return false;
      }
    }
  }
  return true;
}

export function adoptionFromCompare(compare: ScenarioCompareResult): number | null {
  const adoption = compare.pilot.adoption;
  if (adoption.provided && adoption.value !== undefined) {
    return adoption.value;
  }
  return null;
}
