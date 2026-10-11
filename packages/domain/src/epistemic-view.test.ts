import { describe, it, expect } from "vitest";
import { CLAIM_SAFETY_COPY } from "./epistemic";
import { findForbiddenPhrases } from "./forbidden-phrases";
import { ClaimKind } from "./contracts/enums";
import {
  ClaimOwner,
  ClaimRationaleTag,
  ClaimStatus,
} from "./contracts/claim";
import { EvidenceVendor } from "./contracts/evidence";
import {
  emptyEpistemicSnapshot,
  type EpistemicSnapshot,
} from "./contracts/epistemic-snapshot";
import {
  buildEpistemicViewModel,
  EMPTY_OBSERVED_COPY,
  vendorChipLabel,
} from "./epistemic-view";
import {
  DEMO_HYPOTHESIS_STATEMENT,
  DEMO_OBSERVED_SUMMARY,
  demoObservedIdentityKey,
} from "./project-intake-to-epistemic";

const SESSION = "00000000-0000-4000-8000-000000000002";
const NOW = "2026-10-12T00:00:00.000Z";
const OBSERVED_ID = "00000000-0000-4000-8000-000000000010";
const QUARANTINE_ID = "00000000-0000-4000-8000-000000000011";
const ASSUMPTION_ID = "00000000-0000-4000-8000-000000000050";
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000051";
const HYPOTHESIS_ID = "00000000-0000-4000-8000-000000000052";

function demoLikeSnapshot(): EpistemicSnapshot {
  const snap = emptyEpistemicSnapshot();
  snap.evidence = [
    {
      id: OBSERVED_ID,
      contractVersion: 1,
      createdAt: NOW,
      source: "system",
      sessionId: SESSION,
      summary: DEMO_OBSERVED_SUMMARY,
      vendor: EvidenceVendor.DemoFixture,
      identityKey: demoObservedIdentityKey(SESSION),
      demandAdjacent: true,
      retrievedAt: NOW,
    },
    {
      id: QUARANTINE_ID,
      contractVersion: 1,
      createdAt: NOW,
      source: "system",
      sessionId: SESSION,
      summary: "hidden row",
      vendor: EvidenceVendor.Fallback,
      retrievedAt: NOW,
      quarantine: true,
    },
  ];
  snap.claims = [
    {
      id: ASSUMPTION_ID,
      contractVersion: 1,
      createdAt: NOW,
      source: "user",
      sessionId: SESSION,
      kind: ClaimKind.Assumption,
      statement: "Pilot adoption",
      owner: ClaimOwner.User,
      status: ClaimStatus.Active,
      rationaleTag: ClaimRationaleTag.UserProvided,
      numeric: { unit: "percent", value: 18 },
      mapsTo: "adoption_rate",
    },
    {
      id: UNKNOWN_ID,
      contractVersion: 1,
      createdAt: NOW,
      source: "system",
      sessionId: SESSION,
      kind: ClaimKind.Unknown,
      statement: "WTP unknown",
      owner: ClaimOwner.System,
      status: ClaimStatus.Active,
    },
    {
      id: HYPOTHESIS_ID,
      contractVersion: 1,
      createdAt: NOW,
      source: "system",
      sessionId: SESSION,
      kind: ClaimKind.Hypothesis,
      statement: DEMO_HYPOTHESIS_STATEMENT,
      owner: ClaimOwner.DemoFixture,
      status: ClaimStatus.Active,
    },
  ];
  snap.inferences = [
    {
      statement: CLAIM_SAFETY_COPY.competitorNotDemand,
      refIds: [OBSERVED_ID],
    },
  ];
  return snap;
}

describe("vendorChipLabel", () => {
  it("maps vendors to frozen-page chips", () => {
    expect(vendorChipLabel(EvidenceVendor.DemoFixture)).toBe(
      "Illustrative example",
    );
    expect(vendorChipLabel(EvidenceVendor.Crustdata)).toBe(
      "Observed via Crustdata",
    );
    expect(vendorChipLabel(EvidenceVendor.Fallback)).toBe(
      "Fallback market context (not Crustdata)",
    );
  });
});

describe("buildEpistemicViewModel", () => {
  it("splits demo-like snapshot into view buckets", () => {
    const vm = buildEpistemicViewModel(demoLikeSnapshot());
    expect(vm.observed).toHaveLength(1);
    expect(vm.observed[0].summary).toBe(DEMO_OBSERVED_SUMMARY);
    expect(vm.observed[0].vendorChip).toBe("Illustrative example");
    expect(vm.observed[0].demandAdjacent).toBe(true);
    expect(vm.observed[0].disclaimer).toBe(
      CLAIM_SAFETY_COPY.competitorNotDemand,
    );
    expect(vm.quarantineWarning).toMatch(/1 evidence/);
    expect(vm.emptyObserved).toBe(false);
    expect(vm.assumptions).toHaveLength(1);
    expect(vm.unknowns).toHaveLength(1);
    expect(vm.hypotheses).toHaveLength(1);
    expect(vm.inferences).toHaveLength(1);
  });

  it("empty non-null snapshot → emptyObserved true, observed []", () => {
    const vm = buildEpistemicViewModel(emptyEpistemicSnapshot());
    expect(vm.emptyObserved).toBe(true);
    expect(vm.observed).toEqual([]);
    expect(vm.quarantineWarning).toBeNull();
  });

  it("null snapshot → emptyObserved false", () => {
    const vm = buildEpistemicViewModel(null);
    expect(vm.emptyObserved).toBe(false);
    expect(vm.observed).toEqual([]);
  });

  it("static copy does not trip forbidden phrases", () => {
    const strings = [
      EMPTY_OBSERVED_COPY,
      vendorChipLabel(EvidenceVendor.DemoFixture),
      vendorChipLabel(EvidenceVendor.Crustdata),
      vendorChipLabel(EvidenceVendor.Fallback),
      DEMO_OBSERVED_SUMMARY,
      CLAIM_SAFETY_COPY.competitorNotDemand,
    ];
    for (const s of strings) {
      expect(findForbiddenPhrases(s)).toEqual([]);
    }
    const vm = buildEpistemicViewModel(demoLikeSnapshot());
    expect(findForbiddenPhrases(vm.quarantineWarning ?? "")).toEqual([]);
  });
});
