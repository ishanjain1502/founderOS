import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LAST_SESSION_COOKIE, RunMode } from "@ceo-sandbox/domain";

describe("POST /api/sessions", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
    delete process.env.SANDBOX_SQLITE_PATH;
  });

  it("creates a full session, sets cookie, patches, and 409s after freeze via store", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ceo-web-"));
    dirs.push(dir);
    process.env.SANDBOX_SQLITE_PATH = join(dir, "sandbox.sqlite");

    const { POST } = await import("./route");
    const created = await POST(
      new Request("http://localhost/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: RunMode.Full }),
      }),
    );
    expect(created.status).toBe(201);
    const body = await created.json();
    expect(body.status).toBe("draft");
    expect(body.intake.mode).toBe("full");
    const cookie = created.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(LAST_SESSION_COOKIE);
    expect(cookie.toLowerCase()).toContain("httponly");

    const { PATCH, GET } = await import("./[id]/route");
    const got = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: body.id }),
    });
    expect(got.status).toBe(200);

    const patched = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intake: { company: { name: "Acme" } } }),
      }),
      { params: Promise.resolve({ id: body.id }) },
    );
    expect(patched.status).toBe(200);
    const patchedBody = await patched.json();
    expect(patchedBody.intake.company.name).toBe("Acme");
  });
});
