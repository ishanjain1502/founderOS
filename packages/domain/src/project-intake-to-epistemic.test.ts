import { describe, it, expect } from "vitest";
import { CLAIM_SAFETY_COPY } from "./epistemic";
import { findForbiddenPhrases } from "./forbidden-phrases";
import { RunMode } from "./run-mode";
import { ClaimKind } from "./contracts/enums";
import { ClaimOwner } from "./contracts/claim";
import { emptyIntakeDraft, FieldSource } from "./contracts/intake";
import {
  DEMO_HYPOTHESIS_STATEMENT,
  DEMO_OBSERVED_SUMMARY,
  WTP_UNKNOWN_STATEMENT,
  demoObservedIdentityKey,
  projectIntakeToEpistemic,
} from "./project-intake-to-epistemic";
import { validateEpistemicSnapshot } from "./contracts/epistemic-snapshot";

const SESSION = "00000000-0000-4000-8000-000000000002";
const NOW = "2026-10-12T00:00:00.000Z";
const ASSUMPTION_ID = "00000000-0000-4000-8000-000000000050";

function completeIntake(mode: RunMode) {
  const d = emptyIntakeDraft(mode);
  d.company = {
    name: "Acme",
    productSummary: "B2B SaaS",
    category: "Workflow",
    primaryBuyer: "Ops lead",
    jobToBeDone: "Track work",
    deliveryModel: "saas",
    sizeBand: "mid",
  };
  d.market = { targetMarketBehavior: "SMB and enterprise buyers" };
  d.constraints = { budgetUsd: 1000, executionMonths: 3 };
  d.feature = { description: "AI add-on", changeType: "feature" };
  d.decision = { questionText: "Should we launch it?" };
  d.financials = { provideLater: true };
  d.assumptions = [
    {
      id: ASSUMPTION_ID,
      statement: "Pilot adoption",
      numeric: { unit: "percent", value: 18 },
      rationaleTag: "user_provided",
      mapsTo: "adoption_rate",
    },
  ];
  return d;
}

describe("projectIntakeToEpistemic", () => {
  it("Full: no Observed, preserves assumption ids, provideLater → Unknown, always WTP Unknown", () => {
    const snap = projectIntakeToEpistemic(completeIntake(RunMode.Full), {
      mode: RunMode.Full,
      sessionId: SESSION,
      now: NOW,
    });
    expect(validateEpistemicSnapshot(snap).ok).toBe(true);
    expect(snap.evidence).toEqual([]);
    expect(snap.inferences).toEqual([]);
    expect(snap.claims.some((c) => c.id === ASSUMPTION_ID && c.kind === ClaimKind.Assumption)).toBe(true);
    const unknowns = snap.claims.filter((c) => c.kind === ClaimKind.Unknown);
    expect(unknowns.some((c) => c.statement === WTP_UNKNOWN_STATEMENT)).toBe(true);
    expect(unknowns.some((c) => /cash/i.test(c.statement))).toBe(true);
    expect(snap.claims.some((c) => c.kind === ClaimKind.Assumption && /budget/i.test(c.statement))).toBe(true);
  });

  it("Demo: illustrative Observed, hypothesis, demand disclaimer; vendor is not crustdata", () => {
    const snap = projectIntakeToEpistemic(completeIntake(RunMode.Demo), {
      mode: RunMode.Demo,
      sessionId: SESSION,
      now: NOW,
    });
    expect(validateEpistemicSnapshot(snap).ok).toBe(true);
    expect(snap.evidence).toHaveLength(1);
    const ev = snap.evidence[0];
    expect(ev.vendor).toBe("demo_fixture");
    expect(ev.vendor).not.toBe("crustdata");
    expect(ev.identityKey).toBe(demoObservedIdentityKey(SESSION));
    expect(ev.demandAdjacent).toBe(true);
    expect(ev.summary).toBe(DEMO_OBSERVED_SUMMARY);
    expect(ev.retrievedAt).toBe(NOW);
    expect(snap.claims.some((c) => c.kind === ClaimKind.Hypothesis && c.statement === DEMO_HYPOTHESIS_STATEMENT)).toBe(true);
    expect(snap.inferences).toEqual([
      { statement: CLAIM_SAFETY_COPY.competitorNotDemand, refIds: [ev.id] },
    ]);
    expect(findForbiddenPhrases(ev.summary)).toEqual([]);
    expect(findForbiddenPhrases(DEMO_HYPOTHESIS_STATEMENT)).toEqual([]);
  });

  it("maps user budget fieldSource to claim owner user", () => {
    const intake = completeIntake(RunMode.Full);
    intake.fieldSources = {
      ...intake.fieldSources,
      "constraints.budgetUsd": FieldSource.User,
    };
    const snap = projectIntakeToEpistemic(intake, {
      mode: RunMode.Full,
      sessionId: SESSION,
      now: NOW,
    });
    const budget = snap.claims.find(
      (c) => c.kind === ClaimKind.Assumption && c.mapsTo === "budget",
    );
    expect(budget).toBeDefined();
    expect(budget!.owner).toBe(ClaimOwner.User);
  });

  it("does not emit WTP Unknown when proposedPriceUsd is set", () => {
    const intake = completeIntake(RunMode.Full);
    intake.feature = { ...intake.feature!, proposedPriceUsd: 20, proposedPricePeriod: "monthly" };
    const snap = projectIntakeToEpistemic(intake, {
      mode: RunMode.Full,
      sessionId: SESSION,
      now: NOW,
    });
    expect(snap.claims.some((c) => c.statement === WTP_UNKNOWN_STATEMENT)).toBe(false);
  });

  it("does not emit WTP Unknown when a price_per_seat assumption exists", () => {
    const intake = completeIntake(RunMode.Demo);
    intake.assumptions = [
      ...(intake.assumptions ?? []),
      {
        id: "00000000-0000-4000-8000-000000000051",
        statement: "Price per seat",
        numeric: { unit: "usd", value: 25 },
        rationaleTag: "demo_fixture",
        mapsTo: "price_per_seat",
      },
    ];
    const snap = projectIntakeToEpistemic(intake, {
      mode: RunMode.Demo,
      sessionId: SESSION,
      now: NOW,
    });
    expect(snap.claims.some((c) => c.statement === WTP_UNKNOWN_STATEMENT)).toBe(false);
  });
});
