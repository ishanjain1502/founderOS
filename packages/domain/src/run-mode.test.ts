import { describe, it, expect } from "vitest";
import { RunMode, parseRunMode } from "./run-mode";

describe("parseRunMode", () => {
  it("accepts demo and full", () => {
    expect(parseRunMode("demo")).toBe(RunMode.Demo);
    expect(parseRunMode("full")).toBe(RunMode.Full);
  });
  it("rejects unknown", () => {
    expect(() => parseRunMode("batch")).toThrow();
  });
});
