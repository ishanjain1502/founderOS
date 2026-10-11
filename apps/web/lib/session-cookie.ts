import { NextResponse } from "next/server";
import { LAST_SESSION_COOKIE } from "@ceo-sandbox/domain";

export function setLastSessionCookie(res: NextResponse, sessionId: string) {
  res.cookies.set(LAST_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return res;
}

export function readLastSessionCookie(request: Request): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  const parts = header.split(";");
  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=");
    if (k === LAST_SESSION_COOKIE) return rest.join("=");
  }
  return undefined;
}
