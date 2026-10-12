import type { CfoAiMapping } from "@ceo-sandbox/domain/server";
import type { CfoMcpClient } from "./types";

export async function runCfoAiSmoke(
  client: CfoMcpClient,
  mapping: CfoAiMapping,
): Promise<{ ok: boolean; detail: string }> {
  try {
    await client.callTool("list_orgs", {});
    const scenarios = (await client.callTool("inspect_scenarios", {
      list: {},
    })) as { scenarios?: { display_name?: string }[] };
    const names = new Set(
      (scenarios.scenarios ?? []).map((s) => s.display_name ?? ""),
    );
    for (const key of ["pilot", "broad_launch"] as const) {
      const expected = mapping.scenarios[key]?.cfoScenarioName;
      if (expected && !names.has(expected)) {
        return {
          ok: false,
          detail: `missing scenario ${expected}`,
        };
      }
    }
    const compare = mapping.compare.inspectTableBlocks;
    await client.callTool("inspect_table_blocks", {
      read: {
        target: compare.table,
        comparison: "none",
      },
    });
    return { ok: true, detail: "cfo.ai smoke succeeded" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "smoke failed";
    return { ok: false, detail: message };
  }
}
