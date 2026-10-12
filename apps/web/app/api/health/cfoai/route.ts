import { NextResponse } from "next/server";
import { loadCfoMappingFromRepo } from "@/lib/cfo-ai/load-mapping";
import {
  isCfoLive,
  isCfoMappingReady,
  selectCfoAdapter,
} from "@/lib/cfo-ai/select-adapter";
import { runCfoAiSmoke } from "@/lib/cfo-ai/smoke";
import { resolveRepoRoot } from "@/lib/resolve-repo-root";

export const runtime = "nodejs";

export async function GET() {
  const repoRoot = resolveRepoRoot();
  const mapping = loadCfoMappingFromRepo(repoRoot);
  const mappingReady = isCfoMappingReady(mapping);
  const live = isCfoLive();

  if (!live) {
    return NextResponse.json({
      ok: true,
      live: false,
      mappingReady,
      detail: "cfo.ai fixture mode (CFO_LIVE not enabled or missing token)",
    });
  }

  const { client } = selectCfoAdapter();
  if (!client) {
    return NextResponse.json({
      ok: false,
      live: true,
      mappingReady,
      detail: "cfo.ai live enabled but MCP client unavailable",
    });
  }

  const smoke = await runCfoAiSmoke(client, mapping);
  return NextResponse.json({
    ok: smoke.ok,
    live: true,
    mappingReady,
    detail: smoke.detail,
  });
}
