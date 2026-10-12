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

  it("includes financeModeled attribution", () => {
    expect(CLAIM_SAFETY_COPY.financeModeled).toBe(
      "Modeled — cfo.ai workspace (not a verified forecast).",
    );
  });

  it("every string passes findForbiddenPhrases", () => {
    for (const [key, text] of Object.entries(CLAIM_SAFETY_COPY)) {
      if (key === "financeModeled") {
        expect(findForbiddenPhrases(text)).toEqual(["forecast"]);
        continue;
      }
      expect(findForbiddenPhrases(text)).toEqual([]);
    }
  });
});
