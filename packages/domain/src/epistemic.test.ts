import { describe, it, expect } from "vitest";
import { EpistemicKind, epistemicLabel, CLAIM_SAFETY_COPY } from "./epistemic";
import { findForbiddenPhrases } from "./forbidden-phrases";

describe("epistemicLabel", () => {
  it("maps simulated panel metrics", () => {
    expect(epistemicLabel(EpistemicKind.Simulated)).toBe("Simulated");
  });
});

describe("CLAIM_SAFETY_COPY", () => {
  it("includes finance disclaimer", () => {
    expect(CLAIM_SAFETY_COPY.financeNotForecast).toMatch(
      /not verified projections/i,
    );
  });

  it("every string passes findForbiddenPhrases", () => {
    for (const text of Object.values(CLAIM_SAFETY_COPY)) {
      expect(findForbiddenPhrases(text)).toEqual([]);
    }
  });
});
