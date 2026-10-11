import { CONTRACT_VERSION, EntitySource, newId } from "./contracts/base";
import {
  EvidenceVendor,
  evidenceSchema,
  type Evidence,
} from "./contracts/evidence";

export type CrustdataCompany = {
  crustdataCompanyId: string;
  name: string;
  website?: string;
  description?: string;
  industry?: string;
  updatedAt?: string;
  indexedAt?: string;
  fieldPaths: string[];
  raw: unknown;
};

export type MapCrustdataCompanyContext = {
  sessionId: string;
  now: string;
  vendor: EvidenceVendor;
  sourceMode: "live" | "recorded" | "fallback";
};

const DEMAND_ADJACENT_PATH = /description|review|product/i;
const ANALYTICS_SUMMARY = /analytic|intelligence|dashboard/i;

export function isDemandAdjacent(fieldPaths: string[]): boolean {
  return fieldPaths.some((path) => DEMAND_ADJACENT_PATH.test(path));
}

export function shouldProposeAnalyticsHypothesis(summaries: string[]): boolean {
  const matches = summaries.filter((s) => ANALYTICS_SUMMARY.test(s));
  return matches.length >= 2;
}

function parseCanonicalUrl(website: string | undefined): string | undefined {
  if (!website) {
    return undefined;
  }
  try {
    new URL(website);
    return website;
  } catch {
    return undefined;
  }
}

function buildSummary(company: CrustdataCompany): string {
  const lines: string[] = [company.name];
  if (company.industry) {
    lines.push(company.industry);
  }
  if (company.description) {
    lines.push(company.description.slice(0, 240));
  }
  const requestedWebsite = company.fieldPaths.includes("basic_info.website");
  if (requestedWebsite && !company.website) {
    lines.push("Website not provided by Crustdata.");
  }
  let summary = lines.join("\n");
  if (summary.length > 2000) {
    summary = summary.slice(0, 2000);
  }
  return summary;
}

function rawPayloadRef(sessionId: string, crustdataCompanyId: string): string {
  return `data/crustdata-raw/${sessionId}/${crustdataCompanyId}.json`;
}

export function mapCrustdataCompanyToEvidence(
  company: CrustdataCompany,
  ctx: MapCrustdataCompanyContext,
): Evidence {
  const id = newId();
  const hasCompanyId =
    company.crustdataCompanyId.length > 0;
  const vendorTimestamp = company.updatedAt ?? company.indexedAt;

  const base = {
    id,
    contractVersion: CONTRACT_VERSION,
    createdAt: ctx.now,
    source: EntitySource.Import,
    sessionId: ctx.sessionId,
    summary: buildSummary(company),
    vendor: ctx.vendor,
    fieldPaths: company.fieldPaths,
    demandAdjacent: isDemandAdjacent(company.fieldPaths),
    retrievedAt: ctx.now,
    vendorTimestamp,
    rawPayloadRef: hasCompanyId
      ? rawPayloadRef(ctx.sessionId, company.crustdataCompanyId)
      : undefined,
    canonicalUrl: parseCanonicalUrl(company.website),
  };

  if (ctx.vendor === EvidenceVendor.Fallback) {
    return evidenceSchema.parse({
      ...base,
      ...(hasCompanyId
        ? { externalId: company.crustdataCompanyId }
        : {
            identityKey: `fallback:crustdata:${ctx.sessionId}:${company.crustdataCompanyId}`,
          }),
    });
  }

  return evidenceSchema.parse({
    ...base,
    externalId: company.crustdataCompanyId,
  });
}
