import { CLAIM_SAFETY_COPY } from "./epistemic";
import { ClaimKind } from "./contracts/enums";
import type { AssumptionNumeric, Claim } from "./contracts/claim";
import type { Evidence } from "./contracts/evidence";
import { EvidenceVendor } from "./contracts/evidence";
import type { EpistemicSnapshot } from "./contracts/epistemic-snapshot";

export const EMPTY_OBSERVED_COPY = "No observed market evidence yet.";

export function vendorChipLabel(vendor: EvidenceVendor): string {
  switch (vendor) {
    case EvidenceVendor.DemoFixture:
      return "Illustrative example";
    case EvidenceVendor.Crustdata:
      return "Observed via Crustdata";
    case EvidenceVendor.Fallback:
      return "Fallback market context (not Crustdata)";
    default: {
      const _exhaustive: never = vendor;
      return _exhaustive;
    }
  }
}

export type ObservedRowView = {
  summary: string;
  retrievedAt: string;
  vendorChip: string;
  demandAdjacent: boolean;
  disclaimer: string | null;
};

export type AssumptionRowView = {
  statement: string;
  owner: string;
  rationaleTag: string | null;
  numeric: AssumptionNumeric | null;
};

export type StatementRowView = {
  statement: string;
};

export type EpistemicViewModel = {
  observed: ObservedRowView[];
  assumptions: AssumptionRowView[];
  unknowns: StatementRowView[];
  hypotheses: StatementRowView[];
  inferences: StatementRowView[];
  emptyObserved: boolean;
  quarantineWarning: string | null;
};

function mapObserved(row: Evidence): ObservedRowView {
  const demandAdjacent = row.demandAdjacent === true;
  return {
    summary: row.summary,
    retrievedAt: row.retrievedAt,
    vendorChip: vendorChipLabel(row.vendor),
    demandAdjacent,
    disclaimer: demandAdjacent
      ? CLAIM_SAFETY_COPY.competitorNotDemand
      : null,
  };
}

function mapAssumption(claim: Extract<Claim, { kind: ClaimKind.Assumption }>): AssumptionRowView {
  return {
    statement: claim.statement,
    owner: claim.owner,
    rationaleTag: claim.rationaleTag ?? null,
    numeric: claim.numeric ?? null,
  };
}

export function buildEpistemicViewModel(
  snapshot: EpistemicSnapshot | null,
): EpistemicViewModel {
  if (snapshot === null) {
    return {
      observed: [],
      assumptions: [],
      unknowns: [],
      hypotheses: [],
      inferences: [],
      emptyObserved: false,
      quarantineWarning: null,
    };
  }

  const quarantinedCount = snapshot.evidence.filter(
    (row) => row.quarantine === true,
  ).length;
  const observed = snapshot.evidence
    .filter((row) => row.quarantine !== true)
    .map(mapObserved);

  const assumptions = snapshot.claims
    .filter((c): c is Extract<Claim, { kind: ClaimKind.Assumption }> =>
      c.kind === ClaimKind.Assumption,
    )
    .map(mapAssumption);

  const unknowns = snapshot.claims
    .filter((c) => c.kind === ClaimKind.Unknown)
    .map((c) => ({ statement: c.statement }));

  const hypotheses = snapshot.claims
    .filter((c) => c.kind === ClaimKind.Hypothesis)
    .map((c) => ({ statement: c.statement }));

  const inferences = snapshot.inferences.map((inf) => ({
    statement: inf.statement,
  }));

  return {
    observed,
    assumptions,
    unknowns,
    hypotheses,
    inferences,
    emptyObserved: observed.length === 0,
    quarantineWarning:
      quarantinedCount > 0
        ? `${quarantinedCount} evidence item(s) hidden (missing identity).`
        : null,
  };
}
