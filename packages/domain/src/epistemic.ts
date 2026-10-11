export enum EpistemicKind {
  Observed = "observed",
  Simulated = "simulated",
  Assumed = "assumed",
  Inferred = "inferred",
}

export function epistemicLabel(kind: EpistemicKind): string {
  const labels: Record<EpistemicKind, string> = {
    [EpistemicKind.Observed]: "Observed",
    [EpistemicKind.Simulated]: "Simulated",
    [EpistemicKind.Assumed]: "Assumed",
    [EpistemicKind.Inferred]: "Inferred",
  };
  return labels[kind];
}

export const CLAIM_SAFETY_COPY = {
  panelSimulated:
    "Customer panel results are simulated, not survey data.",
  financeNotForecast:
    "Financial figures are illustrative scenarios, not a verified forecast.",
  competitorNotDemand:
    "Competitor activity does not prove customer demand for this feature.",
  fallbackBanner:
    "This section used a labeled fallback, not live vendor data.",
} as const;
