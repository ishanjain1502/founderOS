import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { openSessionStore } from "@ceo-sandbox/db";
import { resolveSqlitePath } from "./resolve-sqlite-path";

export function getStore() {
  const filePath = resolveSqlitePath();
  mkdirSync(dirname(filePath), { recursive: true });
  return openSessionStore(filePath);
}
