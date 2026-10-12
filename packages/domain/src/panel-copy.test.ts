import { describe, expect, it } from "vitest";
import { PANEL_COPY } from "./panel-copy";

const banned = ["survey", "respondents said", "market research", "customers said"];

describe("PANEL_COPY", () => {
  it("allows survey only in the required banner", () => {
    expect(PANEL_COPY.banner).toBe(
      "Simulated panel — not real customer interviews or survey data.",
    );
    for (const [key, value] of Object.entries(PANEL_COPY)) {
      if (key === "banner") continue;
      const lower = value.toLowerCase();
      for (const phrase of banned) {
        expect(lower.includes(phrase)).toBe(false);
      }
    }
  });
});
