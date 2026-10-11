import { afterEach, describe, expect, it } from "vitest";

describe("GET /api/health/crustdata", () => {
  afterEach(() => {
    delete process.env.CRUSTDATA_LIVE;
    delete process.env.CRUSTDATA_API_KEY;
  });

  it("returns ok with live false in fixture mode", async () => {
    delete process.env.CRUSTDATA_LIVE;
    delete process.env.CRUSTDATA_API_KEY;

    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, live: false });
    expect(typeof body.detail).toBe("string");
  });
});
