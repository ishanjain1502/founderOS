import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, afterEach } from "vitest";
import { emptyIntakeDraft, isIntakeComplete } from "@ceo-sandbox/domain";
import { RunMode } from "@ceo-sandbox/domain";
import { FrozenSessionError, openSessionStore } from "./sessions";

function completeDemoLike(mode: RunMode) {
  const d = emptyIntakeDraft(mode);
  d.company = {
    name: "Acme",
    productSummary: "B2B SaaS",
    category: "Workflow",
    primaryBuyer: "Ops lead",
    jobToBeDone: "Track work",
    deliveryModel: "saas",
    sizeBand: "mid",
  };
  d.market = { targetMarketBehavior: "SMB and enterprise buyers" };
  d.constraints = { budgetUsd: 1000, executionMonths: 3 };
  d.feature = {
    description: "AI add-on",
    changeType: "feature",
  };
  d.decision = { questionText: "Should we launch it?" };
  d.financials = { provideLater: true };
  return d;
}

describe("openSessionStore", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
    dirs.length = 0;
  });

  function store() {
    const dir = mkdtempSync(join(tmpdir(), "ceo-db-"));
    dirs.push(dir);
    return openSessionStore(join(dir, "sandbox.sqlite"));
  }

  it("creates, reads, patches, approves, starts, and rejects frozen patch", () => {
    const db = store();
    const created = db.createSession({
      mode: RunMode.Full,
      intake: emptyIntakeDraft(RunMode.Full),
    });
    expect(created.status).toBe("draft");
    expect(created.questionRevision).toBe(1);
    expect(created.intake.currency).toBe("USD");

    const again = db.getSession(created.id);
    expect(again?.id).toBe(created.id);

    const patched = db.updateIntake(created.id, {
      ...created.intake,
      company: { ...created.intake.company, name: "N" },
    });
    expect(patched.intake.company?.name).toBe("N");
    expect(patched.status).toBe("draft");

    expect(() => db.approveSession(created.id)).toThrow(/incomplete|intake/i);

    db.updateIntake(created.id, completeDemoLike(RunMode.Full));
    expect(isIntakeComplete(db.getSession(created.id)!.intake).ok).toBe(true);

    const approved = db.approveSession(created.id);
    expect(approved.status).toBe("approved");
    expect(approved.approvedAt).toBeTruthy();

    const afterEdit = db.updateIntake(created.id, {
      ...approved.intake,
      decision: { questionText: "Edited?" },
    });
    expect(afterEdit.status).toBe("draft");

    db.approveSession(created.id);
    const started = db.startSession(created.id);
    expect(started.status).toBe("frozen");
    expect(started.frozenAt).toBeTruthy();

    expect(() => db.updateIntake(created.id, started.intake)).toThrow(
      FrozenSessionError,
    );

    const reopened = openSessionStore(join(dirs[0], "sandbox.sqlite"));
    expect(reopened.getSession(created.id)?.status).toBe("frozen");
  });

  it("start without approve throws", () => {
    const db = store();
    const row = db.createSession({
      mode: RunMode.Full,
      intake: completeDemoLike(RunMode.Full),
    });
    expect(() => db.startSession(row.id)).toThrow(/not_approved/);
  });

  it("start writes epistemic snapshot; draft epistemic is null; freeze still blocks patch", () => {
    const db = store();
    const created = db.createSession({
      mode: RunMode.Demo,
      intake: completeDemoLike(RunMode.Demo),
    });
    expect(created.epistemic).toBeNull();
    db.approveSession(created.id);
    const started = db.startSession(created.id);
    expect(started.status).toBe("frozen");
    expect(started.epistemic).not.toBeNull();
    expect(started.epistemic?.evidence.length).toBe(1);
    expect(started.epistemic?.evidence[0]?.vendor).toBe("demo_fixture");

    const reopened = openSessionStore(join(dirs[0], "sandbox.sqlite"));
    expect(reopened.getSession(created.id)?.epistemic?.evidence[0]?.vendor).toBe(
      "demo_fixture",
    );
  });

  it("Full start has empty evidence", () => {
    const db = store();
    const created = db.createSession({
      mode: RunMode.Full,
      intake: completeDemoLike(RunMode.Full),
    });
    db.approveSession(created.id);
    const started = db.startSession(created.id);
    expect(started.epistemic?.evidence).toEqual([]);
  });
});
