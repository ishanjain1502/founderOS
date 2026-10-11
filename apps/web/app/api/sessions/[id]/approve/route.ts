import { isIntakeComplete } from "@ceo-sandbox/domain";
import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, notFoundResponse } from "@/lib/api-errors";
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

  try {
    const record = store.approveSession(parsed.id);
    return NextResponse.json(sessionToJson(record));
  } catch (error) {
    if (error instanceof Error && error.message === "incomplete_intake") {
      const session = store.getSession(parsed.id);
      const { errors } = isIntakeComplete(session!.intake);
      return badRequest(errors);
    }
    throw error;
  }
}
