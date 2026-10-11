import { describe, it, expect } from "vitest";
import { CLAIM_SAFETY_COPY } from "../epistemic";
import {
  emptyEpistemicSnapshot,
  epistemicSnapshotSchema,
  epistemicWarnings,
  validateEpistemicSnapshot,
} from "./epistemic-snapshot";

describe("emptyEpistemicSnapshot", () => {
  it("is a valid empty snapshot", () => {
    const empty = emptyEpistemicSnapshot();
    expect(epistemicSnapshotSchema.safeParse(empty).success).toBe(true);
    expect(empty.contractVersion).toBe(1);
    expect(empty.evidence).toEqual([]);
    expect(empty.claims).toEqual([]);
    expect(empty.inferences).toEqual([]);
  });
});

describe("validateEpistemicSnapshot", () => {
  it("fails when inference refIds do not resolve", () => {
    const snapshot = emptyEpistemicSnapshot();
    snapshot.inferences = [
      {
        statement: CLAIM_SAFETY_COPY.competitorNotDemand,
        refIds: ["00000000-0000-4000-8000-000000000001"],
      },
    ];
    const result = validateEpistemicSnapshot(snapshot);
    expect(result.ok).toBe(false);
    expect(result.errors["inferences.0.refIds"]).toBeDefined();
  });

  it("lists quarantined ids", () => {
    const snapshot = emptyEpistemicSnapshot();
    snapshot.evidence = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        contractVersion: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        source: "system",
        sessionId: "00000000-0000-4000-8000-000000000002",
        summary: "hidden",
        vendor: "fallback",
        retrievedAt: "2026-01-01T00:00:00.000Z",
        quarantine: true,
      },
    ];
    const result = validateEpistemicSnapshot(snapshot);
    expect(result.ok).toBe(true);
    expect(result.quarantinedIds).toEqual(["00000000-0000-4000-8000-000000000001"]);
  });
});

describe("epistemicWarnings", () => {
  it("warns when quarantined count > 0", () => {
    const snapshot = emptyEpistemicSnapshot();
    snapshot.evidence.push({
      id: "00000000-0000-4000-8000-000000000001",
      contractVersion: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      source: "system",
      sessionId: "00000000-0000-4000-8000-000000000002",
      summary: "hidden",
      vendor: "fallback",
      retrievedAt: "2026-01-01T00:00:00.000Z",
      quarantine: true,
    });
    expect(epistemicWarnings(snapshot).some((w) => /hidden/i.test(w.message))).toBe(true);
  });
});
