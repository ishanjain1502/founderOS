import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { emptyIntakeDraft, RunMode } from "@ceo-sandbox/domain";
import { getStore } from "./session-store";

describe("getStore", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
    delete process.env.SANDBOX_SQLITE_PATH;
  });

  it("opens SQLite and createSession via resolveSqlitePath", () => {
    const dir = mkdtempSync(join(tmpdir(), "ceo-store-"));
    dirs.push(dir);
    process.env.SANDBOX_SQLITE_PATH = join(dir, "sandbox.sqlite");

    const record = getStore().createSession({
      mode: RunMode.Demo,
      intake: emptyIntakeDraft(RunMode.Demo),
    });

    expect(record.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(record.status).toBe("draft");
  });
});
