/** Substrings forbidden in user-facing report/export copy (SP-02-Q43). */
export const FORBIDDEN_PHRASES = [
  "customers said",
  "survey",
  "forecast",
  "will generate",
  "proven demand",
  "real market proof",
] as const;

export type ForbiddenPhrase = (typeof FORBIDDEN_PHRASES)[number];

/** Returns forbidden phrases found in `text` (case-insensitive substring match). */
export function findForbiddenPhrases(text: string): ForbiddenPhrase[] {
  const lower = text.toLowerCase();
  return FORBIDDEN_PHRASES.filter((phrase) => lower.includes(phrase));
}
