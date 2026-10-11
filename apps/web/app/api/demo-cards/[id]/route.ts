import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadDemoCard } from "@ceo-sandbox/domain";
import { NextResponse } from "next/server";

const DEMO_CARD_FIXTURE_ID = "demo-ai-analytics-premium";

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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (id !== DEMO_CARD_FIXTURE_ID) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const raw = await readFile(fixturePath(), "utf8");
    const card = loadDemoCard(JSON.parse(raw));
    return NextResponse.json(card);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load demo card";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
