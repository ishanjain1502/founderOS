import { z } from "zod";
import { claimSchema } from "./claim";
import { evidenceSchema, type Evidence } from "./evidence";
import { inferenceSchema } from "./recommendation";

export const epistemicSnapshotSchema = z
  .object({
    contractVersion: z.literal(1),
    evidence: z.array(evidenceSchema),
    claims: z.array(claimSchema),
    inferences: z.array(inferenceSchema),
  })
  .strict();

export type EpistemicSnapshot = z.infer<typeof epistemicSnapshotSchema>;

export function emptyEpistemicSnapshot(): EpistemicSnapshot {
  return {
    contractVersion: 1,
    evidence: [],
    claims: [],
    inferences: [],
  };
}

function evidenceHasIdentity(row: Evidence): boolean {
  if (row.quarantine === true) {
    return true;
  }
  if (row.externalId && row.externalId.length > 0) {
    return true;
  }
  if (row.canonicalUrl && row.canonicalUrl.length > 0) {
    return true;
  }
  if (row.identityKey?.startsWith("fallback:")) {
    return true;
  }
  return false;
}

function flattenZodErrors(
  error: z.ZodError,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return errors;
}

export function validateEpistemicSnapshot(snapshot: unknown): {
  ok: boolean;
  errors: Record<string, string>;
  quarantinedIds: string[];
} {
  const parsed = epistemicSnapshotSchema.safeParse(snapshot);
  if (!parsed.success) {
    return {
      ok: false,
      errors: flattenZodErrors(parsed.error),
      quarantinedIds: [],
    };
  }

  const errors: Record<string, string> = {};
  const data = parsed.data;

  const quarantinedIds = data.evidence
    .filter((row) => row.quarantine === true)
    .map((row) => row.id);

  const refIds = new Set([
    ...data.evidence.map((row) => row.id),
    ...data.claims.map((row) => row.id),
  ]);

  for (let i = 0; i < data.inferences.length; i += 1) {
    const inference = data.inferences[i];
    const unresolved = inference.refIds.some((id) => !refIds.has(id));
    if (unresolved) {
      errors[`inferences.${i}.refIds`] =
        "Each refId must reference an evidence or claim id in this snapshot";
    }
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    quarantinedIds,
  };
}

export function epistemicWarnings(
  snapshot: EpistemicSnapshot,
): { path: string; message: string }[] {
  const warnings: { path: string; message: string }[] = [];

  const quarantined = snapshot.evidence.filter((row) => row.quarantine === true);
  if (quarantined.length > 0) {
    warnings.push({
      path: "evidence",
      message: `${quarantined.length} evidence item(s) hidden (missing identity).`,
    });
  }

  for (const row of snapshot.evidence) {
    if (!evidenceHasIdentity(row)) {
      continue;
    }
    if (!row.canonicalUrl && !row.vendorTimestamp) {
      warnings.push({
        path: `evidence.${row.id}`,
        message: "Incomplete optional provenance.",
      });
    }
  }

  return warnings;
}
