import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { loadDemoCard } from "./demo-card";

describe("loadDemoCard", () => {
  it("parses ai analytics fixture", () => {
    const raw = JSON.parse(
      readFileSync(
        join(__dirname, "../../../fixtures/demo/decision-card-ai-analytics.json"),
        "utf8",
      ),
    );
    const card = loadDemoCard(raw);
    expect(card.id).toBe("demo-ai-analytics-premium");
    expect(card.illustrative).toBe(true);
    expect(card.company.mrrUsd).toBe(80000);
  });

  it("rejects missing decisionQuestion", () => {
    expect(() => loadDemoCard({ id: "x" })).toThrow(/decisionQuestion/);
  });
});
