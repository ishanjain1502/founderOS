import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  emptyIntakeDraft,
  LAST_SESSION_COOKIE,
  RunMode,
} from "@ceo-sandbox/domain";
import { getStore } from "@/lib/session-store";

function completeFullIntake() {
  const d = emptyIntakeDraft(RunMode.Full);
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

describe("POST /api/sessions", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
    delete process.env.SANDBOX_SQLITE_PATH;
  });

  it("creates a full session, sets cookie, patches, and 409s after freeze via store", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ceo-web-"));
    dirs.push(dir);
    process.env.SANDBOX_SQLITE_PATH = join(dir, "sandbox.sqlite");

    const { POST } = await import("./route");
    const created = await POST(
      new Request("http://localhost/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: RunMode.Full }),
      }),
    );
    expect(created.status).toBe(201);
    const body = await created.json();
    expect(body.status).toBe("draft");
    expect(body.intake.mode).toBe("full");
    expect(body.intake.cfoWorkspace?.workspaceKey).toMatch(
      /^company-\d{4}-\d{2}-\d{2}T/,
    );
    expect(body.intake.cfoWorkspace?.status).toBe("pending");
    const cookie = created.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(LAST_SESSION_COOKIE);
    expect(cookie.toLowerCase()).toContain("httponly");

    const { PATCH, GET } = await import("./[id]/route");
    const got = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: body.id }),
    });
    expect(got.status).toBe(200);

    const patched = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intake: { company: { name: "Acme" } } }),
      }),
      { params: Promise.resolve({ id: body.id }) },
    );
    expect(patched.status).toBe(200);
    const patchedBody = await patched.json();
    expect(patchedBody.intake.company.name).toBe("Acme");

    const invalidPatch = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          intake: { decision: { questionText: "x".repeat(501) } },
        }),
      }),
      { params: Promise.resolve({ id: body.id }) },
    );
    expect(invalidPatch.status).toBe(400);
    const invalidBody = await invalidPatch.json();
    expect(invalidBody.errors).toBeDefined();

    const store = getStore();
    store.updateIntake(body.id, completeFullIntake());
    store.approveSession(body.id);
    store.startSession(body.id);

    const frozenPatch = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intake: { company: { name: "Frozen edit" } } }),
      }),
      { params: Promise.resolve({ id: body.id }) },
    );
    expect(frozenPatch.status).toBe(409);
    expect(await frozenPatch.json()).toEqual({ error: "frozen" });
  });
});
