import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CrustdataCompany } from "@ceo-sandbox/domain";
import {
  createFixtureAdapter,
  createLiveAdapter,
  disabledCrustdataCache,
} from "./adapter";
import { CrustdataAuthError } from "./errors";
import type { CrustdataAdapter } from "./types";

export function crustdataFixtureRoot(): string {
  return join(process.cwd(), "../../fixtures/crustdata");
}

export function wantsCrustdataLive(): boolean {
  return process.env.CRUSTDATA_LIVE === "1";
}

export function isCrustdataLive(): boolean {
  return wantsCrustdataLive() && Boolean(process.env.CRUSTDATA_API_KEY);
}

function createMissingApiKeyAdapter(): CrustdataAdapter {
  const fail = async (): Promise<never> => {
    throw new CrustdataAuthError(
      "CRUSTDATA_LIVE=1 but CRUSTDATA_API_KEY is missing",
    );
  };
  return {
    kind: "live",
    identify: fail,
    identifyByName: fail,
    search: fail,
    enrich: fail,
  };
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
  if (wantsCrustdataLive() && !process.env.CRUSTDATA_API_KEY) {
    return { live: false, adapter: createMissingApiKeyAdapter() };
  }
  return { live: false, adapter: createFixtureAdapter(fixtureRoot) };
}

/** Live adapter with cache disabled — for vitest only. */
export function createLiveAdapterForTests(
  opts: Parameters<typeof createLiveAdapter>[0],
): ReturnType<typeof createLiveAdapter> {
  return createLiveAdapter({ ...opts, cache: disabledCrustdataCache });
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
