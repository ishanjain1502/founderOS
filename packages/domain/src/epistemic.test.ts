import { describe, it, expect } from "vitest";
import { EpistemicKind, epistemicLabel, CLAIM_SAFETY_COPY } from "./epistemic";

describe("epistemicLabel", () => {
  it("maps simulated panel metrics", () => {
    expect(epistemicLabel(EpistemicKind.Simulated)).toBe("Simulated");
  });
});

describe("CLAIM_SAFETY_COPY", () => {
  it("includes finance disclaimer", () => {
    expect(CLAIM_SAFETY_COPY.financeNotForecast).toMatch(
      /not a verified forecast/i,
    );
  });
});
