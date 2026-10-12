import { describe, expect, it } from "vitest";
import { loadDemoCard } from "./demo-card";
import { buildDemoScenariosAndAssumptions } from "./demo-card-scenarios";
import { loadCfoAiMappingFromJson } from "./cfo-ai-mapping";
import { emptyEpistemicSnapshot } from "./contracts/epistemic-snapshot";
import {
  buildAssumptionPackDigest,
  validateFinanceAssumptionPack,
} from "./finance-assumption-pack";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("buildAssumptionPackDigest", () => {
  it("is stable for the same values", () => {
    const values = {
      pilot: { adoption_rate: 8 },
      broad_launch: { adoption_rate: 18 },
    };
    expect(buildAssumptionPackDigest(values)).toBe(
      buildAssumptionPackDigest(values),
    );
  });
});

describe("validateFinanceAssumptionPack", () => {
  const mapping = loadCfoAiMappingFromJson(
    JSON.parse(
      readFileSync(
        join(__dirname, "../../../config/cfo-ai-mapping.json"),
        "utf8",
      ),
    ),
  );

  it("fails when demo assumptions are incomplete", () => {
    const card = loadDemoCard(
      JSON.parse(
        readFileSync(
          join(__dirname, "../../../fixtures/demo/decision-card-ai-analytics.json"),
          "utf8",
        ),
      ),
    );
    const { assumptions } = buildDemoScenariosAndAssumptions(card);
    const result = validateFinanceAssumptionPack({
      assumptions,
      epistemic: emptyEpistemicSnapshot(),
      mapping,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("build_timeline_months"))).toBe(
        true,
      );
    }
  });
});
