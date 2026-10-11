import { RunMode, ScopeCheckStatus } from "@ceo-sandbox/domain";
import { NextResponse } from "next/server";
import { z } from "zod";
import { notFoundResponse } from "@/lib/api-errors";
import { classifyIntakeScope } from "@/lib/scope-check";
import { getStore } from "@/lib/session-store";

export const runtime = "nodejs";

function parseSessionId(id: string) {
  const result = z.string().uuid().safeParse(id);
  if (!result.success) {
    return { ok: false as const };
  }
  return { ok: true as const, id: result.data };
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

  const ranAt = new Date().toISOString();

  if (existing.status === "frozen") {
    const stored = existing.intake.scopeCheck ?? {
      status: ScopeCheckStatus.Unknown,
    };
    return NextResponse.json(stored);
  }

  if (existing.mode === RunMode.Demo) {
    const scopeCheck = { status: ScopeCheckStatus.Skipped, ranAt };
    const record = store.updateIntake(parsed.id, {
      ...existing.intake,
      scopeCheck,
    });
    return NextResponse.json(record.intake.scopeCheck ?? scopeCheck);
  }

  const intake = existing.intake;
  const result = await classifyIntakeScope({
    questionText: intake.decision?.questionText ?? "",
    featureDescription: intake.feature?.description ?? "",
    changeType: intake.feature?.changeType ?? "",
    productSummary: intake.company?.productSummary ?? "",
    alreadyLive: intake.alreadyLive ?? false,
  });

  const scopeCheck = {
    status: result.status,
    reason: result.reason,
    ranAt: result.ranAt,
  };

  const merged = {
    ...intake,
    scopeCheck,
    ...(result.status === ScopeCheckStatus.OutOfScope
      ? { outsideSpecIntent: true }
      : {}),
  };

  const record = store.updateIntake(parsed.id, merged);
  return NextResponse.json(record.intake.scopeCheck ?? scopeCheck);
}
