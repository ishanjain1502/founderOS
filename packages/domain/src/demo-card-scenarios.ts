import { createHash } from "node:crypto";
import type { DemoDecisionCard, DemoQuantitativeScenario } from "./demo-card";
import { ClaimRationaleTag } from "./contracts/claim";
import type {
  SessionDraftAssumption,
  SessionDraftScenario,
} from "./contracts/session";

const FINANCE_SCENARIO_KEYS = ["pilot", "broad_launch"] as const;

function stableDraftUuid(seed: string): string {
  const hash = createHash("sha256").update(seed).digest();
  const bytes = Uint8Array.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function assumptionId(
  cardId: string,
  scenarioKey: string,
  mapsTo: string,
): string {
  return stableDraftUuid(`${cardId}:${scenarioKey}:${mapsTo}`);
}

function buildAssumption(
  cardId: string,
  scenarioKey: string,
  mapsTo: string,
  statement: string,
  numeric: SessionDraftAssumption["numeric"],
): SessionDraftAssumption {
  return {
    id: assumptionId(cardId, scenarioKey, mapsTo),
    statement,
    numeric,
    rationaleTag: ClaimRationaleTag.DemoFixture,
    mapsTo,
    scenarioKey,
  };
}

function assumptionsForScenario(
  card: DemoDecisionCard,
  scenarioKey: string,
  scenario: DemoQuantitativeScenario,
): SessionDraftAssumption[] {
  const { assumptions } = scenario;
  return [
    buildAssumption(
      card.id,
      scenarioKey,
      "adoption_rate",
      `${scenario.label}: adoption rate`,
      { unit: "percent", value: assumptions.adoption_rate_percent },
    ),
    buildAssumption(
      card.id,
      scenarioKey,
      "build_cost",
      `${scenario.label}: one-time build cost`,
      {
        unit: "money",
        value: assumptions.build_cost_usd,
        currency: "USD",
        period: "one_time",
      },
    ),
  ];
}

function scenarioStub(
  scenarioKey: string,
  scenario: DemoQuantitativeScenario,
  assumptionRows: SessionDraftAssumption[],
): SessionDraftScenario {
  return {
    key: scenarioKey,
    strategyKind: scenario.strategyKind,
    label: scenario.label,
    scope: scenario.scope,
    assumptionRefs: assumptionRows.map((row) => row.id),
    requiresFinance: true,
  };
}

export function buildDemoScenariosAndAssumptions(card: DemoDecisionCard): {
  scenarios: SessionDraftScenario[];
  assumptions: SessionDraftAssumption[];
} {
  const assumptions: SessionDraftAssumption[] = [];
  const scenarios: SessionDraftScenario[] = [];

  for (const scenarioKey of FINANCE_SCENARIO_KEYS) {
    const scenario = card.scenarios[scenarioKey];
    if (!scenario) {
      continue;
    }
    const rows = assumptionsForScenario(card, scenarioKey, scenario);
    assumptions.push(...rows);
    scenarios.push(scenarioStub(scenarioKey, scenario, rows));
  }

  return { scenarios, assumptions };
}
