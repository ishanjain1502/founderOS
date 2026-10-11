import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { emptyIntakeDraft } from "@ceo-sandbox/domain";
import { RunMode } from "@ceo-sandbox/domain";

function complete(mode: typeof RunMode.Full) {
  const d = emptyIntakeDraft(mode);
  d.company = {
    name: "Acme",
    productSummary: "B2B SaaS",
    category: "Workflow",
    primaryBuyer: "Ops",
    jobToBeDone: "Track",
    deliveryModel: "saas",
    sizeBand: "mid",
  };
  d.market = { targetMarketBehavior: "Buyers" };
  d.constraints = { budgetUsd: 1, executionMonths: 1 };
  d.feature = { description: "Feat", changeType: "feature" };
  d.decision = { questionText: "Go?" };
  d.financials = { provideLater: true };
  return d;
}

describe("approve and start", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
    delete process.env.SANDBOX_SQLITE_PATH;
  });

  it("rejects start before approve and freeze after start", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ceo-web-"));
    dirs.push(dir);
    process.env.SANDBOX_SQLITE_PATH = join(dir, "sandbox.sqlite");

    const { POST: create } = await import("../../route");
    const createdRes = await create(
      new Request("http://localhost/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "full" }),
      }),
    );
    const created = await createdRes.json();

    const { PATCH } = await import("../route");
    await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intake: complete(RunMode.Full) }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );

    const { POST: start } = await import("../start/route");
    const startEarly = await start(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(startEarly.status).toBe(400);

    const { POST: approve } = await import("./route");
    const approved = await approve(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(approved.status).toBe(200);
    expect((await approved.json()).status).toBe("approved");

    const started = await start(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(started.status).toBe(200);
    expect((await started.json()).status).toBe("frozen");
  });
});
