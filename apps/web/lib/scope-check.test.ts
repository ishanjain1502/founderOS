import { describe, expect, it } from "vitest";
import { ScopeCheckStatus } from "@ceo-sandbox/domain";
import { classifyIntakeScope } from "./scope-check";

const input = {
  questionText: "Should we add analytics?",
  featureDescription: "Premium add-on",
  changeType: "feature",
  productSummary: "B2B workflow SaaS",
  alreadyLive: false,
};

describe("classifyIntakeScope", () => {
  it("returns unknown when LLM env is missing", async () => {
    const r = await classifyIntakeScope(input, { env: {} });
    expect(r.status).toBe(ScopeCheckStatus.Unknown);
    expect(r.reason).toMatch(/not configured/i);
  });

  it("maps entirely_new from a mocked fetch", async () => {
    const fetchFn: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  classification: "entirely_new",
                  reason: "Greenfield product",
                }),
              },
            },
          ],
        }),
        { status: 200 },
      );
    const r = await classifyIntakeScope(input, {
      fetchFn,
      env: {
        LLM_PROVIDER: "openai",
        LLM_MODEL: "gpt-4o-mini",
        OPENAI_API_KEY: "sk-test",
      },
    });
    expect(r.status).toBe(ScopeCheckStatus.OutOfScope);
    expect(r.reason).toContain("Greenfield");
  });

  it("fail-open on 500", async () => {
    const fetchFn: typeof fetch = async () => new Response("nope", { status: 500 });
    const r = await classifyIntakeScope(input, {
      fetchFn,
      env: {
        LLM_PROVIDER: "openai",
        LLM_MODEL: "gpt-4o-mini",
        OPENAI_API_KEY: "sk-test",
      },
    });
    expect(r.status).toBe(ScopeCheckStatus.Unknown);
  });
});
