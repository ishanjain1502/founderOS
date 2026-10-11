import {
  emptyIntakeDraft,
  parseRunMode,
  RunMode,
} from "@ceo-sandbox/domain";
import { demoCardToIntakeDraft } from "@ceo-sandbox/domain/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  badRequest,
  notFoundResponse,
  zodErrorResponse,
} from "@/lib/api-errors";
import {
  DEMO_CARD_FIXTURE_ID,
  loadDemoCardFixture,
} from "@/lib/load-demo-card";
import { setLastSessionCookie } from "@/lib/session-cookie";
import { sessionToJson } from "@/lib/session-response";
import { getStore } from "@/lib/session-store";

export const runtime = "nodejs";

const createBodySchema = z.object({
  mode: z.string(),
  demoCardId: z.string().optional(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return badRequest({ _: "Invalid JSON body" });
  }

  const parsed = createBodySchema.safeParse(json);
  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  let mode: RunMode;
  try {
    mode = parseRunMode(parsed.data.mode);
  } catch {
    return NextResponse.json(
      { errors: { mode: `Unknown run mode: ${parsed.data.mode}` } },
      { status: 400 },
    );
  }

  const { demoCardId } = parsed.data;

  if (mode === RunMode.Demo) {
    if (demoCardId !== undefined && demoCardId !== DEMO_CARD_FIXTURE_ID) {
      return notFoundResponse();
    }
    try {
      const card = await loadDemoCardFixture();
      const intake = demoCardToIntakeDraft(card);
      const record = getStore().createSession({ mode, intake });
      const response = NextResponse.json(sessionToJson(record), { status: 201 });
      return setLastSessionCookie(response, record.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load demo card";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const intake = emptyIntakeDraft(RunMode.Full);
  const record = getStore().createSession({ mode, intake });
  const response = NextResponse.json(sessionToJson(record), { status: 201 });
  return setLastSessionCookie(response, record.id);
}
