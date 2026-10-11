import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

export function resolveSqlitePath(): string {
  if (process.env.SANDBOX_SQLITE_PATH) {
    return process.env.SANDBOX_SQLITE_PATH;
  }
  let dir = process.cwd();
  while (true) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
      return join(dir, "data", "sandbox.sqlite");
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error("Could not find pnpm-workspace.yaml");
    }
    dir = parent;
  }
}
