import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function zodErrorsToRecord(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    errors[path || "_"] = issue.message;
  }
  return errors;
}

export function badRequest(errors: Record<string, string>) {
  return NextResponse.json({ errors }, { status: 400 });
}

export function zodErrorResponse(error: ZodError) {
  return badRequest(zodErrorsToRecord(error));
}

export function notFoundResponse() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export function frozenResponse() {
  return NextResponse.json({ error: "frozen" }, { status: 409 });
}
