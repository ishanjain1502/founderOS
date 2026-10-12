import { describe, expect, it } from "vitest";
import { buildPanelStimulus } from "./panel-stimulus";

describe("buildPanelStimulus", () => {
  it("omits price when the amount is absent and keeps packaging when present", () => {
    const built = buildPanelStimulus({
      feature: {
        title: "AI analytics",
        description: "Premium analytics layer",
        packaging: "  Add-on seat  ",
      },
      company: { productSummary: "B2B workflow SaaS" },
      market: { targetMarketBehavior: "Ops leads" },
    });
    expect(built.text).toBe(
      [
        "Feature: AI analytics",
        "Description: Premium analytics layer",
        "Product: B2B workflow SaaS",
      ].join("\n"),
    );
    expect(built.priceShown).toBeNull();
    expect(built.packaging).toBe("Add-on seat");
    expect(built.marketText).toBe("Ops leads");
    expect(built.text.includes("Crustdata")).toBe(false);
  });

  it("adds the price line and uses (no title) and period absent", () => {
    const built = buildPanelStimulus({
      feature: { description: "A change", proposedPriceUsd: 40 },
      company: { productSummary: "SaaS" },
    });
    expect(built.text).toContain("Feature: (no title)");
    expect(built.text).toContain("Price shown: 40 USD period absent");
    expect(built.priceShown).toEqual({ usd: 40, period: "period absent" });
    expect(built.packaging).toBeNull();
    expect(built.marketText).toBe("");
  });
});
