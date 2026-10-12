import {
  CFO_MCP_CALL_TIMEOUT_MS,
  DEFAULT_CFO_MCP_URL,
  type CfoMcpClient,
} from "./types";

type FetchFn = typeof fetch;

export function createLiveCfoMcpClient(opts: {
  accessToken: string;
  mcpUrl?: string;
  fetchImpl?: FetchFn;
}): CfoMcpClient {
  const mcpUrl = opts.mcpUrl ?? DEFAULT_CFO_MCP_URL;
  const fetchImpl = opts.fetchImpl ?? fetch;

  return {
    async callTool(name, args) {
      const response = await fetchImpl(mcpUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${opts.accessToken}`,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name, arguments: args },
        }),
        signal: AbortSignal.timeout(CFO_MCP_CALL_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(`cfo MCP HTTP ${response.status}`);
      }
      const payload = (await response.json()) as { result?: unknown };
      return payload.result ?? payload;
    },
  };
}
