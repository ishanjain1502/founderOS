import { describe, it, expect } from "vitest";
import { FORBIDDEN_PHRASES, findForbiddenPhrases } from "./forbidden-phrases";

describe("FORBIDDEN_PHRASES", () => {
  it("lists SP-02-Q43 report vocabulary", () => {
    expect(FORBIDDEN_PHRASES).toEqual([
      "customers said",
      "survey",
      "forecast",
      "will generate",
      "proven demand",
      "real market proof",
      "definitely",
      "customers will buy",
      "guaranteed revenue",
      "will hit $",
      "1000 real",
      "1,000 real",
      "proves demand",
      "proves customer demand",
      "real interviews",
    ]);
  });
});

describe("findForbiddenPhrases", () => {
  it("detects customers said in sample paragraph", () => {
    const paragraph =
      "Our narrative claims that customers said they want this capability, " +
      "which must not appear in export copy.";
    expect(findForbiddenPhrases(paragraph)).toContain("customers said");
  });

  it("returns empty when no forbidden phrases appear", () => {
    expect(
      findForbiddenPhrases(
        "Simulated panel results show adoption among enterprise archetypes.",
      ),
    ).toEqual([]);
  });

  it("matches case-insensitively", () => {
    expect(findForbiddenPhrases("This FORECAST is not allowed.")).toContain(
      "forecast",
    );
  });

  it("flags competitor-proves-demand wording", () => {
    expect(findForbiddenPhrases("This proves customer demand for our add-on.")).toContain(
      "proves customer demand",
    );
  });

  it("returns all matches in list order", () => {
    const hits = findForbiddenPhrases(
      "A survey-backed forecast will generate proven demand.",
    );
    expect(hits).toEqual(["survey", "forecast", "will generate", "proven demand"]);
  });
});
