import { describe, expect, it } from "vitest";
import { parseAssistantJson, postCommandCode, readUsage } from "./command-code";

describe("command code client", () => {
  it("strips one json fence and reads cached tokens", () => {
    expect(parseAssistantJson("```json\n{\"ok\":true}\n```")).toEqual({ ok: true });
    expect(
      readUsage({
        usage: {
          prompt_tokens: 10,
          completion_tokens: 4,
          prompt_tokens_details: { cached_tokens: 3 },
        },
      }),
    ).toEqual({ promptTokens: 10, completionTokens: 4, cacheReadTokens: 3 });
  });

  it("posts the pinned model and bearer key", async () => {
    let seen: { url: string; auth: string; model: string } | null = null;
    const fetchFn: typeof fetch = async (url, init) => {
      const body = JSON.parse(String(init?.body));
      seen = {
        url: String(url),
        auth: String((init?.headers as Record<string, string>).authorization),
        model: body.model,
      };
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "{\"primaryChoice\":\"ignore\"}" } }],
          usage: { prompt_tokens: 8, completion_tokens: 2 },
        }),
        { status: 200 },
      );
    };
    const result = await postCommandCode({
      apiKey: "test-key",
      messages: [{ role: "user", content: "hi" }],
      fetchFn,
    });
    expect(seen).toEqual({
      url: "https://api.commandcode.ai/provider/v1/chat/completions",
      auth: "Bearer test-key",
      model: "deepseek/deepseek-v4-flash",
    });
    expect(result.usage.cacheReadTokens).toBe(0);
    expect(result.json).toEqual({ primaryChoice: "ignore" });
  });
});
