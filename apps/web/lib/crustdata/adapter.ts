import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CrustdataCompany } from "@ceo-sandbox/domain";
import { CrustdataAuthError, CrustdataTransportError } from "./errors";
import { normalizeSearchRow } from "./normalize";
import type { CrustdataAdapter } from "./types";

const API_BASE = "https://api.crustdata.com";
const API_VERSION = "2025-11-01";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [200, 800];

export const SEARCH_FIELDS = [
  "basic_info.name",
  "basic_info.website",
  "basic_info.description",
  "taxonomy.professional_network_industry",
  "metadata.updated_at",
  "metadata.indexed_at",
  "crustdata_company_id",
] as const;

type LiveAdapterOptions = {
  apiKey: string;
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

function readJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildHeaders(apiKey: string): HeadersInit {
  return {
    authorization: `Bearer ${apiKey}`,
    "x-api-version": API_VERSION,
    "content-type": "application/json",
  };
}

async function postWithRetries(
  fetchFn: typeof fetch,
  sleep: (ms: number) => Promise<void>,
  url: string,
  apiKey: string,
  body: unknown,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetchFn(url, {
        method: "POST",
        headers: buildHeaders(apiKey),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (response.status === 401 || response.status === 403) {
        throw new CrustdataAuthError(
          `Crustdata returned ${response.status}`,
        );
      }

      if (response.status >= 500) {
        lastError = new CrustdataTransportError(
          `Crustdata returned ${response.status}`,
        );
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS.at(-1)!);
          continue;
        }
        throw lastError;
      }

      return response;
    } catch (error) {
      if (error instanceof CrustdataAuthError) {
        throw error;
      }
      lastError =
        error instanceof CrustdataTransportError
          ? error
          : new CrustdataTransportError(
              error instanceof Error ? error.message : "Crustdata request failed",
              error instanceof Error ? { cause: error } : undefined,
            );
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS.at(-1)!);
        continue;
      }
      throw lastError;
    }
  }

  throw (
    lastError ??
    new CrustdataTransportError("Crustdata request failed")
  );
}

function parseSearchCompanies(payload: unknown): CrustdataCompany[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const companies = (payload as { companies?: unknown }).companies;
  if (!Array.isArray(companies)) {
    return [];
  }
  return companies
    .map((row) => normalizeSearchRow(row))
    .filter((row): row is CrustdataCompany => row !== null);
}

/** SP-05 §6.1: lowercase, strip leading www. */
export function normalizeHost(host: string): string {
  let normalized = host.trim().toLowerCase();
  if (normalized.startsWith("www.")) {
    normalized = normalized.slice(4);
  }
  return normalized;
}

function parseIdentifyMatch(
  payload: unknown,
  domain: string,
): { companyId: string; primaryDomain: string } | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const matches = (payload as { matches?: unknown }).matches;
  if (!Array.isArray(matches)) {
    return null;
  }
  const normalizedDomain = normalizeHost(domain);
  for (const match of matches) {
    if (!match || typeof match !== "object") {
      continue;
    }
    const row = match as Record<string, unknown>;
    const primaryDomainRaw = String(row.primary_domain ?? "");
    const normalizedPrimary = normalizeHost(primaryDomainRaw);
    const companyIdRaw = row.crustdata_company_id;
    if (companyIdRaw === undefined || companyIdRaw === null) {
      continue;
    }
    if (normalizedPrimary.length === 0) {
      continue;
    }
    if (normalizedPrimary === normalizedDomain) {
      return {
        companyId: String(companyIdRaw),
        primaryDomain: primaryDomainRaw,
      };
    }
  }
  return null;
}

function parseEnrichCompany(payload: unknown): CrustdataCompany | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const direct = normalizeSearchRow(payload);
  if (direct) {
    return direct;
  }
  const nested = (payload as { company?: unknown }).company;
  if (nested) {
    return normalizeSearchRow(nested);
  }
  return null;
}

export function createFixtureAdapter(rootDir: string): CrustdataAdapter {
  return {
    kind: "fixture",
    async identify(domain: string) {
      const payload = readJsonFile(join(rootDir, "identify-crustdata.json"));
      return parseIdentifyMatch(payload, domain);
    },

    async search(_query: string) {
      const payload = readJsonFile(join(rootDir, "search-demo.json"));
      return parseSearchCompanies(payload);
    },

    async enrich(id: string) {
      const payload = readJsonFile(join(rootDir, "enrich-sample.json"));
      if (!payload || typeof payload !== "object") {
        return null;
      }
      const row = (payload as Record<string, unknown>)[id];
      return row ? normalizeSearchRow(row) : null;
    },
  };
}

export function createLiveAdapter(opts: LiveAdapterOptions): CrustdataAdapter {
  const fetchFn = opts.fetchFn ?? fetch;
  const sleep = opts.sleep ?? defaultSleep;

  async function post(path: string, body: unknown): Promise<Response> {
    return postWithRetries(
      fetchFn,
      sleep,
      `${API_BASE}${path}`,
      opts.apiKey,
      body,
    );
  }

  return {
    kind: "live",
    async identify(domain: string) {
      const response = await post("/company/identify", {
        domains: [domain],
        exact_match: true,
      });
      const payload = await response.json();
      return parseIdentifyMatch(payload, domain);
    },

    async search(query: string) {
      const response = await post("/company/search", {
        search: { query },
        limit: 20,
        fields: [...SEARCH_FIELDS],
      });
      const payload = await response.json();
      return parseSearchCompanies(payload);
    },

    async enrich(id: string) {
      const response = await post("/company/enrich", {
        crustdata_company_id: id,
      });
      const payload = await response.json();
      return parseEnrichCompany(payload);
    },
  };
}
