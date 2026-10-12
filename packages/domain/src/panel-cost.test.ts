import { describe, expect, it } from "vitest";
import { estimatePanelUsd } from "./panel-cost";

describe("estimatePanelUsd", () => {
  it("bills cache-read tokens at 0.006 and other input at 0.30", () => {
    const usd = estimatePanelUsd({
      promptTokens: 1_000_000,
      cacheReadTokens: 250_000,
      completionTokens: 1_000_000,
    });
    expect(usd).toBeCloseTo(0.75 * 0.3 + 0.25 * 0.006 + 1.2, 10);
  });

  it("bills every prompt token at 0.30 when cache detail is zero", () => {
    const usd = estimatePanelUsd({
      promptTokens: 1_000_000,
      cacheReadTokens: 0,
      completionTokens: 0,
    });
    expect(usd).toBeCloseTo(0.3, 10);
  });
});
