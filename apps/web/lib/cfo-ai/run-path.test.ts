import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi, afterEach } from "vitest";
import type { SessionDraftAssumption } from "@ceo-sandbox/domain";
import { emptyEpistemicSnapshot } from "@ceo-sandbox/domain";
import { loadCfoAiMappingFromJson } from "@ceo-sandbox/domain/server";
import { readFileSync } from "node:fs";
import { FinanceNotApprovedError, runFinancePath } from "./run-path";

const mapping = loadCfoAiMappingFromJson(
  JSON.parse(
    readFileSync(
      join(process.cwd(), "../../config/cfo-ai-mapping.json"),
      "utf8",
    ),
  ),
);

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

describe("runFinancePath", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
  });

  it("throws when assumptions not approved", async () => {
    await expect(
      runFinancePath({
        sessionId: "00000000-0000-4000-8000-000000000001",
        intake: { assumptions: [] },
        epistemic: emptyEpistemicSnapshot(),
        mapping,
        repoRoot: process.cwd(),
        clock: () => Date.now(),
        client: null,
        startedAtMs: Date.now(),
      }),
    ).rejects.toBeInstanceOf(FinanceNotApprovedError);
  });

  it("deferred mapping uses fixture without mcp calls", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cfo-finance-"));
    dirs.push(dir);
    const repoRoot = join(dir, "repo");
    const fixtureSrc = join(process.cwd(), "../../fixtures/finance/demo_run.json");
    const fixtureDest = join(repoRoot, "fixtures/finance/demo_run.json");
    const { mkdirSync, copyFileSync } = await import("node:fs");
    mkdirSync(join(repoRoot, "fixtures/finance"), { recursive: true });
    copyFileSync(fixtureSrc, fixtureDest);

    const client = { callTool: vi.fn() };
    const result = await runFinancePath({
      sessionId: "00000000-0000-4000-8000-000000000002",
      intake: { assumptions: financeReadyAssumptions() },
      epistemic: {
        ...emptyEpistemicSnapshot(),
        finance: { status: "idle", financeAssumptionsApproved: true },
      },
      mapping,
      repoRoot,
      clock: () => Date.now(),
      client,
      startedAtMs: Date.now(),
    });
    expect(result.snapshot.finance?.status).toBe("deferred");
    expect(client.callTool).not.toHaveBeenCalled();
  });

  it("live mapping runs writes and compare with mcpCallCount >= 2", async () => {
    const readyMapping = { ...mapping, setupStatus: "ready" as const, orgId: "103299" };
    const client = {
      callTool: vi.fn(async (tool: string) => {
        if (tool === "inspect_table_blocks") {
          return {
            cfo_compare: {
              "CEO sandbox - Pilot": { "Incremental MRR": 500 },
              "CEO sandbox - Broad": { "Incremental MRR": 900 },
            },
          };
        }
        return { ok: true };
      }),
    };

    const result = await runFinancePath({
      sessionId: "00000000-0000-4000-8000-000000000003",
      intake: { assumptions: financeReadyAssumptions() },
      epistemic: {
        ...emptyEpistemicSnapshot(),
        finance: { status: "idle", financeAssumptionsApproved: true },
      },
      mapping: readyMapping,
      repoRoot: process.cwd(),
      clock: () => Date.now(),
      client,
      startedAtMs: Date.now(),
    });

    expect(result.snapshot.finance?.status).toBe("complete");
    expect(result.snapshot.finance?.source).toBe("live");
    expect(result.mcpCallCount).toBeGreaterThanOrEqual(2);
    expect(client.callTool).toHaveBeenCalledWith(
      "edit_table_blocks",
      expect.objectContaining({ org_id: "103299" }),
    );
    expect(client.callTool).toHaveBeenCalledWith(
      "inspect_table_blocks",
      expect.objectContaining({ org_id: "103299" }),
    );
  });

  it("live compare empty twice yields unavailable", async () => {
    const readyMapping = { ...mapping, setupStatus: "ready" as const, orgId: "103299" };
    const client = {
      callTool: vi.fn(async (tool: string) => {
        if (tool === "inspect_table_blocks") {
          return {
            cfo_compare: {
              "CEO sandbox - Pilot": {},
              "CEO sandbox - Broad": {},
            },
          };
        }
        return { ok: true };
      }),
    };

    const result = await runFinancePath({
      sessionId: "00000000-0000-4000-8000-000000000004",
      intake: { assumptions: financeReadyAssumptions() },
      epistemic: {
        ...emptyEpistemicSnapshot(),
        finance: { status: "idle", financeAssumptionsApproved: true },
      },
      mapping: readyMapping,
      repoRoot: process.cwd(),
      clock: () => Date.now(),
      client,
      startedAtMs: Date.now(),
    });

    expect(result.snapshot.finance?.status).toBe("unavailable");
    expect(client.callTool).toHaveBeenCalledWith(
      "inspect_table_blocks",
      expect.anything(),
    );
    expect(
      client.callTool.mock.calls.filter((c) => c[0] === "inspect_table_blocks")
        .length,
    ).toBeGreaterThanOrEqual(2);
  });
});
