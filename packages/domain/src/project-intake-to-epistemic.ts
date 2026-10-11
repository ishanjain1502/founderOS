import { EntitySource, newId } from "./contracts/base";
import {
  ClaimOwner,
  ClaimRationaleTag,
  ClaimResolution,
  ClaimStatus,
  type AssumptionNumeric,
  type Claim,
} from "./contracts/claim";
import type { EpistemicSnapshot } from "./contracts/epistemic-snapshot";
import { emptyEpistemicSnapshot } from "./contracts/epistemic-snapshot";
import { ClaimKind } from "./contracts/enums";
import { EvidenceVendor, type Evidence } from "./contracts/evidence";
import { FieldSource, type IntakeDraftPartial } from "./contracts/intake";
import { CLAIM_SAFETY_COPY } from "./epistemic";
import { RunMode } from "./run-mode";

export const DEMO_OBSERVED_SUMMARY =
  "Illustrative: a comparable workflow vendor lists analytics as a product capability.";
export const DEMO_HYPOTHESIS_STATEMENT =
  "Analytics may be strategically important for this product.";
export const WTP_UNKNOWN_STATEMENT =
  "Willingness to pay for this feature is unknown.";
export const DEMO_OBSERVED_KEY_SUFFIX = "competitor";

export function demoObservedIdentityKey(sessionId: string): string {
  return `fallback:demo:${sessionId}:${DEMO_OBSERVED_KEY_SUFFIX}`;
}

function ownerFromRationaleTag(
  tag: ClaimRationaleTag | undefined,
): ClaimOwner {
  if (tag === ClaimRationaleTag.DemoFixture) {
    return ClaimOwner.DemoFixture;
  }
  if (tag === ClaimRationaleTag.UserProvided) {
    return ClaimOwner.User;
  }
  return ClaimOwner.System;
}

function budgetOwnerFromFieldSource(
  source: FieldSource | undefined,
): ClaimOwner | null {
  if (source === FieldSource.ProvideLater) {
    return null;
  }
  if (source === FieldSource.DemoFixture) {
    return ClaimOwner.DemoFixture;
  }
  if (source === FieldSource.User) {
    return ClaimOwner.User;
  }
  if (source === FieldSource.SystemDefault) {
    return ClaimOwner.System;
  }
  return ClaimOwner.User;
}

function ownerFromFieldSource(source: FieldSource | undefined): ClaimOwner {
  if (source === FieldSource.DemoFixture) {
    return ClaimOwner.DemoFixture;
  }
  if (source === FieldSource.User) {
    return ClaimOwner.User;
  }
  return ClaimOwner.System;
}

function hasMapsTo(claims: Claim[], mapsTo: string): boolean {
  return claims.some(
    (c) => c.kind === ClaimKind.Assumption && c.mapsTo === mapsTo,
  );
}

function baseClaimFields(
  ctx: { sessionId: string; now: string },
  id: string,
): Pick<Claim, "id" | "contractVersion" | "createdAt" | "source" | "sessionId"> {
  return {
    id,
    contractVersion: 1,
    createdAt: ctx.now,
    source: EntitySource.System,
    sessionId: ctx.sessionId,
  };
}

export function projectIntakeToEpistemic(
  intake: IntakeDraftPartial,
  ctx: { mode: RunMode; sessionId: string; now: string },
): EpistemicSnapshot {
  const snap = emptyEpistemicSnapshot();
  const fieldSources = intake.fieldSources ?? {};

  for (const row of intake.assumptions ?? []) {
    const owner = ownerFromRationaleTag(row.rationaleTag);
    snap.claims.push({
      ...baseClaimFields(ctx, row.id),
      kind: ClaimKind.Assumption,
      statement: row.statement,
      numeric: row.numeric,
      rationaleTag: row.rationaleTag,
      mapsTo: row.mapsTo,
      status: ClaimStatus.Active,
      owner,
      locked: owner === ClaimOwner.DemoFixture,
    });
  }

  const budgetUsd = intake.constraints?.budgetUsd;
  if (
    typeof budgetUsd === "number" &&
    !hasMapsTo(snap.claims, "budget")
  ) {
    const owner = budgetOwnerFromFieldSource(
      fieldSources["constraints.budgetUsd"],
    );
    if (owner !== null) {
      snap.claims.push({
        ...baseClaimFields(ctx, newId()),
        kind: ClaimKind.Assumption,
        statement: `Budget cap is ${budgetUsd} USD (one-time).`,
        numeric: {
          unit: "money",
          value: budgetUsd,
          currency: "USD",
          period: "one_time",
        } satisfies AssumptionNumeric,
        mapsTo: "budget",
        rationaleTag: ClaimRationaleTag.SystemDefault,
        status: ClaimStatus.Active,
        owner,
        locked: owner === ClaimOwner.DemoFixture,
      });
    }
  }

  const executionMonths = intake.constraints?.executionMonths;
  if (
    typeof executionMonths === "number" &&
    !hasMapsTo(snap.claims, "execution_months")
  ) {
    const owner = ownerFromFieldSource(
      fieldSources["constraints.executionMonths"],
    );
    snap.claims.push({
      ...baseClaimFields(ctx, newId()),
      kind: ClaimKind.Assumption,
      statement: `Execution window: ${executionMonths} months.`,
      mapsTo: "execution_months",
      rationaleTag: ClaimRationaleTag.SystemDefault,
      status: ClaimStatus.Active,
      owner,
      locked: owner === ClaimOwner.DemoFixture,
    });
  }

  const financials = intake.financials;
  if (financials?.provideLater === true) {
    const missingUnknowns: Array<{ key: keyof typeof financials; statement: string }> =
      [
        { key: "cashUsd", statement: "Cash on hand not provided (provide later)." },
        {
          key: "customerCount",
          statement: "Customer count not provided (provide later).",
        },
        { key: "mrrUsd", statement: "MRR not provided (provide later)." },
        { key: "runwayMonths", statement: "Runway not provided (provide later)." },
      ];
    for (const { key, statement } of missingUnknowns) {
      if (financials[key] !== undefined) {
        continue;
      }
      snap.claims.push({
        ...baseClaimFields(ctx, newId()),
        kind: ClaimKind.Unknown,
        statement,
        rationaleTag: ClaimRationaleTag.MissingEvidence,
        status: ClaimStatus.Active,
        owner: ClaimOwner.User,
      });
    }
  } else if (financials) {
    if (
      typeof financials.cashUsd === "number" &&
      !hasMapsTo(snap.claims, "cash")
    ) {
      const owner = ownerFromFieldSource(fieldSources["financials.cashUsd"]);
      snap.claims.push({
        ...baseClaimFields(ctx, newId()),
        kind: ClaimKind.Assumption,
        statement: `Cash on hand is ${financials.cashUsd} USD.`,
        numeric: {
          unit: "money",
          value: financials.cashUsd,
          currency: "USD",
          period: "one_time",
        },
        mapsTo: "cash",
        rationaleTag: ClaimRationaleTag.UserProvided,
        status: ClaimStatus.Active,
        owner,
        locked: owner === ClaimOwner.DemoFixture,
      });
    }
    if (
      typeof financials.customerCount === "number" &&
      !hasMapsTo(snap.claims, "customer_count")
    ) {
      const owner = ownerFromFieldSource(fieldSources["financials.customerCount"]);
      snap.claims.push({
        ...baseClaimFields(ctx, newId()),
        kind: ClaimKind.Assumption,
        statement: `Customer count is ${financials.customerCount}.`,
        mapsTo: "customer_count",
        rationaleTag: ClaimRationaleTag.UserProvided,
        status: ClaimStatus.Active,
        owner,
        locked: owner === ClaimOwner.DemoFixture,
      });
    }
    if (
      typeof financials.mrrUsd === "number" &&
      !hasMapsTo(snap.claims, "mrr")
    ) {
      const owner = ownerFromFieldSource(fieldSources["financials.mrrUsd"]);
      snap.claims.push({
        ...baseClaimFields(ctx, newId()),
        kind: ClaimKind.Assumption,
        statement: `MRR is ${financials.mrrUsd} USD.`,
        numeric: {
          unit: "money",
          value: financials.mrrUsd,
          currency: "USD",
          period: "monthly",
        },
        mapsTo: "mrr",
        rationaleTag: ClaimRationaleTag.UserProvided,
        status: ClaimStatus.Active,
        owner,
        locked: owner === ClaimOwner.DemoFixture,
      });
    }
    if (
      typeof financials.runwayMonths === "number" &&
      !hasMapsTo(snap.claims, "runway")
    ) {
      const owner = ownerFromFieldSource(fieldSources["financials.runwayMonths"]);
      snap.claims.push({
        ...baseClaimFields(ctx, newId()),
        kind: ClaimKind.Assumption,
        statement: `Runway is ${financials.runwayMonths} months.`,
        mapsTo: "runway",
        rationaleTag: ClaimRationaleTag.UserProvided,
        status: ClaimStatus.Active,
        owner,
        locked: owner === ClaimOwner.DemoFixture,
      });
    }
  }

  if (typeof intake.feature?.proposedPriceUsd !== "number") {
    snap.claims.push({
      ...baseClaimFields(ctx, newId()),
      kind: ClaimKind.Unknown,
      statement: WTP_UNKNOWN_STATEMENT,
      rationaleTag: ClaimRationaleTag.MissingEvidence,
      status: ClaimStatus.Active,
      owner: ClaimOwner.User,
    });
  }

  if (ctx.mode === RunMode.Demo) {
    const evidence: Evidence = {
      ...baseClaimFields(ctx, newId()),
      summary: DEMO_OBSERVED_SUMMARY,
      vendor: EvidenceVendor.DemoFixture,
      identityKey: demoObservedIdentityKey(ctx.sessionId),
      demandAdjacent: true,
      retrievedAt: ctx.now,
      sessionId: ctx.sessionId,
    };
    snap.evidence.push(evidence);

    snap.claims.push({
      ...baseClaimFields(ctx, newId()),
      kind: ClaimKind.Hypothesis,
      statement: DEMO_HYPOTHESIS_STATEMENT,
      resolution: ClaimResolution.Open,
      owner: ClaimOwner.DemoFixture,
      locked: true,
      status: ClaimStatus.Active,
    });

    snap.inferences.push({
      statement: CLAIM_SAFETY_COPY.competitorNotDemand,
      refIds: [evidence.id],
    });
  }

  return snap;
}
