import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadDemoCard } from "@ceo-sandbox/domain";

export const DEMO_CARD_FIXTURE_ID = "demo-ai-analytics-premium";

function fixturePath(): string {
  return path.join(
    process.cwd(),
    "..",
    "..",
    "fixtures",
    "demo",
    "decision-card-ai-analytics.json",
  );
}

export async function loadDemoCardFixture() {
  const raw = await readFile(fixturePath(), "utf8");
  return loadDemoCard(JSON.parse(raw));
}
