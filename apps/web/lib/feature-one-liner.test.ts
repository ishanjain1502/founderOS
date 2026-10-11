import { describe, expect, it } from "vitest";
import { featureOneLiner } from "./feature-one-liner";

describe("featureOneLiner", () => {
  it("prefers title", () => {
    expect(featureOneLiner({ title: "AI add-on", description: "Long. Text." })).toBe(
      "AI add-on",
    );
  });
  it("uses first sentence of description", () => {
    expect(featureOneLiner({ description: "Natural-language insights. Extra." })).toBe(
      "Natural-language insights",
    );
  });
});
