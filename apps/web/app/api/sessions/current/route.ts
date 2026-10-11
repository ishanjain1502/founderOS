import { notFoundResponse } from "@/lib/api-errors";
import { readLastSessionCookie } from "@/lib/session-cookie";
import { sessionToJson } from "@/lib/session-response";
import { getStore } from "@/lib/session-store";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const sessionId = readLastSessionCookie(request);
  if (!sessionId) {
    return notFoundResponse();
  }

  const record = getStore().getSession(sessionId);
  if (!record) {
    return notFoundResponse();
  }

  return NextResponse.json(sessionToJson(record));
}
