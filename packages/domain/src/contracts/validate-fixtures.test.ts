import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { RunMode } from "../run-mode";
import { validateSessionBundle } from "./session-bundle";

const SESSION_ID = "00000000-0000-4000-8000-000000000001";

describe("contract v1 golden fixtures", () => {
  it("parses fixtures/v1/minimal-session.json through validateSessionBundle", () => {
    const raw = JSON.parse(
      readFileSync(
        join(__dirname, "../../fixtures/v1/minimal-session.json"),
        "utf8",
      ),
    );

    const result = validateSessionBundle(raw);
    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(JSON.stringify(result.error.format(), null, 2));
    }

    expect(result.data.session.id).toBe(SESSION_ID);
    expect(result.data.session.mode).toBe(RunMode.Demo);
    expect(result.data.decision.sessionId).toBe(SESSION_ID);
    expect(result.data.companyProfile.sessionId).toBe(SESSION_ID);
    expect(result.data.featureProposal.sessionId).toBe(SESSION_ID);
    expect(result.data.scenarios).toHaveLength(1);
    expect(result.data.claims).toHaveLength(1);
    expect(result.data.scenarios[0].assumptionRefs).toContain(
      result.data.claims[0].id,
    );
  });
});
