import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  emptyEpistemicSnapshot,
  emptyIntakeDraft,
  panelSummarySchema,
  PrimarySegment,
  RunMode,
  validateEpistemicSnapshot,
  type EpistemicSnapshot,
} from "@ceo-sandbox/domain";
import { runPanelPath, type PanelSummaryAndRows } from "./run-path";

const SESSION = "00000000-0000-4000-8000-000000000010";
const RUN_ID = "00000000-0000-4000-8000-000000000020";
const STARTED = 1_000_000;

function loadDemoFixture(): PanelSummaryAndRows {
  return JSON.parse(
    readFileSync(
      join(__dirname, "../../../../fixtures/panel/demo_run.json"),
      "utf8",
    ),
  ) as PanelSummaryAndRows;
}

function validProfileFields(profileId: string, overrides: Record<string, unknown> = {}) {
  return {
    profileId,
    companySizeBand: "smb",
    usesProduct: true,
    budgetSensitivity: 3,
    painLevel: 3,
    workflowSummary: "Runs weekly ops reviews",
    aiAdoptionComfort: 3,
    switchingCost: "medium",
    buyingAuthority: "decider",
    primaryPurchasePriority: "price",
    ...overrides,
  };
}

function validEvaluation(overrides: Record<string, unknown> = {}) {
  return {
    primaryChoice: "use_if_included",
    confidence: 72,
    objection: "Needs clearer ROI",
    ...overrides,
  };
}

function okResponse(json: unknown) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(json) } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    }),
    { status: 200 },
  );
}

function isFillRequest(body: { messages?: { content: string }[] }): boolean {
  const user = body.messages?.find((m) => m.content.includes("JSON array"));
  return Boolean(user);
}

function defaultFetchFn(
  options: {
    fillOverrides?: (profileId: string) => Record<string, unknown>;
    evalOverrides?: (profileJson: Record<string, unknown>) => Record<string, unknown>;
    evalStatus?: number;
    evalForProfileId?: (profileId: string) => number;
  } = {},
): typeof fetch {
  return async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    if (isFillRequest(body)) {
      const slotMatch = body.messages
        .map((m: { content: string }) => m.content)
        .join("\n")
        .match(/"profileId":\s*"(\d{4})"/g);
      const ids = slotMatch
        ? [...new Set(slotMatch.map((s: string) => s.match(/"(\d{4})"/)![1]))]
        : [];
      const batchIds =
        ids.length > 0
          ? ids
          : body.messages
              .map((m: { content: string }) => m.content)
              .join("")
              .match(/"profileId":"(\d{4})"/g)
              ?.map((s: string) => s.replace(/.*"(\d{4})".*/, "$1")) ?? [];
      const parsedSlots = JSON.parse(
        body.messages
          .map((m: { content: string }) => m.content)
          .join("\n")
          .match(/\[[\s\S]*"profileId"[\s\S]*\]/)?.[0] ?? "[]",
      ) as { profileId: string }[];
      const profileIds =
        parsedSlots.length > 0 ? parsedSlots.map((s) => s.profileId) : batchIds;
      const rows = profileIds.map((profileId) =>
        validProfileFields(profileId, options.fillOverrides?.(profileId)),
      );
      return okResponse(rows);
    }
    const profileJson = JSON.parse(
      body.messages
        .map((m: { content: string }) => m.content)
        .join("\n")
        .match(/\{[\s\S]*"profileId"[\s\S]*\}/)?.[0] ?? "{}",
    ) as Record<string, unknown>;
    const status =
      options.evalForProfileId?.(String(profileJson.profileId)) ??
      options.evalStatus ??
      200;
    if (status !== 200) {
      return new Response("error", { status });
    }
    return okResponse(
      validEvaluation(options.evalOverrides?.(profileJson)),
    );
  };
}

function baseInput(
  overrides: Partial<Parameters<typeof runPanelPath>[0]> = {},
): Parameters<typeof runPanelPath>[0] {
  const intake = emptyIntakeDraft(RunMode.Demo);
  intake.feature = {
    title: "Panel feature",
    description: "Test feature",
    changeType: "feature",
  };
  intake.company = { productSummary: "B2B tool" };
  return {
    snapshot: emptyEpistemicSnapshot(),
    intake,
    sessionId: SESSION,
    mode: RunMode.Demo,
    n: 10,
    panelSeed: "seed-1",
    rerunCount: 0,
    apiKey: "test-key",
    fetchFn: defaultFetchFn(),
    nowMs: () => STARTED,
    startedAtMs: STARTED,
    writeRaw: vi.fn(),
    loadFixture: loadDemoFixture,
    newRunId: () => RUN_ID,
    ...overrides,
  };
}

describe("demo panel fixture", () => {
  it("parses and meets the demo segment gates", () => {
    const raw = JSON.parse(
      readFileSync(
        join(__dirname, "../../../../fixtures/panel/demo_run.json"),
        "utf8",
      ),
    );
    expect(panelSummarySchema.safeParse(raw.summary).success).toBe(true);
    expect(raw.summary.status).toBe("fallback");
    expect(raw.summary.source).toBe("fixture");
    const nBySegment = new Map<string, number>();
    for (const row of raw.rows.evaluations) {
      nBySegment.set(
        row.primarySegment,
        (nBySegment.get(row.primarySegment) ?? 0) + 1,
      );
    }
    expect(nBySegment.size).toBeGreaterThanOrEqual(6);
    const doubles = [...nBySegment.values()].filter((n) => n >= 2);
    expect(doubles.length).toBeGreaterThanOrEqual(4);
  });
});

describe("runPanelPath", () => {
  it("demo N=10 with key completes live and writes raw once", async () => {
    const writeRaw = vi.fn();
    const { snapshot } = await runPanelPath(baseInput({ writeRaw }));

    expect(snapshot.panel?.status).toBe("complete");
    expect(snapshot.panel?.source).toBe("live");
    expect(snapshot.panel?.panelRunId).toBe(RUN_ID);
    expect(writeRaw).toHaveBeenCalledTimes(1);
    expect(writeRaw.mock.calls[0][0]).toBe(
      `data/panel/${SESSION}/${RUN_ID}.json`,
    );
    expect(validateEpistemicSnapshot(snapshot).ok).toBe(true);
  });

  it("stores assigned primarySegment over model fill and passes it to evaluation", async () => {
    const evalUsers: string[] = [];
    const fetchFn: typeof fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      if (isFillRequest(body)) {
        const slotBlock = body.messages
          .map((m: { content: string }) => m.content)
          .join("\n");
        const batch = JSON.parse(
          slotBlock.match(/\[[\s\S]*?\]/)![0],
        ) as { profileId: string; primarySegment: string }[];
        return okResponse(
          batch.map((slot) =>
            validProfileFields(slot.profileId, {
              primarySegment: PrimarySegment.CompetitorLoyal,
            }),
          ),
        );
      }
      evalUsers.push(
        body.messages.map((m: { content: string }) => m.content).join("\n"),
      );
      return okResponse(validEvaluation());
    };

    const { snapshot } = await runPanelPath(baseInput({ fetchFn }));
    expect(snapshot.panel?.status).toBe("complete");
    const firstEval = evalUsers.find((u) => u.includes('"0000"')) ?? "";
    const raw = JSON.parse(
      firstEval.match(/\{[\s\S]*"profileId"[\s\S]*\}/)![0],
    ) as { profileId: string; primarySegment: string };
    expect(raw.primarySegment).toBe(PrimarySegment.PriceSensitiveSmb);
    expect(raw.primarySegment).not.toBe(PrimarySegment.CompetitorLoyal);
  });

  it("demo without apiKey uses fixture fallback and never fetches", async () => {
    const fetchFn = vi.fn() as typeof fetch;
    const { snapshot } = await runPanelPath(
      baseInput({ apiKey: undefined, fetchFn }),
    );
    expect(fetchFn).not.toHaveBeenCalled();
    expect(snapshot.panel?.status).toBe("fallback");
    expect(snapshot.panel?.source).toBe("fixture");
    expect(snapshot.panel?.panelSeed).toBe("seed-1");
    expect(snapshot.panel?.rerunCount).toBe(0);
    expect(snapshot.panel?.nCompleted).toBe(10);
    expect(snapshot.panel?.evaluationAttempts).toBe(10);
  });

  it("full without apiKey is unavailable live", async () => {
    const fetchFn = vi.fn() as typeof fetch;
    const { snapshot } = await runPanelPath(
      baseInput({ mode: RunMode.Full, apiKey: "", fetchFn }),
    );
    expect(fetchFn).not.toHaveBeenCalled();
    expect(snapshot.panel?.status).toBe("unavailable");
    expect(snapshot.panel?.source).toBe("live");
    expect(snapshot.panel?.segments).toEqual([]);
  });

  it("one success and nine HTTP 500 evaluations stays live failed", async () => {
    const fetchFn = defaultFetchFn({
      evalForProfileId: (id) => (id === "0000" ? 200 : 500),
    });
    const { snapshot } = await runPanelPath(baseInput({ fetchFn }));
    expect(snapshot.panel?.source).toBe("live");
    expect(snapshot.panel?.status).toBe("failed");
    expect(snapshot.panel?.nCompleted).toBe(1);
  });

  it("drops none authority pay_extra completions from raw evaluations", async () => {
    const writeRaw = vi.fn();
    const fetchFn: typeof fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      if (isFillRequest(body)) {
        const slotBlock = body.messages
          .map((m: { content: string }) => m.content)
          .join("\n");
        const batch = JSON.parse(
          slotBlock.match(/\[[\s\S]*?\]/)![0],
        ) as { profileId: string }[];
        return okResponse(
          batch.map((slot) =>
            validProfileFields(slot.profileId, {
              buyingAuthority:
                slot.profileId === "0003" ? "none" : "decider",
            }),
          ),
        );
      }
      return okResponse(validEvaluation({ primaryChoice: "pay_extra" }));
    };

    await runPanelPath(baseInput({ fetchFn, writeRaw }));
    const raw = writeRaw.mock.calls[0][1] as {
      evaluations: { profileId?: string }[];
    };
    const ids = raw.evaluations.map((e) => e.profileId);
    expect(ids).not.toContain("0003");
    expect(ids.length).toBe(9);
  });

  it("clock at 90s after fill skips evaluation and demo fallbacks", async () => {
    let fillResponses = 0;
    let evalHttpCalls = 0;
    let clockExpired = false;
    const inner = defaultFetchFn();
    const fetchFn: typeof fetch = async (url, init) => {
      const body = JSON.parse(String(init?.body));
      const isFill = isFillRequest(body);
      if (!isFill) {
        evalHttpCalls += 1;
      }
      const response = await inner(url, init);
      if (isFill) {
        fillResponses += 1;
        if (fillResponses >= 2) {
          clockExpired = true;
        }
      }
      return response;
    };
    const { snapshot } = await runPanelPath(
      baseInput({
        fetchFn,
        nowMs: () => (clockExpired ? STARTED + 90_000 : STARTED),
      }),
    );
    expect(evalHttpCalls).toBe(0);
    expect(snapshot.panel?.status).toBe("fallback");
    expect(snapshot.panel?.source).toBe("fixture");
    expect(snapshot.panel?.nCompleted).toBe(10);
    expect(snapshot.panel?.evaluationAttempts).toBe(10);
  });

  it("uses two fill batches then caps evaluation concurrency at five", async () => {
    let fillCalls = 0;
    let maxInFlight = 0;
    let inFlight = 0;
    const releaseEval: Array<() => void> = [];

    const fetchFn: typeof fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      if (isFillRequest(body)) {
        fillCalls += 1;
        const slotBlock = body.messages
          .map((m: { content: string }) => m.content)
          .join("\n");
        const batch = JSON.parse(
          slotBlock.match(/\[[\s\S]*?\]/)![0],
        ) as { profileId: string }[];
        return okResponse(batch.map((s) => validProfileFields(s.profileId)));
      }
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise<void>((resolve) => {
        releaseEval.push(() => {
          inFlight -= 1;
          resolve();
        });
      });
      return okResponse(validEvaluation());
    };

    const runPromise = runPanelPath(baseInput({ fetchFn, n: 10 }));
    while (true) {
      if (releaseEval.length > 0) {
        releaseEval.shift()?.();
        continue;
      }
      const done = await Promise.race([
        runPromise.then(() => true),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5)),
      ]);
      if (done) {
        break;
      }
    }
    await runPromise;
    expect(fillCalls).toBe(2);
    expect(maxInFlight).toBeLessThanOrEqual(5);
  });
});
