import type { CfoMcpClient } from "./types";
import { createLiveCfoMcpClient } from "./mcp-client";
import { DEFAULT_CFO_MCP_URL } from "./types";

export function wantsCfoLive(): boolean {
  return process.env.CFO_LIVE === "1";
}

export function isCfoLive(): boolean {
  return wantsCfoLive() && Boolean(process.env.CFO_MCP_ACCESS_TOKEN);
}

export function isCfoMappingReady(
  mapping: { setupStatus: string },
): boolean {
  return mapping.setupStatus === "ready";
}

export function selectCfoAdapter(): {
  live: boolean;
  client: CfoMcpClient | null;
} {
  return selectCfoMcpClient();
}

export function selectCfoMcpClient(): {
  live: boolean;
  client: CfoMcpClient | null;
} {
  if (!isCfoLive()) {
    return { live: false, client: null };
  }
  return {
    live: true,
    client: createLiveCfoMcpClient({
      accessToken: process.env.CFO_MCP_ACCESS_TOKEN!,
      mcpUrl: process.env.CFO_MCP_URL ?? DEFAULT_CFO_MCP_URL,
    }),
  };
}
