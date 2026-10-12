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

function completeDemoIntake() {
  const d = emptyIntakeDraft(RunMode.Demo);
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

function freezeSession(sessionId: string, intake: ReturnType<typeof completeFullIntake>) {
  const store = getStore();
  store.updateIntake(sessionId, intake);
  store.approveSession(sessionId);
  store.startSession(sessionId);
}

describe("POST /api/sessions/:id/panel", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
    delete process.env.SANDBOX_SQLITE_PATH;
    delete process.env.COMMANDCODE_API_KEY;
  });

  it("409 when not frozen; 400 for invalid n; demo fallback idempotency; full unavailable and rerun", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ceo-web-"));
    dirs.push(dir);
    process.env.SANDBOX_SQLITE_PATH = join(dir, "sandbox.sqlite");
    delete process.env.COMMANDCODE_API_KEY;

    const { POST: create } = await import("../../route");
    const { POST: panel } = await import("./route");

    const fullCreatedRes = await create(
      new Request("http://localhost/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: RunMode.Full }),
      }),
    );
    const fullCreated = await fullCreatedRes.json();

    const unfrozen = await panel(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ n: 10 }),
      }),
      { params: Promise.resolve({ id: fullCreated.id }) },
    );
    expect(unfrozen.status).toBe(409);
    expect(await unfrozen.json()).toEqual({ error: "not_frozen" });

    freezeSession(fullCreated.id, completeFullIntake());

    const badN = await panel(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ n: 9 }),
      }),
      { params: Promise.resolve({ id: fullCreated.id }) },
    );
    expect(badN.status).toBe(400);

    const demoCreatedRes = await create(
      new Request("http://localhost/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: RunMode.Demo }),
      }),
    );
    const demoCreated = await demoCreatedRes.json();
    freezeSession(demoCreated.id, completeDemoIntake());

    const demoFirst = await panel(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ n: 10 }),
      }),
      { params: Promise.resolve({ id: demoCreated.id }) },
    );
    expect(demoFirst.status).toBe(200);
    const demoFirstBody = await demoFirst.json();
    expect(demoFirstBody.epistemic.panel.status).toBe("fallback");
    expect(demoFirstBody.epistemic.panel.source).toBe("fixture");
    const demoRunId = demoFirstBody.epistemic.panel.panelRunId;

    const demoSecond = await panel(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ n: 10 }),
      }),
      { params: Promise.resolve({ id: demoCreated.id }) },
    );
    expect(demoSecond.status).toBe(200);
    const demoSecondBody = await demoSecond.json();
    expect(demoSecondBody.epistemic.panel.panelRunId).toBe(demoRunId);

    const demoRerun = await panel(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ n: 10, rerun: true }),
      }),
      { params: Promise.resolve({ id: demoCreated.id }) },
    );
    expect(demoRerun.status).toBe(200);
    const demoRerunBody = await demoRerun.json();
    expect(demoRerunBody.epistemic.panel.panelRunId).toBe(demoRunId);

    const fullFirst = await panel(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ n: 10 }),
      }),
      { params: Promise.resolve({ id: fullCreated.id }) },
    );
    expect(fullFirst.status).toBe(200);
    const fullFirstBody = await fullFirst.json();
    expect(fullFirstBody.epistemic.panel.status).toBe("unavailable");
    const fullRunId1 = fullFirstBody.epistemic.panel.panelRunId;
    expect(fullFirstBody.epistemic.panel.rerunCount).toBe(0);

    const fullRerun = await panel(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ n: 10, rerun: true }),
      }),
      { params: Promise.resolve({ id: fullCreated.id }) },
    );
    expect(fullRerun.status).toBe(200);
    const fullRerunBody = await fullRerun.json();
    expect(fullRerunBody.epistemic.panel.status).toBe("unavailable");
    expect(fullRerunBody.epistemic.panel.panelRunId).not.toBe(fullRunId1);
    expect(fullRerunBody.epistemic.panel.rerunCount).toBe(1);
    const fullRunId2 = fullRerunBody.epistemic.panel.panelRunId;

    const fullRerunAgain = await panel(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ n: 10, rerun: true }),
      }),
      { params: Promise.resolve({ id: fullCreated.id }) },
    );
    expect(fullRerunAgain.status).toBe(200);
    const fullRerunAgainBody = await fullRerunAgain.json();
    expect(fullRerunAgainBody.epistemic.panel.panelRunId).toBe(fullRunId2);
  });
});
