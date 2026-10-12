import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadCfoAiMappingFromJson, type CfoAiMapping } from "@ceo-sandbox/domain/server";

export function cfoMappingPathFromRepoRoot(repoRoot: string): string {
  return join(repoRoot, "config", "cfo-ai-mapping.json");
}

export function loadCfoMappingFromRepo(repoRoot: string): CfoAiMapping {
  const raw = readFileSync(cfoMappingPathFromRepoRoot(repoRoot), "utf8");
  return loadCfoAiMappingFromJson(JSON.parse(raw));
}
