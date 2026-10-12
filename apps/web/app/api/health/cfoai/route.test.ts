import { afterEach, describe, expect, it } from "vitest";

describe("GET /api/health/cfoai", () => {
  afterEach(() => {
    delete process.env.CFO_LIVE;
    delete process.env.CFO_MCP_ACCESS_TOKEN;
  });

  it("returns ok with live false in fixture mode", async () => {
    delete process.env.CFO_LIVE;
    delete process.env.CFO_MCP_ACCESS_TOKEN;

    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, live: false, mappingReady: false });
    expect(typeof body.detail).toBe("string");
  });
});
