import { describe, it, expect } from "vitest";
import { ClaimKind } from "./enums";
import { assumptionNumericSchema, claimSchema } from "./claim";
import { EvidenceVendor, evidenceSchema } from "./evidence";

const baseEntity = {
  id: "00000000-0000-4000-8000-000000000001",
  contractVersion: 1 as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  source: "system" as const,
};

describe("assumptionNumericSchema", () => {
  it("accepts percent unit with value 0–100", () => {
    const r = assumptionNumericSchema.safeParse({ unit: "percent", value: 18 });
    expect(r.success).toBe(true);
  });

  it("rejects a bare number without unit", () => {
    const r = assumptionNumericSchema.safeParse(18);
    expect(r.success).toBe(false);
  });

  it("rejects percent out of range", () => {
    expect(assumptionNumericSchema.safeParse({ unit: "percent", value: -1 }).success).toBe(
      false,
    );
    expect(assumptionNumericSchema.safeParse({ unit: "percent", value: 101 }).success).toBe(
      false,
    );
  });
});

describe("claimSchema", () => {
  it("accepts an assumption claim with structured numeric", () => {
    const r = claimSchema.safeParse({
      ...baseEntity,
      sessionId: "00000000-0000-4000-8000-000000000002",
      kind: ClaimKind.Assumption,
      statement: "Pilot adoption rate",
      numeric: { unit: "percent", value: 18 },
    });
    expect(r.success).toBe(true);
  });
});

describe("evidenceSchema", () => {
  const evidenceBase = {
    ...baseEntity,
    sessionId: "00000000-0000-4000-8000-000000000002",
    summary: "Competitor offers analytics module",
    externalId: "crustdata:co_123",
    vendor: "crustdata" as const,
  };

  it("requires retrievedAt", () => {
    const without = evidenceSchema.safeParse(evidenceBase);
    expect(without.success).toBe(false);

    const withRetrieved = evidenceSchema.safeParse({
      ...evidenceBase,
      retrievedAt: "2026-01-02T12:00:00.000Z",
    });
    expect(withRetrieved.success).toBe(true);
  });

  it("allows sourceTimeUnknown: true", () => {
    const r = evidenceSchema.safeParse({
      ...evidenceBase,
      retrievedAt: "2026-01-02T12:00:00.000Z",
      sourceTimeUnknown: true,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.sourceTimeUnknown).toBe(true);
    }
  });
});

describe("evidence vendor and quarantine", () => {
  it("requires vendor", () => {
    const r = evidenceSchema.safeParse({
      ...baseEntity,
      sessionId: "00000000-0000-4000-8000-000000000002",
      summary: "x",
      externalId: "co_1",
      retrievedAt: "2026-01-02T12:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  it("accepts demo_fixture vendor with fallback identityKey", () => {
    const r = evidenceSchema.safeParse({
      ...baseEntity,
      sessionId: "00000000-0000-4000-8000-000000000002",
      summary: "Illustrative: a comparable workflow vendor lists analytics as a product capability.",
      vendor: EvidenceVendor.DemoFixture,
      identityKey: "fallback:demo:00000000-0000-4000-8000-000000000002:competitor",
      retrievedAt: "2026-01-02T12:00:00.000Z",
      demandAdjacent: true,
    });
    expect(r.success).toBe(true);
  });

  it("quarantines rows that lack identity instead of rejecting them", () => {
    const r = evidenceSchema.safeParse({
      ...baseEntity,
      sessionId: "00000000-0000-4000-8000-000000000002",
      summary: "dropped",
      vendor: EvidenceVendor.Fallback,
      retrievedAt: "2026-01-02T12:00:00.000Z",
      quarantine: true,
    });
    expect(r.success).toBe(true);
  });

  it("rejects missing identity when not quarantined", () => {
    const r = evidenceSchema.safeParse({
      ...baseEntity,
      sessionId: "00000000-0000-4000-8000-000000000002",
      summary: "dropped",
      vendor: EvidenceVendor.Fallback,
      retrievedAt: "2026-01-02T12:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });
});
