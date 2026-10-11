import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ScopeCheckStatus } from "@ceo-sandbox/domain";

describe("POST /api/sessions/:id/recap/scope-check", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
    delete process.env.SANDBOX_SQLITE_PATH;
    delete process.env.LLM_PROVIDER;
    delete process.env.LLM_MODEL;
    delete process.env.OPENAI_API_KEY;
  });

  it("demo session returns skipped without calling LLM", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ceo-web-scope-"));
    dirs.push(dir);
    process.env.SANDBOX_SQLITE_PATH = join(dir, "sandbox.sqlite");

    const { POST: create } = await import("../../../route");
    const createdRes = await create(
      new Request("http://localhost/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "demo" }),
      }),
    );
    expect(createdRes.status).toBe(201);
    const created = await createdRes.json();

    const { POST: scopeCheck } = await import("./route");
    const res = await scopeCheck(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe(ScopeCheckStatus.Skipped);
    expect(body.ranAt).toBeTruthy();
  });
});
