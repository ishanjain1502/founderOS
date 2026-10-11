import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CrustdataCompany } from "@ceo-sandbox/domain";
import { createFixtureAdapter, createLiveAdapter } from "./adapter";
import type { CrustdataAdapter } from "./types";

export function crustdataFixtureRoot(): string {
  return join(process.cwd(), "../../fixtures/crustdata");
}

export function isCrustdataLive(): boolean {
  return (
    Boolean(process.env.CRUSTDATA_API_KEY) &&
    process.env.CRUSTDATA_LIVE === "1"
  );
}

export function selectCrustdataAdapter(): {
  live: boolean;
  adapter: CrustdataAdapter;
} {
  const fixtureRoot = crustdataFixtureRoot();
  if (isCrustdataLive()) {
    return {
      live: true,
      adapter: createLiveAdapter({
        apiKey: process.env.CRUSTDATA_API_KEY!,
      }),
    };
  }
  return { live: false, adapter: createFixtureAdapter(fixtureRoot) };
}

type FallbackDoc = {
  companies: Array<Omit<CrustdataCompany, "raw">>;
};

export function loadFallbackCompanies(
  fixtureRoot = crustdataFixtureRoot(),
): CrustdataCompany[] {
  const doc = JSON.parse(
    readFileSync(join(fixtureRoot, "fallback-evidence.json"), "utf8"),
  ) as FallbackDoc;
  return doc.companies.map((company) => ({
    ...company,
    raw: company,
  }));
}
