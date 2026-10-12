import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  financeStateFromFixture,
  type FinanceFixtureDoc,
} from "./finance-fixture";

describe("financeStateFromFixture", () => {
  it("maps demo_run.json", () => {
    const doc = JSON.parse(
      readFileSync(
        join(__dirname, "../../../fixtures/finance/demo_run.json"),
        "utf8",
      ),
    ) as FinanceFixtureDoc;
    const state = financeStateFromFixture(doc);
    expect(state.status).toBe("fallback");
    expect(state.source).toBe("fixture");
    expect(state.compare?.pilot.adoption).toEqual({
      provided: true,
      value: 8,
    });
  });
});
