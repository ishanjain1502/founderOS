import { z } from "zod";
import { baseEntitySchema } from "./base";

function hasExternalIdentity(data: {
  externalId?: string;
  canonicalUrl?: string;
  identityKey?: string;
}): boolean {
  if (data.externalId && data.externalId.length > 0) {
    return true;
  }
  if (data.canonicalUrl && data.canonicalUrl.length > 0) {
    return true;
  }
  if (data.identityKey?.startsWith("fallback:")) {
    return true;
  }
  return false;
}

/** External evidence with provenance (SP-02 §2, Appendix A). */
export const evidenceSchema = baseEntitySchema
  .extend({
    sessionId: z.string().uuid(),
    summary: z.string().min(1),
    externalId: z.string().min(1).optional(),
    canonicalUrl: z.string().url().optional(),
    /** Stable key when no provider id or URL (e.g. `fallback:crustdata:{runId}`). */
    identityKey: z.string().min(1).optional(),
    retrievedAt: z.string().datetime(),
    sourceTimeUnknown: z.boolean().optional(),
    vendorTimestamp: z.string().optional(),
  })
  .refine(hasExternalIdentity, {
    message:
      "Evidence requires external identity (externalId, canonicalUrl, or fallback identityKey)",
  });

export type Evidence = z.infer<typeof evidenceSchema>;
