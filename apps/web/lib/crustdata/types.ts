import type { CrustdataCompany } from "@ceo-sandbox/domain";

export type CrustdataAdapter = {
  kind: "live" | "fixture";
  identify(
    domain: string,
  ): Promise<{ companyId: string; primaryDomain: string } | null>;
  identifyByName(name: string): Promise<{ companyId: string } | null>;
  search(query: string): Promise<CrustdataCompany[]>;
  enrich(id: string): Promise<CrustdataCompany | null>;
};

export type { CrustdataCompany };
