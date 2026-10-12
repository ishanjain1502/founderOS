import { describe, expect, it, vi } from "vitest";
import { createLiveCfoMcpClient } from "./mcp-client";

describe("createLiveCfoMcpClient", () => {
  it("posts Bearer token to mcp url", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ result: { orgs: [] } }),
    }));
    const client = createLiveCfoMcpClient({
      accessToken: "secret",
      mcpUrl: "https://api.cfo.ai/mcp",
      fetchImpl: fetchImpl as typeof fetch,
    });
    await client.callTool("list_orgs", {});
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({
      authorization: "Bearer secret",
    });
  });
});
