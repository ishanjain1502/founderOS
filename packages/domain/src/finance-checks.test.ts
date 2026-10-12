import { describe, expect, it } from "vitest";
import { runFinanceDeterministicChecks } from "./finance-checks";

describe("runFinanceDeterministicChecks", () => {
  it("warns on runway tension above 25%", () => {
    const checks = runFinanceDeterministicChecks({
      packHash: "a",
      sentPackHash: "a",
      cashUsd: 2_000_000,
      monthlyBurnUsd: 100_000,
      intakeRunwayMonths: 12,
    });
    expect(checks.some((c) => c.code === "runway_tension")).toBe(true);
  });
});
