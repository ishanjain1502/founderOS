import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EpistemicProjectionError } from "@ceo-sandbox/db";
import { emptyIntakeDraft, RunMode } from "@ceo-sandbox/domain";
import * as sessionStore from "@/lib/session-store";

function completeDemoLike(mode: typeof RunMode.Demo) {
  const d = emptyIntakeDraft(mode);
  d.company = {
    name: "Acme",
    productSummary: "B2B SaaS",
    category: "Workflow",
    primaryBuyer: "Ops lead",
    jobToBeDone: "Track work",
    deliveryModel: "saas",
    sizeBand: "mid",
  };
  d.market = { targetMarketBehavior: "SMB and enterprise buyers" };
  d.constraints = { budgetUsd: 1000, executionMonths: 3 };
  d.feature = {
    description: "AI add-on",
    changeType: "feature",
  };
  d.decision = { questionText: "Should we launch it?" };
  d.financials = { provideLater: true };
  return d;
}

describe("POST /api/sessions/:id/start", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
    delete process.env.SANDBOX_SQLITE_PATH;
  });

  it("GET epistemic is null before start and a demo snapshot after", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ceo-web-"));
    dirs.push(dir);
    process.env.SANDBOX_SQLITE_PATH = join(dir, "sandbox.sqlite");

    const { POST: create } = await import("../../route");
    const createdRes = await create(
      new Request("http://localhost/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "demo" }),
      }),
    );
    expect(createdRes.status).toBe(201);
    const created = await createdRes.json();

    const { PATCH, GET } = await import("../route");
    await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intake: completeDemoLike(RunMode.Demo) }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );

    const beforeStart = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(beforeStart.status).toBe(200);
    expect((await beforeStart.json()).epistemic).toBeNull();

    const { POST: approve } = await import("../approve/route");
    await approve(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: created.id }),
    });

    const { POST: start } = await import("./route");
    const started = await start(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(started.status).toBe(200);
    const startedBody = await started.json();
    expect(startedBody.epistemic.evidence[0].vendor).toBe("demo_fixture");

    const afterStart = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(afterStart.status).toBe(200);
    expect((await afterStart.json()).epistemic?.evidence[0]?.vendor).toBe(
      "demo_fixture",
    );
  });

  it("returns 500 epistemic_projection_failed when projection validation fails", async () => {
    const sessionId = "00000000-0000-4000-8000-000000000099";
    vi.spyOn(sessionStore, "getStore").mockReturnValue({
      getSession: vi.fn().mockReturnValue({
        id: sessionId,
        status: "approved",
      }),
      startSession: vi.fn().mockImplementation(() => {
        throw new EpistemicProjectionError();
      }),
    } as ReturnType<typeof sessionStore.getStore>);

    const { POST: start } = await import("./route");
    const res = await start(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: sessionId }),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({
      error: "epistemic_projection_failed",
      code: "epistemic_projection_failed",
    });
    vi.restoreAllMocks();
  });
});
