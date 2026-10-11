import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { CrustdataAuthError } from "./errors";
import { createFixtureAdapter, createLiveAdapter } from "./adapter";

const fixtureRoot = join(process.cwd(), "../../fixtures/crustdata");

describe("createFixtureAdapter", () => {
  it("search returns 3 companies with crustdataCompanyId", async () => {
    const adapter = createFixtureAdapter(fixtureRoot);
    const companies = await adapter.search("anything");
    expect(companies).toHaveLength(3);
    for (const company of companies) {
      expect(company.crustdataCompanyId).toBeTruthy();
    }
  });
});

describe("createLiveAdapter", () => {
  it("search sends auth headers and URL", async () => {
    const calls: { url: string; authorization: string | null; apiVersion: string | null }[] =
      [];
    const fetchFn = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      calls.push({
        url: String(url),
        authorization: headers.get("authorization"),
        apiVersion: headers.get("x-api-version"),
      });
      return new Response(JSON.stringify({ companies: [] }), { status: 200 });
    });

    const adapter = createLiveAdapter({ apiKey: "test-key", fetchFn });
    await adapter.search("analytics");

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.crustdata.com/company/search");
    expect(calls[0]?.authorization).toBe("Bearer test-key");
    expect(calls[0]?.apiVersion).toBe("2025-11-01");
  });

  it("retries once after 500 then succeeds", async () => {
    let n = 0;
    const fetchFn = vi.fn(async () => {
      n += 1;
      if (n === 1) {
        return new Response("error", { status: 500 });
      }
      return new Response(JSON.stringify({ companies: [] }), { status: 200 });
    });
    const sleep = vi.fn(async () => {});

    const adapter = createLiveAdapter({
      apiKey: "test-key",
      fetchFn,
      sleep,
    });
    await adapter.search("q");

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("throws CrustdataAuthError on 401 without retry", async () => {
    const fetchFn = vi.fn(async () => new Response("unauthorized", { status: 401 }));
    const sleep = vi.fn(async () => {});

    const adapter = createLiveAdapter({
      apiKey: "bad-key",
      fetchFn,
      sleep,
    });

    await expect(adapter.search("q")).rejects.toBeInstanceOf(CrustdataAuthError);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
