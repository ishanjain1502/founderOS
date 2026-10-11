import {
  buildCrustdataQuery,
  CLAIM_SAFETY_COPY,
  EvidenceVendor,
  mapCrustdataCompanyToEvidence,
  RunMode,
  shouldProposeAnalyticsHypothesis,
  validateEpistemicSnapshot,
  type CrustdataCompany,
  type EpistemicSnapshot,
  type IntakeDraftPartial,
} from "@ceo-sandbox/domain";
import {
  ClaimKind,
  ClaimOwner,
  ClaimRationaleTag,
  ClaimResolution,
  ClaimStatus,
  EntitySource,
  newId,
} from "@ceo-sandbox/domain/server";
import {
  CrustdataAuthError,
  CrustdataClientError,
  CrustdataTransportError,
} from "./errors";
import type { CrustdataAdapter } from "./types";

const MAX_COMPANIES = 5;
const MAX_LOGICAL_CALLS = 8;
const ANALYTICS_HYPOTHESIS =
  "Several searched companies list analytics-related product language.";
const EMPTY_SEARCH_UNKNOWN =
  "No companies returned by Crustdata.";

export type RunCrustdataResearchPathInput = {
  snapshot: EpistemicSnapshot;
  intake: IntakeDraftPartial;
  sessionId: string;
  now: string;
  mode: RunMode;
  demoHint?: string;
  adapter: CrustdataAdapter;
  enrichEnabled: boolean;
  fallbackCompanies: CrustdataCompany[];
  writeRaw: (ref: string, raw: unknown) => void;
  nowMs: () => number;
  deadlineMs: number;
};

function cloneSnapshot(snapshot: EpistemicSnapshot): EpistemicSnapshot {
  return structuredClone(snapshot);
}

function truncateError(message: string): string {
  return message.length <= 200 ? message : message.slice(0, 200);
}

function assertValidSnapshot(snapshot: EpistemicSnapshot): void {
  const result = validateEpistemicSnapshot(snapshot);
  if (!result.ok) {
    throw new Error(
      `invalid_epistemic_snapshot: ${JSON.stringify(result.errors)}`,
    );
  }
}

function inferenceAlreadyReferences(
  snapshot: EpistemicSnapshot,
  evidenceId: string,
): boolean {
  return snapshot.inferences.some((inf) => inf.refIds.includes(evidenceId));
}

function hasHypothesisStatement(snapshot: EpistemicSnapshot): boolean {
  return snapshot.claims.some(
    (c) =>
      c.kind === ClaimKind.Hypothesis && c.statement === ANALYTICS_HYPOTHESIS,
  );
}

function baseClaimFields(sessionId: string, now: string, id: string) {
  return {
    id,
    contractVersion: 1 as const,
    createdAt: now,
    source: EntitySource.System,
    sessionId,
  };
}

function competitorAssumptionStatement(name: string): string {
  return `User-named competitor ${name} not found in Crustdata.`;
}

function domainIdentifyGapStatement(domain: string): string {
  return `Crustdata identify did not confirm company domain ${domain}.`;
}

function applyFailed(
  out: EpistemicSnapshot,
  query: string,
  httpCallCount: number,
  error: string,
): void {
  out.marketResearch = {
    crustdata: {
      status: "failed",
      query,
      httpCallCount,
      usedFallback: false,
      sourceMode: "none",
      error: truncateError(error),
    },
  };
}

function applyFallback(
  out: EpistemicSnapshot,
  query: string,
  fallbackCompanies: CrustdataCompany[],
  sessionId: string,
  now: string,
  writeRaw: (ref: string, raw: unknown) => void,
  httpCallCount: number,
  error?: string,
): void {
  const sourceMode = "fallback" as const;
  for (const company of fallbackCompanies.slice(0, MAX_COMPANIES)) {
    const evidence = mapCrustdataCompanyToEvidence(company, {
      sessionId,
      now,
      vendor: EvidenceVendor.Fallback,
      sourceMode,
    });
    if (evidence.rawPayloadRef) {
      writeRaw(evidence.rawPayloadRef, company.raw);
    }
    out.evidence.push(evidence);
    if (evidence.demandAdjacent && !inferenceAlreadyReferences(out, evidence.id)) {
      out.inferences.push({
        statement: CLAIM_SAFETY_COPY.competitorNotDemand,
        refIds: [evidence.id],
      });
    }
  }
  out.marketResearch = {
    crustdata: {
      status: "fallback",
      query,
      ranAt: now,
      httpCallCount,
      usedFallback: true,
      sourceMode: "fallback",
      ...(error ? { error: truncateError(error) } : {}),
    },
  };
}

function applySuccessMetadata(
  out: EpistemicSnapshot,
  query: string,
  now: string,
  httpCallCount: number,
  sourceMode: "live" | "recorded",
): void {
  out.marketResearch = {
    crustdata: {
      status: "ran",
      query,
      ranAt: now,
      httpCallCount,
      usedFallback: false,
      sourceMode,
    },
  };
}

function appendMappedCompanies(
  out: EpistemicSnapshot,
  companies: CrustdataCompany[],
  sessionId: string,
  now: string,
  vendor: EvidenceVendor.Crustdata | EvidenceVendor.Fallback,
  sourceMode: "live" | "recorded" | "fallback",
  writeRaw: (ref: string, raw: unknown) => void,
): string[] {
  const summaries: string[] = [];
  for (const company of companies) {
    const evidence = mapCrustdataCompanyToEvidence(company, {
      sessionId,
      now,
      vendor,
      sourceMode,
    });
    if (evidence.rawPayloadRef) {
      writeRaw(evidence.rawPayloadRef, company.raw);
    }
    out.evidence.push(evidence);
    summaries.push(evidence.summary);
    if (evidence.demandAdjacent && !inferenceAlreadyReferences(out, evidence.id)) {
      out.inferences.push({
        statement: CLAIM_SAFETY_COPY.competitorNotDemand,
        refIds: [evidence.id],
      });
    }
  }
  return summaries;
}

function appendSingleMappedCompany(
  out: EpistemicSnapshot,
  company: CrustdataCompany,
  sessionId: string,
  now: string,
  vendor: EvidenceVendor.Crustdata,
  sourceMode: "live" | "recorded",
  writeRaw: (ref: string, raw: unknown) => void,
): string {
  const [summary] = appendMappedCompanies(
    out,
    [company],
    sessionId,
    now,
    vendor,
    sourceMode,
    writeRaw,
  );
  return summary ?? "";
}

function maybeAppendAnalyticsHypothesis(
  out: EpistemicSnapshot,
  crustdataSummaries: string[],
  sessionId: string,
  now: string,
): void {
  if (!shouldProposeAnalyticsHypothesis(crustdataSummaries)) {
    return;
  }
  if (hasHypothesisStatement(out)) {
    return;
  }
  out.claims.push({
    ...baseClaimFields(sessionId, now, newId()),
    kind: ClaimKind.Hypothesis,
    statement: ANALYTICS_HYPOTHESIS,
    resolution: ClaimResolution.Open,
    rationaleTag: ClaimRationaleTag.MissingEvidence,
    owner: ClaimOwner.System,
    status: ClaimStatus.Active,
  });
}

function maybeAppendEmptySearchUnknown(
  out: EpistemicSnapshot,
  sessionId: string,
  now: string,
  mappedCount: number,
): void {
  if (mappedCount > 0) {
    return;
  }
  if (out.claims.some((c) => c.statement === EMPTY_SEARCH_UNKNOWN)) {
    return;
  }
  out.claims.push({
    ...baseClaimFields(sessionId, now, newId()),
    kind: ClaimKind.Unknown,
    statement: EMPTY_SEARCH_UNKNOWN,
    rationaleTag: ClaimRationaleTag.MissingEvidence,
    owner: ClaimOwner.System,
    status: ClaimStatus.Active,
  });
}

function appendDomainIdentifyGap(
  out: EpistemicSnapshot,
  domain: string,
  sessionId: string,
  now: string,
): void {
  const statement = domainIdentifyGapStatement(domain);
  if (out.claims.some((c) => c.statement === statement)) {
    return;
  }
  out.claims.push({
    ...baseClaimFields(sessionId, now, newId()),
    kind: ClaimKind.Unknown,
    statement,
    rationaleTag: ClaimRationaleTag.MissingEvidence,
    owner: ClaimOwner.System,
    status: ClaimStatus.Active,
  });
}

function appendCompetitorAssumption(
  out: EpistemicSnapshot,
  name: string,
  sessionId: string,
  now: string,
): void {
  const statement = competitorAssumptionStatement(name);
  if (out.claims.some((c) => c.statement === statement)) {
    return;
  }
  out.claims.push({
    ...baseClaimFields(sessionId, now, newId()),
    kind: ClaimKind.Assumption,
    statement,
    rationaleTag: ClaimRationaleTag.UserProvided,
    owner: ClaimOwner.User,
    status: ClaimStatus.Active,
  });
}

function canIssueCall(
  logicalCalls: number,
  nowMs: () => number,
  deadlineMs: number,
): boolean {
  return logicalCalls < MAX_LOGICAL_CALLS && nowMs() <= deadlineMs;
}

function placeholderCompany(id: string, label: string): CrustdataCompany {
  return {
    crustdataCompanyId: id,
    name: label,
    fieldPaths: [],
    raw: { crustdataCompanyId: id },
  };
}

export async function runCrustdataResearchPath(
  input: RunCrustdataResearchPathInput,
): Promise<{ snapshot: EpistemicSnapshot }> {
  const out = cloneSnapshot(input.snapshot);
  const existingStatus = out.marketResearch?.crustdata?.status;
  if (existingStatus === "ran" || existingStatus === "fallback") {
    assertValidSnapshot(out);
    return { snapshot: out };
  }

  const queryResult = buildCrustdataQuery({
    mode: input.mode,
    category: input.intake.company?.category,
    featureTitle: input.intake.feature?.title,
    featureDescription: input.intake.feature?.description,
    geography: input.intake.company?.geography,
    competitors: input.intake.company?.competitors,
    demoHint: input.demoHint,
  });

  if (!queryResult.ok) {
    applyFailed(out, "", 0, queryResult.error);
    assertValidSnapshot(out);
    return { snapshot: out };
  }

  const query = queryResult.query;
  let logicalCalls = 0;
  const orderedIds: string[] = [];
  const companyById = new Map<string, CrustdataCompany>();

  try {
    const domain = input.intake.company?.domain?.trim();
    if (domain && canIssueCall(logicalCalls, input.nowMs, input.deadlineMs)) {
      logicalCalls += 1;
      const match = await input.adapter.identify(domain);
      if (match) {
        orderedIds.push(match.companyId);
        companyById.set(
          match.companyId,
          placeholderCompany(match.companyId, domain),
        );
      } else {
        appendDomainIdentifyGap(out, domain, input.sessionId, input.now);
      }
    }

    let companies: CrustdataCompany[] = [];
    if (canIssueCall(logicalCalls, input.nowMs, input.deadlineMs)) {
      logicalCalls += 1;
      companies = await input.adapter.search(query);
    }

    let withIds = companies.filter((c) => c.crustdataCompanyId.length > 0);
    if (
      withIds.length === 0 &&
      canIssueCall(logicalCalls, input.nowMs, input.deadlineMs)
    ) {
      const category = input.intake.company?.category?.trim();
      if (category) {
        logicalCalls += 1;
        companies = await input.adapter.search(`${category} companies`);
        withIds = companies.filter((c) => c.crustdataCompanyId.length > 0);
      }
    }

    for (const company of withIds) {
      if (orderedIds.length >= MAX_COMPANIES) {
        break;
      }
      if (!companyById.has(company.crustdataCompanyId)) {
        orderedIds.push(company.crustdataCompanyId);
        companyById.set(company.crustdataCompanyId, company);
      }
    }

    const toEnrich = orderedIds
      .slice(0, MAX_COMPANIES)
      .map((id) => companyById.get(id)!)
      .filter(Boolean);

    const enriched: CrustdataCompany[] = [];
    if (input.enrichEnabled) {
      for (const company of toEnrich) {
        if (!canIssueCall(logicalCalls, input.nowMs, input.deadlineMs)) {
          enriched.push(company);
          continue;
        }
        logicalCalls += 1;
        const row = await input.adapter.enrich(company.crustdataCompanyId);
        enriched.push(row ?? company);
      }
    } else {
      enriched.push(...toEnrich);
    }

    const successSourceMode =
      input.adapter.kind === "fixture" ? "recorded" : "live";
    const summaries = appendMappedCompanies(
      out,
      enriched.slice(0, MAX_COMPANIES),
      input.sessionId,
      input.now,
      EvidenceVendor.Crustdata,
      successSourceMode,
      input.writeRaw,
    );

    let mappedCount = enriched.length;
    const mappedIdSet = new Set(
      enriched.map((c) => c.crustdataCompanyId).filter(Boolean),
    );

    const competitors = input.intake.company?.competitors ?? [];
    for (const rawName of competitors) {
      const name = rawName.trim();
      if (!name) {
        continue;
      }
      if (
        !canIssueCall(logicalCalls, input.nowMs, input.deadlineMs) ||
        mappedCount >= MAX_COMPANIES
      ) {
        break;
      }
      logicalCalls += 1;
      const match = await input.adapter.identifyByName(name);
      if (!match) {
        appendCompetitorAssumption(out, name, input.sessionId, input.now);
        continue;
      }
      if (mappedIdSet.has(match.companyId)) {
        continue;
      }
      let company = placeholderCompany(match.companyId, name);
      if (
        input.enrichEnabled &&
        canIssueCall(logicalCalls, input.nowMs, input.deadlineMs)
      ) {
        logicalCalls += 1;
        company =
          (await input.adapter.enrich(match.companyId)) ?? company;
      }
      summaries.push(
        appendSingleMappedCompany(
          out,
          company,
          input.sessionId,
          input.now,
          EvidenceVendor.Crustdata,
          successSourceMode,
          input.writeRaw,
        ),
      );
      mappedIdSet.add(match.companyId);
      mappedCount += 1;
    }

    maybeAppendEmptySearchUnknown(
      out,
      input.sessionId,
      input.now,
      mappedCount,
    );
    maybeAppendAnalyticsHypothesis(
      out,
      summaries,
      input.sessionId,
      input.now,
    );
    applySuccessMetadata(
      out,
      query,
      input.now,
      logicalCalls,
      successSourceMode,
    );
  } catch (error) {
    if (error instanceof CrustdataClientError) {
      const message =
        error instanceof Error ? error.message : "crustdata_client_error";
      applyFailed(out, query, logicalCalls, message);
    } else if (
      error instanceof CrustdataAuthError ||
      error instanceof CrustdataTransportError
    ) {
      const message =
        error instanceof Error ? error.message : "crustdata_unrecoverable";
      applyFallback(
        out,
        query,
        input.fallbackCompanies,
        input.sessionId,
        input.now,
        input.writeRaw,
        logicalCalls,
        message,
      );
    } else {
      throw error;
    }
  }

  assertValidSnapshot(out);
  return { snapshot: out };
}
