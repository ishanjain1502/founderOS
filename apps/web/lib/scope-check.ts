import { ScopeCheckStatus } from "@ceo-sandbox/domain";

const TIMEOUT_MS = 8000;

export type ClassifyIntakeScopeInput = {
  questionText: string;
  featureDescription: string;
  changeType: string;
  productSummary: string;
  alreadyLive: boolean;
};

type Classification = "existing_product_change" | "entirely_new" | "unclear";

type LlmJson = {
  classification?: string;
  reason?: string;
};

function isoNow(now?: () => Date): string {
  return (now ?? (() => new Date()))().toISOString();
}

function notConfigured(ranAt: string) {
  return {
    status: ScopeCheckStatus.Unknown,
    reason: "LLM not configured",
    ranAt,
  };
}

function mapClassification(classification: Classification): ScopeCheckStatus {
  switch (classification) {
    case "existing_product_change":
      return ScopeCheckStatus.InScope;
    case "entirely_new":
      return ScopeCheckStatus.OutOfScope;
    case "unclear":
      return ScopeCheckStatus.Unknown;
    default:
      return ScopeCheckStatus.Unknown;
  }
}

function parseLlmJson(raw: string): { ok: true; data: LlmJson } | { ok: false } {
  try {
    const data = JSON.parse(raw) as LlmJson;
    if (typeof data !== "object" || data === null) {
      return { ok: false };
    }
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}

function extractOpenAiContent(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const choices = (body as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const message = (choices[0] as { message?: { content?: unknown } }).message;
  const content = message?.content;
  return typeof content === "string" ? content : null;
}

function extractAnthropicContent(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const content = (body as { content?: unknown }).content;
  if (!Array.isArray(content) || content.length === 0) return null;
  const block = content[0] as { type?: string; text?: unknown };
  if (block.type === "text" && typeof block.text === "string") {
    return block.text;
  }
  return null;
}

function buildPrompt(input: ClassifyIntakeScopeInput) {
  const system =
    'Classify whether the decision is a change to an existing B2B SaaS product or an entirely new product. Respond with ONLY JSON: { "classification": "existing_product_change" | "entirely_new" | "unclear", "reason": string } where reason is at most 200 characters.';
  const user = JSON.stringify({
    questionText: input.questionText,
    featureDescription: input.featureDescription,
    changeType: input.changeType,
    productSummary: input.productSummary,
    alreadyLive: input.alreadyLive,
  });
  return { system, user };
}

function failUnknown(ranAt: string, reason: string) {
  return { status: ScopeCheckStatus.Unknown, reason, ranAt };
}

function resolveApiKey(
  provider: string,
  env: NodeJS.ProcessEnv,
): string | undefined {
  if (provider === "openai") return env.OPENAI_API_KEY;
  if (provider === "anthropic") return env.ANTHROPIC_API_KEY;
  return undefined;
}

function isClassification(value: string): value is Classification {
  return (
    value === "existing_product_change" ||
    value === "entirely_new" ||
    value === "unclear"
  );
}

export async function classifyIntakeScope(
  input: ClassifyIntakeScopeInput,
  deps?: {
    fetchFn?: typeof fetch;
    now?: () => Date;
    env?: NodeJS.ProcessEnv;
  },
): Promise<{ status: ScopeCheckStatus; reason?: string; ranAt: string }> {
  const ranAt = isoNow(deps?.now);
  const env = deps?.env ?? process.env;
  const fetchFn = deps?.fetchFn ?? fetch;

  const provider = env.LLM_PROVIDER?.trim();
  const model = env.LLM_MODEL?.trim();
  if (!provider || !model) {
    return notConfigured(ranAt);
  }

  const apiKey = resolveApiKey(provider, env);
  if (!apiKey) {
    return notConfigured(ranAt);
  }

  if (provider !== "openai" && provider !== "anthropic") {
    return failUnknown(ranAt, "Unsupported LLM provider");
  }

  const { system, user } = buildPrompt(input);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let response: Response;
    if (provider === "openai") {
      response = await fetchFn("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
        signal: controller.signal,
      });
    } else {
      response = await fetchFn("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 256,
          system,
          messages: [{ role: "user", content: user }],
        }),
        signal: controller.signal,
      });
    }

    if (!response.ok) {
      return failUnknown(ranAt, `LLM request failed (${response.status})`);
    }

    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      return failUnknown(ranAt, "Invalid LLM response");
    }

    const contentRaw =
      provider === "openai"
        ? extractOpenAiContent(responseBody)
        : extractAnthropicContent(responseBody);
    if (!contentRaw) {
      return failUnknown(ranAt, "Invalid LLM response");
    }

    const parsed = parseLlmJson(contentRaw);
    if (!parsed.ok) {
      return failUnknown(ranAt, "Invalid classification JSON");
    }

    const classification = parsed.data.classification;
    if (typeof classification !== "string" || !isClassification(classification)) {
      return failUnknown(ranAt, "Invalid classification");
    }

    const reason =
      typeof parsed.data.reason === "string" ? parsed.data.reason : undefined;

    return {
      status: mapClassification(classification),
      reason,
      ranAt,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return failUnknown(ranAt, "LLM request timed out");
    }
    return failUnknown(ranAt, "LLM request failed");
  } finally {
    clearTimeout(timeout);
  }
}
