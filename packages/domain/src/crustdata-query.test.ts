import { describe, it, expect } from "vitest";
import { RunMode } from "./run-mode";
import { buildCrustdataQuery } from "./crustdata-query";
import { epistemicSnapshotSchema, emptyEpistemicSnapshot } from "./contracts/epistemic-snapshot";

describe("buildCrustdataQuery", () => {
  it("uses demoHint in Demo mode", () => {
    const r = buildCrustdataQuery({
      mode: RunMode.Demo,
      demoHint: "B2B SaaS workflow software companies offering analytics or business intelligence for SMB and mid-market.",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.query).toContain("workflow software");
    }
  });

  it("rejects empty demoHint", () => {
    expect(buildCrustdataQuery({ mode: RunMode.Demo, demoHint: "  " }).ok).toBe(false);
  });

  it("expands Full template from category and feature", () => {
    const r = buildCrustdataQuery({
      mode: RunMode.Full,
      category: "Workflow / project operations SaaS",
      featureTitle: "AI analytics",
      featureDescription: "Premium add-on dashboards for mid-market teams",
      geography: "US",
      competitors: ["Acme Analytics"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.query).toContain("Workflow / project operations SaaS");
      expect(r.query).toContain("AI analytics");
      expect(r.query).toContain("US");
      expect(r.query).toContain("Acme Analytics");
    }
  });
});

describe("marketResearch default", () => {
  it("accepts snapshot without marketResearch", () => {
    expect(epistemicSnapshotSchema.safeParse(emptyEpistemicSnapshot()).success).toBe(true);
  });

  it("accepts crustdata ran metadata", () => {
    const snap = emptyEpistemicSnapshot();
    snap.marketResearch = {
      crustdata: {
        status: "ran",
        query: "B2B SaaS",
        ranAt: "2026-10-12T00:00:00.000Z",
        httpCallCount: 2,
        usedFallback: false,
        sourceMode: "recorded",
      },
    };
    expect(epistemicSnapshotSchema.safeParse(snap).success).toBe(true);
  });
});
