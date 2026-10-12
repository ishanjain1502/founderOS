/** Server MCP client for https://api.cfo.ai/mcp — Bearer token per docs. */
export type CfoMcpClient = {
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
};

export const DEFAULT_CFO_MCP_URL = "https://api.cfo.ai/mcp";
export const CFO_MCP_CALL_TIMEOUT_MS = 15_000;
export const FINANCE_STAGE_MS = 90_000;
export const FINANCE_MCP_CALL_BUDGET = 20;
