import { RunMode } from "./run-mode";

export type BuildCrustdataQueryInput = {
  mode: RunMode;
  category?: string;
  featureTitle?: string;
  featureDescription?: string;
  geography?: string;
  competitors?: string[];
  demoHint?: string;
};

export function buildCrustdataQuery(
  input: BuildCrustdataQueryInput,
): { ok: true; query: string } | { ok: false; error: string } {
  if (input.mode === RunMode.Demo) {
    const hint = input.demoHint?.trim();
    if (!hint) {
      return { ok: false, error: "missing_demo_hint" };
    }
    return { ok: true, query: hint };
  }

  const category = input.category?.trim();
  if (!category) {
    return { ok: false, error: "missing_category" };
  }

  const keywords = [input.featureTitle, (input.featureDescription ?? "").slice(0, 80)]
    .filter(Boolean)
    .join(" ");

  let query = `${category} companies`;
  if (keywords) {
    query += ` related to ${keywords}`;
  }
  const geography = input.geography?.trim();
  if (geography) {
    query += ` in ${geography}`;
  }
  if (input.competitors?.length) {
    query += ` including ${input.competitors.join(", ")}`;
  }

  return { ok: true, query };
}
