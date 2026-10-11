import { deepMergeIntake } from "@ceo-sandbox/domain";
import { FrozenSessionError } from "@ceo-sandbox/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  badRequest,
  frozenResponse,
  notFoundResponse,
  zodErrorResponse,
} from "@/lib/api-errors";
import { sessionToJson } from "@/lib/session-response";
import { getStore } from "@/lib/session-store";

const patchBodySchema = z.object({
  intake: z.record(z.unknown()).optional(),
});

function parseSessionId(id: string) {
  const result = z.string().uuid().safeParse(id);
  if (!result.success) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const, id: result.data };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsed = parseSessionId(id);
  if (!parsed.ok) {
    return notFoundResponse();
  }

  const record = getStore().getSession(parsed.id);
  if (!record) {
    return notFoundResponse();
  }

  return NextResponse.json(sessionToJson(record));
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsedId = parseSessionId(id);
  if (!parsedId.ok) {
    return badRequest(zodErrorsFromUuid(parsedId.error));
  }

  const store = getStore();
  const existing = store.getSession(parsedId.id);
  if (!existing) {
    return notFoundResponse();
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return zodErrorResponse(
      new z.ZodError([
        { code: "custom", path: [], message: "Invalid JSON body" },
      ]),
    );
  }

  const parsedBody = patchBodySchema.safeParse(json);
  if (!parsedBody.success) {
    return zodErrorResponse(parsedBody.error);
  }

  const merged = deepMergeIntake(
    existing.intake,
    parsedBody.data.intake ?? {},
  );

  try {
    const record = store.updateIntake(parsedId.id, merged);
    return NextResponse.json(sessionToJson(record));
  } catch (error) {
    if (error instanceof FrozenSessionError) {
      return frozenResponse();
    }
    throw error;
  }
}

function zodErrorsFromUuid(error: z.ZodError): Record<string, string> {
  return { id: error.issues[0]?.message ?? "Invalid UUID" };
}
