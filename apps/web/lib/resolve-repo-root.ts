import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { resolveSqlitePath } from "./resolve-sqlite-path";

export function resolveRepoRoot(): string {
  const hinted = join(dirname(resolveSqlitePath()), "..", "..");
  if (existsSync(join(hinted, "pnpm-workspace.yaml"))) {
    return hinted;
  }
  let dir = process.cwd();
  while (true) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return hinted;
    }
    dir = parent;
  }
}
