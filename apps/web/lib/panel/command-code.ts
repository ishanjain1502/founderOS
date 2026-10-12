import { PANEL_MODEL_ID } from "@ceo-sandbox/domain";

const COMMAND_CODE_URL =
  "https://api.commandcode.ai/provider/v1/chat/completions";

export function parseAssistantJson(content: string): unknown {
  let text = content.trim();
  if (text.startsWith("```")) {
    const lines = text.split("\n");
    lines.shift();
    if (lines.at(-1)?.trim() === "```") {
      lines.pop();
    }
    text = lines.join("\n");
  }
  return JSON.parse(text);
}

export function readUsage(body: unknown): {
  promptTokens: number;
  completionTokens: number;
  cacheReadTokens: number;
} {
  const usage = (body as { usage?: Record<string, unknown> })?.usage;
  if (!usage) {
    return { promptTokens: 0, completionTokens: 0, cacheReadTokens: 0 };
  }
  const details = usage.prompt_tokens_details as
    | { cached_tokens?: number }
    | undefined;
  return {
    promptTokens: Number(usage.prompt_tokens ?? 0),
    completionTokens: Number(usage.completion_tokens ?? 0),
    cacheReadTokens: Number(details?.cached_tokens ?? 0),
  };
}

export async function postCommandCode(input: {
  apiKey: string;
  messages: { role: "system" | "user"; content: string }[];
  fetchFn: typeof fetch;
}): Promise<{
  json: unknown;
  usage: {
    promptTokens: number;
    completionTokens: number;
    cacheReadTokens: number;
  };
}> {
  const response = await input.fetchFn(COMMAND_CODE_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: PANEL_MODEL_ID,
      messages: input.messages,
    }),
  });
  if (!response.ok) {
    throw new Error(`Command Code request failed: ${response.status}`);
  }
  const body = await response.json();
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Command Code response missing message content");
  }
  return {
    json: parseAssistantJson(content),
    usage: readUsage(body),
  };
}
