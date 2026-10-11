import { dirname, join } from "node:path";
import { FrozenSessionError } from "@ceo-sandbox/db";
import { RunMode } from "@ceo-sandbox/domain";
import { NextResponse } from "next/server";
import { z } from "zod";
import { notFoundResponse } from "@/lib/api-errors";
import { writeRawPayload } from "@/lib/crustdata/raw-files";
import { runCrustdataResearchPath } from "@/lib/crustdata/run-path";
import {
  loadFallbackCompanies,
  selectCrustdataAdapter,
} from "@/lib/crustdata/select-adapter";
import { loadDemoCardFixture } from "@/lib/load-demo-card";
import { resolveSqlitePath } from "@/lib/resolve-sqlite-path";
import { sessionToJson } from "@/lib/session-response";
import { getStore } from "@/lib/session-store";

export const runtime = "nodejs";

const RESEARCH_DEADLINE_MS = 30_000;

function parseSessionId(id: string) {
  const result = z.string().uuid().safeParse(id);
  if (!result.success) {
    return { ok: false as const };
  }
  return { ok: true as const, id: result.data };
}

function repoRootFromSqlite(): string {
  return join(dirname(resolveSqlitePath()), "..", "..");
}

export async function POST(
  _request: Request,
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

  const { adapter } = selectCrustdataAdapter();
  const repoRoot = repoRootFromSqlite();
  const writeRaw = (ref: string, raw: unknown) => {
    writeRawPayload(repoRoot, ref, raw);
  };

  let demoHint: string | undefined;
  if (existing.mode === RunMode.Demo) {
    const card = await loadDemoCardFixture();
    demoHint = card.crustdataSearchHint;
  }

  const startedAt = Date.now();
  const { snapshot } = await runCrustdataResearchPath({
    snapshot: existing.epistemic,
    intake: existing.intake,
    sessionId: parsed.id,
    now: new Date().toISOString(),
    mode: existing.mode,
    demoHint,
    adapter,
    enrichEnabled: false,
    fallbackCompanies: loadFallbackCompanies(),
    writeRaw,
    nowMs: () => Date.now(),
    deadlineMs: startedAt + RESEARCH_DEADLINE_MS,
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
}
