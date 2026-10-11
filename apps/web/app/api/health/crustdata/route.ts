import { NextResponse } from "next/server";
import { isCrustdataLive } from "@/lib/crustdata/select-adapter";

export const runtime = "nodejs";

const API_BASE = "https://api.crustdata.com";
const API_VERSION = "2025-11-01";

export async function GET() {
  const live = isCrustdataLive();
  if (!live) {
    return NextResponse.json({
      ok: true,
      live: false,
      detail: "Crustdata fixture mode (CRUSTDATA_LIVE not enabled)",
    });
  }

  const apiKey = process.env.CRUSTDATA_API_KEY!;
  try {
    const response = await fetch(`${API_BASE}/company/search`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "x-api-version": API_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        search: { query: "Crustdata" },
        limit: 1,
        fields: ["basic_info.name", "crustdata_company_id"],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      const detail = `Crustdata search smoke failed: HTTP ${response.status}`;
      return NextResponse.json({ ok: false, live: true, detail });
    }
    return NextResponse.json({
      ok: true,
      live: true,
      detail: "Crustdata live smoke search succeeded",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Crustdata smoke failed";
    return NextResponse.json({ ok: false, live: true, detail: message });
  }
}
