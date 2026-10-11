import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  CLAIM_SAFETY_COPY,
  emptyEpistemicSnapshot,
  emptyIntakeDraft,
  EvidenceVendor,
  RunMode,
  validateEpistemicSnapshot,
  type CrustdataCompany,
  type EpistemicSnapshot,
} from "@ceo-sandbox/domain";
import { EntitySource } from "@ceo-sandbox/domain/server";
import { createFixtureAdapter } from "./adapter";
import { CrustdataAuthError, CrustdataTransportError } from "./errors";
import { runCrustdataResearchPath } from "./run-path";
import type { CrustdataAdapter } from "./types";

const SESSION = "00000000-0000-4000-8000-000000000002";
const NOW = "2026-10-12T00:00:00.000Z";
const fixtureRoot = join(process.cwd(), "../../fixtures/crustdata");

function completeFullIntake() {
  const d = emptyIntakeDraft(RunMode.Full);
  d.company = {
    name: "Acme",
    productSummary: "B2B SaaS",
    category: "Workflow",
    primaryBuyer: "Ops lead",
    jobToBeDone: "Track work",
    deliveryModel: "saas",
    sizeBand: "mid",
  };
  d.feature = {
    title: "AI analytics",
    description: "Premium analytics layer",
    changeType: "feature",
  };
  d.decision = { questionText: "Should we launch it?" };
  return d;
}

function baseInput(snapshot: EpistemicSnapshot, adapter: CrustdataAdapter) {
  return {
    snapshot,
    intake: completeFullIntake(),
    sessionId: SESSION,
    now: NOW,
    mode: RunMode.Full,
    adapter,
    enrichEnabled: false,
    fallbackCompanies: [] as CrustdataCompany[],
    writeRaw: vi.fn(),
    nowMs: () => 0,
    deadlineMs: Number.MAX_SAFE_INTEGER,
  };
}

describe("runCrustdataResearchPath", () => {
  it("fixture adapter maps 3 crustdata evidence rows with recorded sourceMode", async () => {
    const adapter = createFixtureAdapter(fixtureRoot);
    const input = baseInput(emptyEpistemicSnapshot(), adapter);
    const { snapshot } = await runCrustdataResearchPath(input);

    expect(snapshot.evidence).toHaveLength(3);
    expect(snapshot.evidence.every((e) => e.vendor === EvidenceVendor.Crustdata)).toBe(
      true,
    );
    expect(snapshot.marketResearch?.crustdata.status).toBe("ran");
    expect(snapshot.marketResearch?.crustdata.sourceMode).toBe("recorded");
    expect(snapshot.marketResearch?.crustdata.usedFallback).toBe(false);
    expect(validateEpistemicSnapshot(snapshot).ok).toBe(true);
  });

  it("preserves pre-seeded demo_fixture evidence", async () => {
    const demoId = "00000000-0000-4000-8000-000000000099";
    const snap = emptyEpistemicSnapshot();
    snap.evidence.push({
      id: demoId,
      contractVersion: 1,
      createdAt: NOW,
      source: EntitySource.System,
      sessionId: SESSION,
      summary: "Illustrative demo row",
      vendor: EvidenceVendor.DemoFixture,
      identityKey: `fallback:demo:${SESSION}:competitor`,
      demandAdjacent: true,
      retrievedAt: NOW,
    });

    const adapter = createFixtureAdapter(fixtureRoot);
    const { snapshot } = await runCrustdataResearchPath(baseInput(snap, adapter));

    expect(snapshot.evidence).toHaveLength(4);
    expect(snapshot.evidence.some((e) => e.id === demoId)).toBe(true);
  });

  it("second invocation is idempotent when status is ran", async () => {
    const adapter = createFixtureAdapter(fixtureRoot);
    const first = await runCrustdataResearchPath(
      baseInput(emptyEpistemicSnapshot(), adapter),
    );
    const second = await runCrustdataResearchPath(
      baseInput(first.snapshot, adapter),
    );
    expect(second.snapshot.evidence).toHaveLength(first.snapshot.evidence.length);
    expect(second.snapshot.marketResearch?.crustdata.status).toBe("ran");
  });

  it("auth failure uses fallback vendor and status fallback", async () => {
    const adapter: CrustdataAdapter = {
      kind: "live",
      identify: vi.fn(),
      search: vi.fn(async () => {
        throw new CrustdataAuthError();
      }),
      enrich: vi.fn(),
    };
    const fallbackCompanies: CrustdataCompany[] = [
      {
        crustdataCompanyId: "fb-1",
        name: "Fallback Co",
        fieldPaths: ["basic_info.name"],
        raw: {},
      },
    ];
    const { snapshot } = await runCrustdataResearchPath({
      ...baseInput(emptyEpistemicSnapshot(), adapter),
      fallbackCompanies,
    });

    expect(snapshot.marketResearch?.crustdata.status).toBe("fallback");
    expect(snapshot.marketResearch?.crustdata.sourceMode).toBe("fallback");
    expect(snapshot.marketResearch?.crustdata.usedFallback).toBe(true);
    expect(snapshot.evidence).toHaveLength(1);
    expect(snapshot.evidence[0]?.vendor).toBe(EvidenceVendor.Fallback);
  });

  it("query build failure leaves failed status with no fallback evidence", async () => {
    const intake = completeFullIntake();
    intake.company = { ...intake.company!, category: "" };
    const adapter: CrustdataAdapter = {
      kind: "live",
      identify: vi.fn(),
      search: vi.fn(),
      enrich: vi.fn(),
    };
    const { snapshot } = await runCrustdataResearchPath({
      ...baseInput(emptyEpistemicSnapshot(), adapter),
      intake,
    });

    expect(snapshot.marketResearch?.crustdata.status).toBe("failed");
    expect(snapshot.marketResearch?.crustdata.httpCallCount).toBe(0);
    expect(snapshot.marketResearch?.crustdata.usedFallback).toBe(false);
    expect(snapshot.evidence).toHaveLength(0);
    expect(adapter.search).not.toHaveBeenCalled();
  });

  it("refines with category search when first search returns no ids", async () => {
    const refined: CrustdataCompany[] = [
      {
        crustdataCompanyId: "refined-1",
        name: "Refined Co",
        fieldPaths: ["basic_info.name"],
        raw: {},
      },
    ];
    const search = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(refined);
    const adapter: CrustdataAdapter = {
      kind: "live",
      identify: vi.fn(async () => null),
      search,
      enrich: vi.fn(),
    };
    const { snapshot } = await runCrustdataResearchPath(
      baseInput(emptyEpistemicSnapshot(), adapter),
    );

    expect(search).toHaveBeenCalledTimes(2);
    expect(snapshot.evidence).toHaveLength(1);
    expect(snapshot.marketResearch?.crustdata.status).toBe("ran");
  });

  it("stops enrich when deadline passes after search", async () => {
    const companies: CrustdataCompany[] = Array.from({ length: 5 }, (_, i) => ({
      crustdataCompanyId: `co-${i}`,
      name: `Company ${i}`,
      fieldPaths: ["basic_info.name"],
      raw: {},
    }));
    let pastDeadline = false;
    const enrich = vi.fn(async (id: string) => ({
      crustdataCompanyId: id,
      name: `Enriched ${id}`,
      fieldPaths: ["basic_info.name"],
      raw: {},
    }));
    const adapter: CrustdataAdapter = {
      kind: "live",
      identify: vi.fn(async () => null),
      search: vi.fn(async () => {
        pastDeadline = true;
        return companies;
      }),
      enrich,
    };
    const intake = completeFullIntake();
    intake.company = { ...intake.company!, domain: "acme.test" };
    const { snapshot } = await runCrustdataResearchPath({
      ...baseInput(emptyEpistemicSnapshot(), adapter),
      intake,
      enrichEnabled: true,
      nowMs: () => (pastDeadline ? 2000 : 0),
      deadlineMs: 1000,
    });

    expect(enrich).not.toHaveBeenCalled();
    expect(snapshot.evidence).toHaveLength(5);
    expect(snapshot.marketResearch?.crustdata.httpCallCount).toBe(2);
  });

  it("adds competitorNotDemand inference for demand-adjacent evidence", async () => {
    const adapter: CrustdataAdapter = {
      kind: "live",
      identify: vi.fn(async () => null),
      search: vi.fn(async () => [
        {
          crustdataCompanyId: "demand-1",
          name: "Product Co",
          fieldPaths: ["basic_info.description"],
          raw: {},
        },
      ]),
      enrich: vi.fn(),
    };
    const { snapshot } = await runCrustdataResearchPath(
      baseInput(emptyEpistemicSnapshot(), adapter),
    );

    expect(snapshot.evidence[0]?.demandAdjacent).toBe(true);
    expect(snapshot.inferences).toEqual([
      {
        statement: CLAIM_SAFETY_COPY.competitorNotDemand,
        refIds: [snapshot.evidence[0]!.id],
      },
    ]);
  });

  it("transport failure uses fallback; programming errors propagate", async () => {
    const fallbackCompanies: CrustdataCompany[] = [
      {
        crustdataCompanyId: "fb-1",
        name: "Fallback Co",
        fieldPaths: ["basic_info.name"],
        raw: {},
      },
    ];
    const transportAdapter: CrustdataAdapter = {
      kind: "live",
      identify: vi.fn(),
      search: vi.fn(async () => {
        throw new CrustdataTransportError("network down");
      }),
      enrich: vi.fn(),
    };
    const transportResult = await runCrustdataResearchPath({
      ...baseInput(emptyEpistemicSnapshot(), transportAdapter),
      fallbackCompanies,
    });
    expect(transportResult.snapshot.marketResearch?.crustdata.status).toBe(
      "fallback",
    );

    const bugAdapter: CrustdataAdapter = {
      kind: "live",
      identify: vi.fn(),
      search: vi.fn(async () => {
        throw new Error("mapping_bug");
      }),
      enrich: vi.fn(),
    };
    await expect(
      runCrustdataResearchPath(baseInput(emptyEpistemicSnapshot(), bugAdapter)),
    ).rejects.toThrow("mapping_bug");
  });

  it("caps mapped companies at 5", async () => {
    const many: CrustdataCompany[] = Array.from({ length: 10 }, (_, i) => ({
      crustdataCompanyId: `co-${i}`,
      name: `Company ${i}`,
      fieldPaths: ["basic_info.name"],
      raw: {},
    }));
    const adapter: CrustdataAdapter = {
      kind: "live",
      identify: vi.fn(async () => null),
      search: vi.fn(async () => many),
      enrich: vi.fn(),
    };
    const { snapshot } = await runCrustdataResearchPath(
      baseInput(emptyEpistemicSnapshot(), adapter),
    );
    expect(snapshot.evidence).toHaveLength(5);
  });
});
