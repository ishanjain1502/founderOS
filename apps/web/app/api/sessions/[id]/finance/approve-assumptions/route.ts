import { FrozenSessionError } from "@ceo-sandbox/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { notFoundResponse } from "@/lib/api-errors";
import { sessionToJson } from "@/lib/session-response";
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
  if (existing.status !== "frozen") {
    return NextResponse.json({ error: "not_frozen" }, { status: 409 });
  }
  if (!existing.epistemic) {
    return NextResponse.json(
      { error: "missing_epistemic_snapshot" },
      { status: 500 },
    );
  }

  const finance = existing.epistemic.finance ?? { status: "idle" };
  const snapshot = {
    ...existing.epistemic,
    finance: {
      ...finance,
      financeAssumptionsApproved: true,
    },
  };

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
