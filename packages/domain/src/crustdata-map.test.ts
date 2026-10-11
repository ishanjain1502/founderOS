import { describe, it, expect } from "vitest";
import { EvidenceVendor } from "./contracts/evidence";
import {
  isDemandAdjacent,
  mapCrustdataCompanyToEvidence,
  shouldProposeAnalyticsHypothesis,
} from "./crustdata-map";
import { findForbiddenPhrases } from "./forbidden-phrases";

const company = {
  crustdataCompanyId: "3552555",
  name: "Notion",
  website: "https://notion.com",
  description: "Workspace with analytics add-ons",
  industry: "Software",
  updatedAt: "2026-01-01T00:00:00.000Z",
  fieldPaths: ["basic_info.name", "basic_info.website", "basic_info.description"],
  raw: { crustdata_company_id: 3552555 },
};

describe("mapCrustdataCompanyToEvidence", () => {
  it("maps id, url, vendorTimestamp, demandAdjacent", () => {
    const ev = mapCrustdataCompanyToEvidence(company, {
      sessionId: "00000000-0000-4000-8000-000000000002",
      now: "2026-10-12T00:00:00.000Z",
      vendor: EvidenceVendor.Crustdata,
      sourceMode: "recorded",
    });
    expect(ev.externalId).toBe("3552555");
    expect(ev.canonicalUrl).toBe("https://notion.com");
    expect(ev.vendor).toBe("crustdata");
    expect(ev.demandAdjacent).toBe(true);
    expect(ev.retrievedAt).toBe("2026-10-12T00:00:00.000Z");
    expect(ev.rawPayloadRef).toBe(
      "data/crustdata-raw/00000000-0000-4000-8000-000000000002/3552555.json",
    );
    expect(findForbiddenPhrases(ev.summary)).toEqual([]);
  });

  it("does not invent website; notes not provided", () => {
    const ev = mapCrustdataCompanyToEvidence(
      { ...company, website: undefined, fieldPaths: ["basic_info.name", "basic_info.website"] },
      {
        sessionId: "00000000-0000-4000-8000-000000000002",
        now: "2026-10-12T00:00:00.000Z",
        vendor: EvidenceVendor.Crustdata,
        sourceMode: "live",
      },
    );
    expect(ev.canonicalUrl).toBeUndefined();
    expect(ev.summary.toLowerCase()).toMatch(/not provided by crustdata/);
  });
});

describe("isDemandAdjacent / hypothesis", () => {
  it("flags description paths", () => {
    expect(isDemandAdjacent(["basic_info.description"])).toBe(true);
    expect(isDemandAdjacent(["metadata.updated_at"])).toBe(false);
  });

  it("needs two analytics-ish summaries", () => {
    expect(shouldProposeAnalyticsHypothesis(["analytics module", "business intelligence"])).toBe(true);
    expect(shouldProposeAnalyticsHypothesis(["analytics module"])).toBe(false);
  });
});
