import { describe, expect, it } from "vitest";
import {
  buildCfoWorkspaceKey,
  cfoWorkspaceSchema,
  createInitialCfoWorkspace,
  slugifyCompanyName,
} from "./cfo-workspace";

describe("slugifyCompanyName", () => {
  it("slugifies and truncates", () => {
    expect(slugifyCompanyName("Acme Analytics")).toBe("acme-analytics");
    expect(slugifyCompanyName("  ")).toBe("company");
  });
});

describe("buildCfoWorkspaceKey", () => {
  it("combines slug and ISO createdAt", () => {
    expect(
      buildCfoWorkspaceKey("Acme", "2026-10-12T01:30:00.000Z"),
    ).toBe("acme-2026-10-12T01:30:00.000Z");
  });
});

describe("createInitialCfoWorkspace", () => {
  it("starts pending without cfoOrgId", () => {
    const ws = createInitialCfoWorkspace({
      companyName: "Acme",
      sessionCreatedAt: "2026-10-12T01:30:00.000Z",
    });
    expect(cfoWorkspaceSchema.safeParse(ws).success).toBe(true);
    expect(ws.status).toBe("pending");
    expect(ws.cfoOrgId).toBeUndefined();
    expect(ws.workspaceKey).toBe("acme-2026-10-12T01:30:00.000Z");
  });
});
