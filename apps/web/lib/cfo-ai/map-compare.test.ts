import { describe, expect, it } from "vitest";
import { loadCfoAiMappingFromJson } from "@ceo-sandbox/domain/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildEditInputsPayload,
  isCompareEmpty,
  parseCompareInspectResponse,
} from "./map-compare";

const mapping = loadCfoAiMappingFromJson(
  JSON.parse(
    readFileSync(
      join(process.cwd(), "../../config/cfo-ai-mapping.json"),
      "utf8",
    ),
  ),
);

describe("map-compare", () => {
  it("builds edit payload with cell updates per scenario", () => {
    const payload = buildEditInputsPayload({
      orgId: "103299",
      mapping,
      scenarioKey: "pilot",
      valuesByScenario: {
        pilot: {
          build_cost: 50_000,
          build_timeline_months: 2,
          price_per_seat: 30,
          adoption_rate: 12,
          inference_cost_per_user: 5,
          pilot_cohort_size: 8,
        },
        broad_launch: {
          build_cost: 80_000,
          build_timeline_months: 4,
          price_per_seat: 30,
          adoption_rate: 20,
          inference_cost_per_user: 5,
        },
      },
    });
    expect(payload.org_id).toBe("103299");
    const update = payload.update as {
      cell_updates: { rows: string[]; value: number }[];
    };
    expect(update.cell_updates.length).toBeGreaterThanOrEqual(5);
  });

  it("parses cfo_compare mock and detects empty", () => {
    const empty = parseCompareInspectResponse(mapping, {
      cfo_compare: {
        "CEO sandbox - Pilot": { "Incremental MRR": null },
        "CEO sandbox - Broad": {},
      },
    });
    expect(empty).not.toBeNull();
    expect(isCompareEmpty(empty!)).toBe(true);

    const filled = parseCompareInspectResponse(mapping, {
      cfo_compare: {
        "CEO sandbox - Pilot": { "Incremental MRR": 1200 },
        "CEO sandbox - Broad": { "Incremental MRR": 2400 },
      },
    });
    expect(filled).not.toBeNull();
    expect(isCompareEmpty(filled!)).toBe(false);
    expect(filled!.pilot.revenue).toEqual({ provided: true, value: 1200 });
  });
});
