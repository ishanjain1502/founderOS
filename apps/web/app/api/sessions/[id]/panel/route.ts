import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomInt, randomUUID } from "node:crypto";
import { FrozenSessionError } from "@ceo-sandbox/db";
import { RunMode, panelSummarySchema } from "@ceo-sandbox/domain";
import { NextResponse } from "next/server";
import { z } from "zod";
import { notFoundResponse } from "@/lib/api-errors";
import { writeRawPayload } from "@/lib/crustdata/raw-files";
import { loadDemoCardFixture } from "@/lib/load-demo-card";
import {
  runPanelPath,
  type PanelSummaryAndRows,
} from "@/lib/panel/run-path";
import { resolveSqlitePath } from "@/lib/resolve-sqlite-path";
import { sessionToJson } from "@/lib/session-response";
import { getStore } from "@/lib/session-store";

export const runtime = "nodejs";

const TERMINAL_PANEL_STATUSES = new Set([
  "complete",
  "incomplete",
  "failed",
  "fallback",
  "unavailable",
]);

const bodySchema = z.object({
  n: z.number().int().min(10).max(1000).optional(),
  rerun: z.boolean().optional().default(false),
});

function parseSessionId(id: string) {
  const result = z.string().uuid().safeParse(id);
  if (!result.success) {
    return { ok: false as const };
  }
  return { ok: true as const, id: result.data };
}

function repoRootFromSqlite(): string {
  const hinted = join(dirname(resolveSqlitePath()), "..", "..");
  if (existsSync(join(hinted, "pnpm-workspace.yaml"))) {
    return hinted;
  }
  let dir = process.cwd();
  while (true) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return hinted;
    }
    dir = parent;
  }
}

function isTerminalPanel(panel: { status: string }): boolean {
  return TERMINAL_PANEL_STATUSES.has(panel.status);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsed = parseSessionId(id);
  if (!parsed.ok) {
    return notFoundResponse();
  }

  const store = getStore();
  const existing = store.getSession(parsed.id);
  if (!existing) {
    return notFoundResponse();
  }
  if (existing.status !== "frozen") {
    return NextResponse.json({ error: "not_frozen" }, { status: 409 });
  }
  if (!existing.epistemic) {
    return NextResponse.json(
      { error: "missing_epistemic_snapshot" },
      { status: 500 },
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const json = await request.json();
    const parsedBody = bodySchema.safeParse(json);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    body = parsedBody.data;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const panel = existing.epistemic.panel;
  const mayRerun =
    body.rerun === true &&
    existing.mode === RunMode.Full &&
    panel !== undefined &&
    isTerminalPanel(panel) &&
    panel.rerunCount === 0;

  if (panel !== undefined && isTerminalPanel(panel) && !mayRerun) {
    return NextResponse.json(sessionToJson(existing));
  }

  const n = body.n;
  if (panel === undefined && n === undefined) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const nResolved = n ?? panel!.nRequested;

  const repoRoot = repoRootFromSqlite();
  const writeRaw = (ref: string, raw: unknown) => {
    writeRawPayload(repoRoot, ref, raw);
  };

  const loadFixture = (): PanelSummaryAndRows => {
    const raw = readFileSync(
      join(repoRoot, "fixtures/panel/demo_run.json"),
      "utf8",
    );
    const fixture = JSON.parse(raw) as PanelSummaryAndRows;
    if (!Array.isArray(fixture.rows?.profiles)) {
      throw new Error("fixture rows.profiles must be an array");
    }
    if (!Array.isArray(fixture.rows?.evaluations)) {
      throw new Error("fixture rows.evaluations must be an array");
    }
    const summary = panelSummarySchema.parse(fixture.summary);
    return {
      summary,
      rows: {
        profiles: fixture.rows.profiles,
        evaluations: fixture.rows.evaluations,
      },
    };
  };

  let panelSeed: string;
  if (existing.mode === RunMode.Demo) {
    const card = await loadDemoCardFixture();
    panelSeed = String(card.panelSeed);
  } else {
    panelSeed = String(randomInt(0, 2_147_483_647));
  }

  const rerunCount = mayRerun ? 1 : 0;
  const startedAtMs = Date.now();

  try {
    const { snapshot } = await runPanelPath({
      snapshot: existing.epistemic,
      intake: existing.intake,
      sessionId: parsed.id,
      mode: existing.mode,
      n: nResolved,
      panelSeed,
      rerunCount,
      apiKey: process.env.COMMANDCODE_API_KEY,
      fetchFn: fetch,
      nowMs: () => Date.now(),
      startedAtMs,
      writeRaw,
      loadFixture,
      newRunId: () => randomUUID(),
    });

    try {
      const record = store.applyEpistemicSnapshot(parsed.id, snapshot);
      return NextResponse.json(sessionToJson(record));
    } catch (error) {
      if (error instanceof FrozenSessionError) {
        return NextResponse.json({ error: "not_frozen" }, { status: 409 });
      }
      throw error;
    }
  } catch {
    return NextResponse.json(
      { error: "panel_run_failed" },
      { status: 500 },
    );
  }
}
