import { z } from "zod";

export const cfoWorkspaceStatusSchema = z.enum([
  "pending",
  "ready",
  "failed",
]);

export const cfoBootstrapStatusSchema = z.enum([
  "pending",
  "ready",
  "failed",
]);

export const cfoScenarioRefsSchema = z.object({
  pilot: z.string().min(1),
  broad_launch: z.string().min(1),
});

export const cfoWorkspaceSchema = z
  .object({
    workspaceKey: z.string().min(1),
    status: cfoWorkspaceStatusSchema,
    bootstrapStatus: cfoBootstrapStatusSchema,
    cfoOrgId: z.string().min(1).optional(),
    cfoSlug: z.string().min(1).optional(),
    displayName: z.string().min(1).optional(),
    provisionedAt: z.string().datetime().optional(),
    scenarioRefs: cfoScenarioRefsSchema.optional(),
    error: z.string().max(500).optional(),
  })
  .strict();

export type CfoWorkspace = z.infer<typeof cfoWorkspaceSchema>;

const SLUG_MAX = 48;

/** Lowercase hyphenated slug from company name (SP-07 workspaceKey prefix). */
export function slugifyCompanyName(name: string): string {
  const trimmed = name.trim().toLowerCase();
  const slug = trimmed
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const base = slug.length > 0 ? slug : "company";
  return base.length > SLUG_MAX ? base.slice(0, SLUG_MAX) : base;
}

/**
 * App-owned workspace identity: `{org_name_slug}-{session.createdAt UTC ISO}`.
 * Not passed to cfo MCP as org_id.
 */
export function buildCfoWorkspaceKey(
  companyName: string,
  sessionCreatedAt: string,
): string {
  return `${slugifyCompanyName(companyName)}-${sessionCreatedAt}`;
}

export function createInitialCfoWorkspace(input: {
  companyName: string;
  sessionCreatedAt: string;
  displayName?: string;
}): CfoWorkspace {
  const workspaceKey = buildCfoWorkspaceKey(
    input.companyName,
    input.sessionCreatedAt,
  );
  const displayName =
    input.displayName?.trim() ||
    (input.companyName.trim() ? `${input.companyName.trim()} — CEO Sandbox` : undefined);

  return {
    workspaceKey,
    status: "pending",
    bootstrapStatus: "pending",
    ...(displayName ? { displayName } : {}),
  };
}
