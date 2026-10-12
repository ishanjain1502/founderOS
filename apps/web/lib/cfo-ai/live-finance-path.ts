import {
  buildSensitivityGrid,
  rankSensitivityDrivers,
  type FinanceState,
} from "@ceo-sandbox/domain";
import type { CfoAiMapping, FinancePackValues } from "@ceo-sandbox/domain/server";
import type { FinanceMcpLogEntry } from "./write-raw";
import type { CfoMcpClient } from "./types";
import { FINANCE_MCP_CALL_BUDGET } from "./types";
import {
  adoptionFromCompare,
  buildCompareReadPayload,
  buildEditInputsPayload,
  isCompareEmpty,
  parseCompareInspectResponse,
  type ScenarioCompareResult,
} from "./map-compare";

export type LiveFinanceRunResult = {
  status: "complete" | "unavailable";
  compare?: ScenarioCompareResult;
  sensitivity?: FinanceState["sensitivity"];
  mcpCallCount: number;
  rawLog: FinanceMcpLogEntry[];
};

async function callLogged(
  client: CfoMcpClient,
  log: FinanceMcpLogEntry[],
  tool: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const response = await client.callTool(tool, args);
  log.push({
    at: new Date().toISOString(),
    tool,
    args,
    response,
  });
  return response;
}

function canContinue(
  mcpCallCount: number,
  clock: () => number,
  deadline: number,
): boolean {
  return mcpCallCount < FINANCE_MCP_CALL_BUDGET && clock() < deadline;
}

export async function executeLiveFinanceRun(args: {
  client: CfoMcpClient;
  mapping: CfoAiMapping;
  valuesByScenario: FinancePackValues;
  orgId: string;
  clock: () => number;
  deadline: number;
}): Promise<LiveFinanceRunResult> {
  const log: FinanceMcpLogEntry[] = [];
  let mcpCallCount = 0;
  const orgId = args.orgId;

  for (const scenarioKey of ["pilot", "broad_launch"] as const) {
    if (!canContinue(mcpCallCount, args.clock, args.deadline)) {
      break;
    }
    const payload = buildEditInputsPayload({
      orgId,
      mapping: args.mapping,
      scenarioKey,
      valuesByScenario: args.valuesByScenario,
    });
    await callLogged(args.client, log, "edit_table_blocks", payload);
    mcpCallCount += 1;
  }

  let compare: ScenarioCompareResult | null = null;
  const pilotScenario = args.mapping.scenarios.pilot.cfoScenarioName;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!canContinue(mcpCallCount, args.clock, args.deadline)) {
      break;
    }
    const readPayload = buildCompareReadPayload({
      orgId,
      mapping: args.mapping,
      baseScenario: pilotScenario,
    });
    const response = await callLogged(
      args.client,
      log,
      "inspect_table_blocks",
      readPayload,
    );
    mcpCallCount += 1;
    compare = parseCompareInspectResponse(args.mapping, response);
    if (compare && !isCompareEmpty(compare)) {
      break;
    }
  }

  if (!compare || isCompareEmpty(compare)) {
    return {
      status: "unavailable",
      mcpCallCount,
      rawLog: log,
    };
  }

  const pilotValues = args.valuesByScenario.pilot;
  const basePrice = pilotValues.price_per_seat;
  const baseAdoption = pilotValues.adoption_rate;
  const grid = buildSensitivityGrid(basePrice, baseAdoption);
  const priceSamples: number[] = [];
  const adoptionSamples: number[] = [];

  const pricePoints = [grid.price.low, grid.price.high];
  const adoptionPoints = [grid.adoption.low, grid.adoption.high];

  for (const price of pricePoints) {
    if (!canContinue(mcpCallCount, args.clock, args.deadline)) {
      break;
    }
    const values = {
      ...args.valuesByScenario,
      pilot: { ...pilotValues, price_per_seat: price },
    };
    const writePayload = buildEditInputsPayload({
      orgId,
      mapping: args.mapping,
      scenarioKey: "pilot",
      valuesByScenario: values,
    });
    await callLogged(args.client, log, "edit_table_blocks", writePayload);
    mcpCallCount += 1;
    if (!canContinue(mcpCallCount, args.clock, args.deadline)) {
      break;
    }
    const readPayload = buildCompareReadPayload({
      orgId,
      mapping: args.mapping,
      baseScenario: pilotScenario,
    });
    const response = await callLogged(
      args.client,
      log,
      "inspect_table_blocks",
      readPayload,
    );
    mcpCallCount += 1;
    const parsed = parseCompareInspectResponse(args.mapping, response);
    const adoption = parsed ? adoptionFromCompare(parsed) : null;
    if (adoption !== null) {
      priceSamples.push(adoption);
    }
  }

  for (const adoptionRate of adoptionPoints) {
    if (!canContinue(mcpCallCount, args.clock, args.deadline)) {
      break;
    }
    const values = {
      ...args.valuesByScenario,
      pilot: { ...pilotValues, adoption_rate: adoptionRate },
    };
    const writePayload = buildEditInputsPayload({
      orgId,
      mapping: args.mapping,
      scenarioKey: "pilot",
      valuesByScenario: values,
    });
    await callLogged(args.client, log, "edit_table_blocks", writePayload);
    mcpCallCount += 1;
    if (!canContinue(mcpCallCount, args.clock, args.deadline)) {
      break;
    }
    const readPayload = buildCompareReadPayload({
      orgId,
      mapping: args.mapping,
      baseScenario: pilotScenario,
    });
    const response = await callLogged(
      args.client,
      log,
      "inspect_table_blocks",
      readPayload,
    );
    mcpCallCount += 1;
    const parsed = parseCompareInspectResponse(args.mapping, response);
    const adoption = parsed ? adoptionFromCompare(parsed) : null;
    if (adoption !== null) {
      adoptionSamples.push(adoption);
    }
  }

  const priceDelta =
    priceSamples.length >= 2
      ? Math.max(...priceSamples) - Math.min(...priceSamples)
      : 0;
  const adoptionDelta =
    adoptionSamples.length >= 2
      ? Math.max(...adoptionSamples) - Math.min(...adoptionSamples)
      : 0;

  const sensitivity: FinanceState["sensitivity"] = {
    onScenario: "pilot",
    price: grid.price,
    adoption: grid.adoption,
    topDrivers: rankSensitivityDrivers({ priceDelta, adoptionDelta }),
  };

  return {
    status: "complete",
    compare,
    sensitivity,
    mcpCallCount,
    rawLog: log,
  };
}
