import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { emptyIntakeDraft, RunMode } from "@ceo-sandbox/domain";
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
    title: "AI analytics",
    description: "Premium analytics layer",
    changeType: "feature",
  };
  d.decision = { questionText: "Should we launch it?" };
  d.financials = { provideLater: true };
  return d;
}

describe("POST /api/sessions/:id/research/crustdata", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
    delete process.env.SANDBOX_SQLITE_PATH;
    delete process.env.CRUSTDATA_LIVE;
    delete process.env.CRUSTDATA_API_KEY;
  });

  it("409 when not frozen; 200 after start with crustdata status; second POST is idempotent", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ceo-web-"));
    dirs.push(dir);
    process.env.SANDBOX_SQLITE_PATH = join(dir, "sandbox.sqlite");
    delete process.env.CRUSTDATA_LIVE;

    const { POST: create } = await import("../../../route");
    const createdRes = await create(
      new Request("http://localhost/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: RunMode.Full }),
      }),
    );
    const created = await createdRes.json();

    const { POST: research } = await import("./route");
    const unfrozen = await research(
      new Request("http://localhost", { method: "POST" }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(unfrozen.status).toBe(409);

    const store = getStore();
    store.updateIntake(created.id, completeFullIntake());
    store.approveSession(created.id);
    store.startSession(created.id);

    const first = await research(
      new Request("http://localhost", { method: "POST" }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    const status = firstBody.epistemic?.marketResearch?.crustdata?.status;
    expect(status === "ran" || status === "fallback").toBe(true);

    const evidenceLen = firstBody.epistemic.evidence.length;
    const second = await research(
      new Request("http://localhost", { method: "POST" }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(second.status).toBe(200);
    const secondBody = await second.json();
    expect(secondBody.epistemic.evidence.length).toBe(evidenceLen);
  });
});
