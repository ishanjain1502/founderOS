import { describe, expect, it } from "vitest";
import { RunMode, emptyIntakeDraft } from "@ceo-sandbox/domain";
import type { SessionRecord } from "@ceo-sandbox/db";
import {
  attachCfoWorkspaceToIntake,
  initializeSessionCfoWorkspace,
  provisionCfoWorkspace,
} from "./provision";

const baseRecord = (): SessionRecord => ({
  id: "00000000-0000-4000-8000-000000000099",
  contractVersion: 1,
  mode: RunMode.Full,
  status: "draft",
  questionRevision: 1,
  intake: emptyIntakeDraft(RunMode.Full),
  createdAt: "2026-10-12T01:30:00.000Z",
  updatedAt: "2026-10-12T01:30:00.000Z",
  approvedAt: null,
  frozenAt: null,
  epistemic: null,
});

describe("attachCfoWorkspaceToIntake", () => {
  it("sets workspaceKey from company and createdAt", () => {
    const intake = emptyIntakeDraft(RunMode.Full);
    intake.company = { name: "Acme", productSummary: "x" };
    const out = attachCfoWorkspaceToIntake(intake, "2026-10-12T01:30:00.000Z");
    expect(out.cfoWorkspace?.workspaceKey).toBe(
      "acme-2026-10-12T01:30:00.000Z",
    );
  });

  it("does not replace an existing workspaceKey", () => {
    const intake = emptyIntakeDraft(RunMode.Full);
    intake.cfoWorkspace = {
      workspaceKey: "existing-key",
      status: "pending",
      bootstrapStatus: "pending",
    };
    const out = attachCfoWorkspaceToIntake(intake, "2026-10-12T01:30:00.000Z");
    expect(out.cfoWorkspace?.workspaceKey).toBe("existing-key");
  });
});

describe("provisionCfoWorkspace", () => {
  it("stub adapter keeps pending", async () => {
    const ws = await provisionCfoWorkspace({
      workspaceKey: "acme-2026-10-12T01:30:00.000Z",
      status: "pending",
      bootstrapStatus: "pending",
    });
    expect(ws.status).toBe("pending");
    expect(ws.cfoOrgId).toBeUndefined();
  });

  it("merges adapter org id when provided", async () => {
    const ws = await provisionCfoWorkspace(
      {
        workspaceKey: "k",
        status: "pending",
        bootstrapStatus: "pending",
      },
      {
        async provision() {
          return {
            status: "ready",
            cfoOrgId: "103299",
            cfoSlug: "acme-cfo",
            provisionedAt: "2026-10-12T02:00:00.000Z",
          };
        },
      },
    );
    expect(ws.status).toBe("ready");
    expect(ws.cfoOrgId).toBe("103299");
  });
});

describe("initializeSessionCfoWorkspace", () => {
  it("returns intake with cfoWorkspace", async () => {
    const record = baseRecord();
    record.intake.company = { name: "Beta", productSummary: "y" };
    const { cfoWorkspace } = await initializeSessionCfoWorkspace(record);
    expect(cfoWorkspace.workspaceKey).toBe(
      "beta-2026-10-12T01:30:00.000Z",
    );
  });
});
