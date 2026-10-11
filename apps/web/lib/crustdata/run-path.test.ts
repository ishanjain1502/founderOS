import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
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
import { CrustdataAuthError } from "./errors";
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
