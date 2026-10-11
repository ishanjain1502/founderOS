import { describe, expect, it } from "vitest";
import { continueHref } from "./continue-href";

describe("continueHref", () => {
  it("maps status to routes", () => {
    expect(continueHref("draft", "abc")).toBe("/intake/abc?step=1");
    expect(continueHref("approved", "abc")).toBe("/intake/abc/recap");
    expect(continueHref("frozen", "abc")).toBe("/session/abc");
  });
});
