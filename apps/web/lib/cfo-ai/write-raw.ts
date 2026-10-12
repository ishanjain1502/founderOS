import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type FinanceMcpLogEntry = {
  at: string;
  tool: string;
  args: Record<string, unknown>;
  response: unknown;
};

export function writeFinanceRawPayload(
  repoRoot: string,
  sessionId: string,
  financeRunId: string,
  payload: unknown,
): string {
  const rel = `data/cfo-raw/${sessionId}/${financeRunId}.json`;
  const abs = join(repoRoot, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(payload, null, 2), "utf8");
  return rel;
}
