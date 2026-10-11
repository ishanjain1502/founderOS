import { describe, it, expect } from "vitest";
import { baseEntitySchema, CONTRACT_VERSION } from "./base";

describe("baseEntitySchema", () => {
  it("requires contractVersion 1", () => {
    const r = baseEntitySchema.safeParse({
      id: "00000000-0000-4000-8000-000000000001",
      contractVersion: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      source: "system",
    });
    expect(r.success).toBe(true);
    expect(CONTRACT_VERSION).toBe(1);
  });
  it("rejects wrong version", () => {
    const r = baseEntitySchema.safeParse({
      id: "x",
      contractVersion: 2,
      createdAt: "2026-01-01T00:00:00.000Z",
      source: "system",
    });
    expect(r.success).toBe(false);
  });
});
