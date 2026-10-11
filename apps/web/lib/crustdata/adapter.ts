import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CrustdataCompany } from "@ceo-sandbox/domain";
import {
  canonicalCacheKey,
  createInMemoryCrustdataCache,
  disabledCrustdataCache,
  type CrustdataResponseCache,
} from "./cache";
import {
  CrustdataAuthError,
  CrustdataClientError,
  CrustdataRateLimitError,
  CrustdataTransportError,
} from "./errors";
import { normalizeSearchRow } from "./normalize";
import type { CrustdataAdapter } from "./types";

const API_BASE = "https://api.crustdata.com";
const API_VERSION = "2025-11-01";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [200, 800];
const RATE_LIMIT_WAIT_MS = 1000;

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
  cache?: CrustdataResponseCache;
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

function classifyResponse(response: Response): void {
  if (response.status === 401 || response.status === 403) {
    throw new CrustdataAuthError(`Crustdata returned ${response.status}`);
  }
  if (response.status === 429) {
    return;
  }
  if (response.status >= 400 && response.status < 500) {
    throw new CrustdataClientError(`Crustdata returned ${response.status}`);
  }
  if (response.status >= 500) {
    throw new CrustdataTransportError(`Crustdata returned ${response.status}`);
  }
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

      if (response.status === 429) {
        await sleep(RATE_LIMIT_WAIT_MS);
        const retryResponse = await fetchFn(url, {
          method: "POST",
          headers: buildHeaders(apiKey),
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (retryResponse.status === 429) {
          throw new CrustdataRateLimitError("Crustdata rate limited (429)");
        }
        classifyResponse(retryResponse);
        return retryResponse;
      }

      classifyResponse(response);
      return response;
    } catch (error) {
      if (
        error instanceof CrustdataAuthError ||
        error instanceof CrustdataClientError ||
        error instanceof CrustdataRateLimitError
      ) {
        throw error;
      }
      if (error instanceof CrustdataTransportError) {
        lastError = error;
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS.at(-1)!);
          continue;
        }
        throw error;
      }
      lastError = new CrustdataTransportError(
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
    lastError ?? new CrustdataTransportError("Crustdata request failed")
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

function readMatchRowFields(match: unknown): {
  companyId: string;
  primaryDomain: string;
} | null {
  if (!match || typeof match !== "object") {
    return null;
  }
  const row = match as Record<string, unknown>;
  const companyData = row.company_data;
  if (companyData && typeof companyData === "object") {
    const basic = (companyData as { basic_info?: unknown }).basic_info;
    if (basic && typeof basic === "object") {
      const info = basic as Record<string, unknown>;
      const idRaw = info.crustdata_company_id ?? companyData;
      const id =
        typeof idRaw === "object" && idRaw !== null
          ? (idRaw as { crustdata_company_id?: unknown }).crustdata_company_id
          : idRaw;
      if (id === undefined || id === null) {
        return null;
      }
      const primaryDomainRaw = String(info.primary_domain ?? "");
      return {
        companyId: String(id),
        primaryDomain: primaryDomainRaw,
      };
    }
  }
  const companyIdRaw = row.crustdata_company_id;
  if (companyIdRaw === undefined || companyIdRaw === null) {
    return null;
  }
  return {
    companyId: String(companyIdRaw),
    primaryDomain: String(row.primary_domain ?? ""),
  };
}

function collectIdentifyMatches(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    const matches: unknown[] = [];
    for (const item of payload) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const nested = (item as { matches?: unknown }).matches;
      if (Array.isArray(nested)) {
        matches.push(...nested);
      }
    }
    return matches;
  }
  if (payload && typeof payload === "object") {
    const matches = (payload as { matches?: unknown }).matches;
    if (Array.isArray(matches)) {
      return matches;
    }
  }
  return [];
}

function parseIdentifyMatch(
  payload: unknown,
  domain: string,
): { companyId: string; primaryDomain: string } | null {
  const normalizedDomain = normalizeHost(domain);
  for (const match of collectIdentifyMatches(payload)) {
    const fields = readMatchRowFields(match);
    if (!fields) {
      continue;
    }
    const normalizedPrimary = normalizeHost(fields.primaryDomain);
    if (normalizedPrimary.length === 0) {
      continue;
    }
    if (normalizedPrimary === normalizedDomain) {
      return {
        companyId: fields.companyId,
        primaryDomain: fields.primaryDomain,
      };
    }
  }
  return null;
}

function parseIdentifyByName(payload: unknown): { companyId: string } | null {
  for (const match of collectIdentifyMatches(payload)) {
    const fields = readMatchRowFields(match);
    if (fields?.companyId) {
      return { companyId: fields.companyId };
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

    async identifyByName(_name: string) {
      return null;
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

const defaultProcessCache = createInMemoryCrustdataCache();

export function createLiveAdapter(opts: LiveAdapterOptions): CrustdataAdapter {
  const fetchFn = opts.fetchFn ?? fetch;
  const sleep = opts.sleep ?? defaultSleep;
  const cache = opts.cache ?? defaultProcessCache;

  async function post(path: string, body: unknown): Promise<unknown> {
    const cacheKey = canonicalCacheKey(path, body);
    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const response = await postWithRetries(
      fetchFn,
      sleep,
      `${API_BASE}${path}`,
      opts.apiKey,
      body,
    );
    const payload = await response.json();
    cache.set(cacheKey, payload);
    return payload;
  }

  return {
    kind: "live",
    async identify(domain: string) {
      const payload = await post("/company/identify", {
        domains: [domain],
        exact_match: true,
      });
      return parseIdentifyMatch(payload, domain);
    },

    async identifyByName(name: string) {
      const payload = await post("/company/identify", {
        names: [name],
        exact_match: true,
      });
      return parseIdentifyByName(payload);
    },

    async search(query: string) {
      const payload = await post("/company/search", {
        search: { query },
        limit: 20,
        fields: [...SEARCH_FIELDS],
      });
      return parseSearchCompanies(payload);
    },

    async enrich(id: string) {
      const payload = await post("/company/enrich", {
        crustdata_company_id: id,
      });
      return parseEnrichCompany(payload);
    },
  };
}

export { disabledCrustdataCache };
