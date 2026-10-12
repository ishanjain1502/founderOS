import type { CfoWorkspace } from "@ceo-sandbox/domain";
import { createInitialCfoWorkspace } from "@ceo-sandbox/domain";
import type { SessionRecord } from "@ceo-sandbox/db";
import type { IntakeDraftPartial } from "@ceo-sandbox/domain";

export type CfoProvisioningResult = Pick<
  CfoWorkspace,
  "status" | "cfoOrgId" | "cfoSlug" | "provisionedAt" | "error"
>;

export type CfoProvisioningAdapter = {
  provision(input: {
    workspaceKey: string;
    displayName?: string;
  }): Promise<CfoProvisioningResult>;
};

/** Until cfo documents workspace creation API, leave status pending. */
export const stubCfoProvisioningAdapter: CfoProvisioningAdapter = {
  async provision() {
    return { status: "pending" };
  },
};

export function companyNameFromIntake(intake: IntakeDraftPartial): string {
  const name = intake.company?.name?.trim();
  return name && name.length > 0 ? name : "company";
}

export function attachCfoWorkspaceToIntake(
  intake: IntakeDraftPartial,
  sessionCreatedAt: string,
): IntakeDraftPartial {
  if (intake.cfoWorkspace?.workspaceKey) {
    return intake;
  }
  const companyName = companyNameFromIntake(intake);
  return {
    ...intake,
    cfoWorkspace: createInitialCfoWorkspace({
      companyName,
      sessionCreatedAt,
      displayName: companyName !== "company" ? undefined : "CEO Sandbox",
    }),
  };
}

export async function provisionCfoWorkspace(
  workspace: CfoWorkspace,
  adapter: CfoProvisioningAdapter = stubCfoProvisioningAdapter,
): Promise<CfoWorkspace> {
  const result = await adapter.provision({
    workspaceKey: workspace.workspaceKey,
    displayName: workspace.displayName,
  });

  return {
    ...workspace,
    status: result.status,
    ...(result.cfoOrgId ? { cfoOrgId: result.cfoOrgId } : {}),
    ...(result.cfoSlug ? { cfoSlug: result.cfoSlug } : {}),
    ...(result.provisionedAt ? { provisionedAt: result.provisionedAt } : {}),
    ...(result.error ? { error: result.error } : {}),
  };
}

export async function initializeSessionCfoWorkspace(
  record: SessionRecord,
  adapter: CfoProvisioningAdapter = stubCfoProvisioningAdapter,
): Promise<{ intake: IntakeDraftPartial; cfoWorkspace: CfoWorkspace }> {
  const withKey = attachCfoWorkspaceToIntake(record.intake, record.createdAt);
  const base = withKey.cfoWorkspace!;
  const cfoWorkspace = await provisionCfoWorkspace(base, adapter);
  return {
    intake: { ...withKey, cfoWorkspace },
    cfoWorkspace,
  };
}
