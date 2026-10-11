import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export function writeRawPayload(
  repoRoot: string,
  ref: string,
  json: unknown,
): void {
  const path = join(repoRoot, ref);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(json, null, 2), "utf8");
}
