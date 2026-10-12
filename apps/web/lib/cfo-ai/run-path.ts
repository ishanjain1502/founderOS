import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type CfoAiMapping,
  type EpistemicSnapshot,
  type FinanceFixtureDoc,
  type IntakeDraftPartial,
  financeStateFromFixture,
  runFinanceDeterministicChecks,
  validateEpistemicSnapshot,
  validateFinanceAssumptionPack,
} from "@ceo-sandbox/domain";
import { executeLiveFinanceRun } from "./live-finance-path";
import type { CfoMcpClient } from "./types";
import { FINANCE_STAGE_MS } from "./types";
import { writeFinanceRawPayload } from "./write-raw";

export type FinancePathResult = {
  snapshot: EpistemicSnapshot;
  mcpCallCount: number;
};

export class FinanceNotApprovedError extends Error {
  constructor() {
    super("finance_assumptions_not_approved");
  }
}

function loadFixture(repoRoot: string): FinanceFixtureDoc {
  const raw = readFileSync(
    join(repoRoot, "fixtures", "finance", "demo_run.json"),
    "utf8",
  );
  return JSON.parse(raw) as FinanceFixtureDoc;
}

export async function runFinancePath(args: {
  sessionId: string;
  intake: IntakeDraftPartial;
  epistemic: EpistemicSnapshot;
  mapping: CfoAiMapping;
  repoRoot: string;
  clock: () => number;
  client: CfoMcpClient | null;
  startedAtMs: number;
}): Promise<FinancePathResult> {
  const approved = args.epistemic.finance?.financeAssumptionsApproved === true;
  if (!approved) {
    throw new FinanceNotApprovedError();
  }

  const existing = args.epistemic.finance;
  if (
    existing?.status === "complete" ||
    existing?.status === "fallback" ||
    existing?.status === "deferred" ||
    existing?.status === "unavailable"
  ) {
    return { snapshot: args.epistemic, mcpCallCount: existing.mcpCallCount ?? 0 };
  }

  const assumptions = args.intake.assumptions ?? [];
  const pack = validateFinanceAssumptionPack({
    assumptions,
    epistemic: args.epistemic,
    mapping: args.mapping,
  });

  if (!pack.ok) {
    const failed = {
      snapshot: {
        ...args.epistemic,
        finance: {
          status: "failed" as const,
          financeAssumptionsApproved: true,
          error: pack.errors.join("; ").slice(0, 500),
        },
      },
      mcpCallCount: 0,
    };
    assertValidSnapshot(failed.snapshot);
    return failed;
  }

  const mappingReady = args.mapping.setupStatus === "ready";
  const live = mappingReady && args.client !== null;
  const financeRunId = randomUUID();
  let mcpCallCount = 0;

  if (!live) {
    const fixture = loadFixture(args.repoRoot);
    const finance = financeStateFromFixture(fixture, { financeRunId });
    const rawRef = writeFinanceRawPayload(args.repoRoot, args.sessionId, financeRunId, {
      mode: args.mapping.setupStatus === "ready" ? "fixture" : "deferred",
      fixture,
    });
    const checks = runFinanceDeterministicChecks({
      packHash: pack.packHash,
      sentPackHash: pack.packHash,
    });
    const out = {
      snapshot: {
        ...args.epistemic,
        finance: {
          ...finance,
          status: args.mapping.setupStatus === "ready" ? "fallback" : "deferred",
          financeAssumptionsApproved: true,
          mappingSetupStatus: args.mapping.setupStatus,
          assumptionPackHash: pack.packHash,
          checks,
          rawPayloadRef: rawRef,
        },
      },
      mcpCallCount: 0,
    };
    assertValidSnapshot(out.snapshot);
    return out;
  }

  const orgId = args.mapping.orgId;
  if (!orgId) {
    const fixture = loadFixture(args.repoRoot);
    const finance = financeStateFromFixture(fixture, { financeRunId });
    finance.source = "fixture";
    const rawRef = writeFinanceRawPayload(
      args.repoRoot,
      args.sessionId,
      financeRunId,
      { mode: "live_missing_org_id", packHash: pack.packHash },
    );
    const out = {
      snapshot: {
        ...args.epistemic,
        finance: {
          ...finance,
          status: "fallback" as const,
          financeAssumptionsApproved: true,
          mappingSetupStatus: args.mapping.setupStatus,
          assumptionPackHash: pack.packHash,
          mcpCallCount: 0,
          checks: runFinanceDeterministicChecks({
            packHash: pack.packHash,
            sentPackHash: pack.packHash,
          }),
          rawPayloadRef: rawRef,
        },
      },
      mcpCallCount: 0,
    };
    assertValidSnapshot(out.snapshot);
    return out;
  }

  const deadline = args.startedAtMs + FINANCE_STAGE_MS;
  const liveRun = await executeLiveFinanceRun({
    client: args.client!,
    mapping: args.mapping,
    valuesByScenario: pack.valuesByScenario,
    orgId,
    clock: args.clock,
    deadline,
  });
  mcpCallCount = liveRun.mcpCallCount;
  const ranAt = new Date().toISOString();
  const rawRef = writeFinanceRawPayload(
    args.repoRoot,
    args.sessionId,
    financeRunId,
    {
      mode: "live",
      packHash: pack.packHash,
      log: liveRun.rawLog,
    },
  );

  if (liveRun.status === "unavailable") {
    const out = {
      snapshot: {
        ...args.epistemic,
        finance: {
          status: "unavailable" as const,
          source: "live" as const,
          financeRunId,
          ranAt,
          financeAssumptionsApproved: true,
          mappingSetupStatus: args.mapping.setupStatus,
          assumptionPackHash: pack.packHash,
          mcpCallCount,
          checks: runFinanceDeterministicChecks({
            packHash: pack.packHash,
            sentPackHash: pack.packHash,
          }),
          rawPayloadRef: rawRef,
        },
      },
      mcpCallCount,
    };
    assertValidSnapshot(out.snapshot);
    return out;
  }

  const intakeFinancials = args.intake.financials;
  const out = {
    snapshot: {
      ...args.epistemic,
      finance: {
        status: "complete" as const,
        source: "live" as const,
        financeRunId,
        ranAt,
        financeAssumptionsApproved: true,
        mappingSetupStatus: args.mapping.setupStatus,
        assumptionPackHash: pack.packHash,
        mcpCallCount,
        baseline: intakeFinancials
          ? {
              cashUsd: intakeFinancials.cashUsd,
              mrrUsd: intakeFinancials.mrrUsd,
              runwayMonthsUserInput: intakeFinancials.runwayMonths,
              assumptionRefs: pack.assumptionRefs,
            }
          : undefined,
        compare: liveRun.compare,
        sensitivity: liveRun.sensitivity,
        checks: runFinanceDeterministicChecks({
          packHash: pack.packHash,
          sentPackHash: pack.packHash,
          intakeRunwayMonths: intakeFinancials?.runwayMonths,
          cashUsd: intakeFinancials?.cashUsd,
          mapped: liveRun.compare?.pilot,
        }),
        rawPayloadRef: rawRef,
      },
    },
    mcpCallCount,
  };
  assertValidSnapshot(out.snapshot);
  return out;
}

function assertValidSnapshot(snapshot: EpistemicSnapshot): void {
  const validation = validateEpistemicSnapshot(snapshot);
  if (!validation.ok) {
    const detail = Object.entries(validation.errors)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    throw new Error(`invalid epistemic snapshot after finance: ${detail}`);
  }
}
