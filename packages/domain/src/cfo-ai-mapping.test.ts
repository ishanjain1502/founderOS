import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cfoAiMappingSchema, loadCfoAiMappingFromJson } from "./cfo-ai-mapping";

describe("cfoAiMappingSchema", () => {
  it("accepts repo config", () => {
    const root = join(__dirname, "../../../config/cfo-ai-mapping.json");
    const json = JSON.parse(readFileSync(root, "utf8"));
    const r = cfoAiMappingSchema.safeParse(json);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.scenarios.pilot.strategyKind).toBe("pilot");
      expect(r.data.setupStatus).toBe("deferred_per_tenant");
    }
  });

  it("loadCfoAiMappingFromJson throws on invalid", () => {
    expect(() => loadCfoAiMappingFromJson({})).toThrow();
  });
});
