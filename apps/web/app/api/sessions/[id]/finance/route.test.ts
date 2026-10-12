import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  emptyIntakeDraft,
  RunMode,
  type SessionDraftAssumption,
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
    title: "AI analytics",
    description: "Premium analytics layer",
    changeType: "feature",
  };
  d.decision = { questionText: "Should we launch it?" };
  d.financials = { provideLater: true };
  d.assumptions = financeReadyAssumptions();
  return d;
}

function financeReadyAssumptions(): SessionDraftAssumption[] {
  const money = (value: number) => ({
    unit: "money" as const,
    value,
    currency: "USD",
    period: "one_time",
  });
  const pct = (value: number) => ({ unit: "percent" as const, value });
  const base = {
    statement: "test",
    rationaleTag: "demo_fixture",
  };
  const rows: SessionDraftAssumption[] = [];
  for (const scenarioKey of ["pilot", "broad_launch"] as const) {
    rows.push(
      {
        ...base,
        id:
          scenarioKey === "pilot"
            ? "00000000-0000-4000-8000-000000000011"
            : "00000000-0000-4000-8000-000000000021",
        mapsTo: "build_cost",
        scenarioKey,
        numeric: money(100_000),
      },
      {
        ...base,
        id:
          scenarioKey === "pilot"
            ? "00000000-0000-4000-8000-000000000012"
            : "00000000-0000-4000-8000-000000000022",
        mapsTo: "build_timeline_months",
        scenarioKey,
        numeric: money(3),
      },
      {
        ...base,
        id:
          scenarioKey === "pilot"
            ? "00000000-0000-4000-8000-000000000013"
            : "00000000-0000-4000-8000-000000000023",
        mapsTo: "price_per_seat",
        scenarioKey,
        numeric: money(25),
      },
      {
        ...base,
        id:
          scenarioKey === "pilot"
            ? "00000000-0000-4000-8000-000000000014"
            : "00000000-0000-4000-8000-000000000024",
        mapsTo: "adoption_rate",
        scenarioKey,
        numeric: pct(10),
      },
      {
        ...base,
        id:
          scenarioKey === "pilot"
            ? "00000000-0000-4000-8000-000000000015"
            : "00000000-0000-4000-8000-000000000025",
        mapsTo: "inference_cost_per_user",
        scenarioKey,
        numeric: money(4),
      },
    );
    if (scenarioKey === "pilot") {
      rows.push({
        ...base,
        id: "00000000-0000-4000-8000-000000000016",
        mapsTo: "pilot_cohort_size",
        scenarioKey,
        numeric: money(10),
      });
    }
  }
  return rows;
}

function freezeSession(
  sessionId: string,
  intake: ReturnType<typeof completeFullIntake>,
) {
  const store = getStore();
  store.updateIntake(sessionId, intake);
  store.approveSession(sessionId);
  store.startSession(sessionId);
}

describe("POST /api/sessions/:id/finance", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
    delete process.env.SANDBOX_SQLITE_PATH;
    delete process.env.CFO_LIVE;
    delete process.env.CFO_MCP_ACCESS_TOKEN;
  });

  it("409 when not frozen; 409 without approve; deferred run idempotent", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ceo-web-finance-"));
    dirs.push(dir);
    process.env.SANDBOX_SQLITE_PATH = join(dir, "sandbox.sqlite");
    delete process.env.CFO_LIVE;

    const { POST: create } = await import("../../route");
    const createdRes = await create(
      new Request("http://localhost/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: RunMode.Full }),
      }),
    );
    const created = await createdRes.json();

    const { POST: finance } = await import("./route");
    const { POST: approve } = await import("./approve-assumptions/route");

    const unfrozen = await finance(
      new Request("http://localhost", { method: "POST" }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(unfrozen.status).toBe(409);

    freezeSession(created.id, completeFullIntake());

    const notApproved = await finance(
      new Request("http://localhost", { method: "POST" }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(notApproved.status).toBe(409);
    expect(await notApproved.json()).toEqual({
      error: "finance_assumptions_not_approved",
    });

    const approved = await approve(
      new Request("http://localhost", { method: "POST" }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(approved.status).toBe(200);
    expect(
      (await approved.json()).epistemic?.finance?.financeAssumptionsApproved,
    ).toBe(true);

    const first = await finance(
      new Request("http://localhost", { method: "POST" }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    const runId = firstBody.epistemic?.finance?.financeRunId;
    expect(firstBody.epistemic?.finance?.status).toBe("deferred");

    const second = await finance(
      new Request("http://localhost", { method: "POST" }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(second.status).toBe(200);
    const secondBody = await second.json();
    expect(secondBody.epistemic?.finance?.financeRunId).toBe(runId);
  });
});
