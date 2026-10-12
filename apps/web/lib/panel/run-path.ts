import {
  aggregatePanel,
  assignPanelSlots,
  buildPanelStimulus,
  estimatePanelUsd,
  PANEL_DEMO_CLOCK_MS,
  PANEL_DEMO_USD_CAP,
  PANEL_FULL_CLOCK_MS,
  PANEL_FULL_USD_CAP,
  PANEL_MODEL_ID,
  panelSummarySchema,
  PANEL_SEGMENT_CATALOG,
  RunMode,
  validateEpistemicSnapshot,
  type EpistemicSnapshot,
  type IntakeDraftPartial,
  type PanelSummary,
  type PrimarySegment,
} from "@ceo-sandbox/domain";
import {
  archetypeProfileSchema,
  PanelPrimaryChoice,
  panelPrimaryChoiceSchema,
} from "@ceo-sandbox/domain/server";
import { z } from "zod";
import { postCommandCode } from "./command-code";

const SYSTEM_MESSAGE =
  "Return only JSON. Do not mention competitors, finances, or external market evidence.";

const FILL_CHUNK_SIZE = 8;
const EVAL_CONCURRENCY = 5;
const EVAL_MAX_TRIES = 3;

const evaluationConfidenceSchema = z.number().finite().min(0).max(100);
const evaluationObjectionSchema = z.string().trim().min(1).max(120);

const ZERO_CHOICE_COUNTS = {
  pay_extra: 0,
  use_if_included: 0,
  try_not_pay: 0,
  ignore: 0,
  consider_switching: 0,
};

const ZERO_CHOICE_RATES = {
  pay_extra: 0,
  use_if_included: 0,
  try_not_pay: 0,
  ignore: 0,
  consider_switching: 0,
};

export type PanelSummaryAndRows = {
  summary: PanelSummary;
  rows: { profiles: unknown[]; evaluations: unknown[] };
};

type FilledProfile = {
  profileId: string;
  primarySegment: PrimarySegment;
  usesProduct: boolean;
  fillStatus: "pending" | "ok" | "dropped";
  companySizeBand: string;
  budgetSensitivity: number;
  painLevel: number;
  workflowSummary: string;
  aiAdoptionComfort: number;
  switchingCost: string;
  buyingAuthority: string;
  primaryPurchasePriority: string;
};

export async function runPanelPath(input: {
  snapshot: EpistemicSnapshot;
  intake: IntakeDraftPartial;
  sessionId: string;
  mode: RunMode;
  n: number;
  panelSeed: string;
  rerunCount: number;
  apiKey: string | undefined;
  fetchFn: typeof fetch;
  nowMs: () => number;
  startedAtMs: number;
  writeRaw: (ref: string, raw: unknown) => void;
  loadFixture: () => PanelSummaryAndRows;
  newRunId: () => string;
}): Promise<{ snapshot: EpistemicSnapshot }> {
  const {
    snapshot,
    intake,
    sessionId,
    mode,
    n,
    panelSeed,
    rerunCount,
    apiKey,
    fetchFn,
    nowMs,
    startedAtMs,
    writeRaw,
    loadFixture,
    newRunId,
  } = input;

  const panelRunId = newRunId();
  const { slots, currentUserCount } = assignPanelSlots({ n, mode });
  const stimulus = buildPanelStimulus(intake);

  let promptTokens = 0;
  let completionTokens = 0;
  let cacheReadTokens = 0;
  let estimatedUsd = 0;
  let stopReason: "none" | "cost" | "clock" = "none";

  const usdCap =
    mode === RunMode.Demo ? PANEL_DEMO_USD_CAP : PANEL_FULL_USD_CAP;
  const clockCap =
    mode === RunMode.Demo ? PANEL_DEMO_CLOCK_MS : PANEL_FULL_CLOCK_MS;

  function blocked(): "cost" | "clock" | null {
    if (estimatedUsd >= usdCap) {
      return "cost";
    }
    if (nowMs() - startedAtMs >= clockCap) {
      return "clock";
    }
    return null;
  }

  function recordStop(): void {
    if (stopReason !== "none") {
      return;
    }
    const reason = blocked();
    if (reason) {
      stopReason = reason;
    }
  }

  function addUsage(usage: {
    promptTokens: number;
    completionTokens: number;
    cacheReadTokens: number;
  }): void {
    promptTokens += usage.promptTokens;
    completionTokens += usage.completionTokens;
    cacheReadTokens += usage.cacheReadTokens;
    estimatedUsd = estimatePanelUsd({
      promptTokens,
      completionTokens,
      cacheReadTokens,
    });
  }

  const profiles: FilledProfile[] = slots.map((slot) => ({
    profileId: slot.profileId,
    primarySegment: slot.primarySegment,
    usesProduct: slot.usesProduct,
    fillStatus: "pending",
    companySizeBand: "",
    budgetSensitivity: 0,
    painLevel: 0,
    workflowSummary: "",
    aiAdoptionComfort: 0,
    switchingCost: "",
    buyingAuthority: "",
    primaryPurchasePriority: "",
  }));

  const profileById = new Map(profiles.map((p) => [p.profileId, p]));

  function applyFillRow(
    slot: { profileId: string; primarySegment: PrimarySegment; usesProduct: boolean },
    row: Record<string, unknown>,
  ): boolean {
    const profile = profileById.get(slot.profileId);
    if (!profile) {
      return false;
    }
    const candidate = {
      companySizeBand: row.companySizeBand,
      usesProduct: slot.usesProduct,
      budgetSensitivity: row.budgetSensitivity,
      painLevel: row.painLevel,
      workflowSummary: row.workflowSummary,
      aiAdoptionComfort: row.aiAdoptionComfort,
      switchingCost: row.switchingCost,
      buyingAuthority: row.buyingAuthority,
      primaryPurchasePriority: row.primaryPurchasePriority,
    };
    const parsed = archetypeProfileSchema.safeParse(candidate);
    if (!parsed.success) {
      return false;
    }
    profile.fillStatus = "ok";
    profile.primarySegment = slot.primarySegment;
    profile.usesProduct = slot.usesProduct;
    profile.companySizeBand = parsed.data.companySizeBand;
    profile.budgetSensitivity = parsed.data.budgetSensitivity;
    profile.painLevel = parsed.data.painLevel;
    profile.workflowSummary = parsed.data.workflowSummary;
    profile.aiAdoptionComfort = parsed.data.aiAdoptionComfort;
    profile.switchingCost = parsed.data.switchingCost;
    profile.buyingAuthority = parsed.data.buyingAuthority;
    profile.primaryPurchasePriority = parsed.data.primaryPurchasePriority;
    return true;
  }

  async function requestFillBatch(
    batch: {
      profileId: string;
      primarySegment: PrimarySegment;
      usesProduct: boolean;
    }[],
  ): Promise<Record<string, unknown>[] | null> {
    const slotJson = JSON.stringify(
      batch.map((slot) => ({
        profileId: slot.profileId,
        primarySegment: slot.primarySegment,
        usesProduct: slot.usesProduct,
      })),
    );
    const userMessage = [
      stimulus.text,
      stimulus.marketText,
      `Slots: ${slotJson}`,
      "Return only a JSON array of objects with profileId, companySizeBand, usesProduct, budgetSensitivity, painLevel, workflowSummary, aiAdoptionComfort, switchingCost, buyingAuthority, primaryPurchasePriority.",
    ].join("\n\n");

    try {
      const { json, usage } = await postCommandCode({
        apiKey: apiKey!,
        messages: [
          { role: "system", content: SYSTEM_MESSAGE },
          { role: "user", content: userMessage },
        ],
        fetchFn,
      });
      addUsage(usage);
      if (!Array.isArray(json)) {
        return null;
      }
      return json as Record<string, unknown>[];
    } catch {
      return null;
    }
  }

  function processFillResponse(
    batch: {
      profileId: string;
      primarySegment: PrimarySegment;
      usesProduct: boolean;
    }[],
    rows: Record<string, unknown>[] | null,
  ): void {
    if (!rows) {
      return;
    }
    for (const slot of batch) {
      const profile = profileById.get(slot.profileId);
      if (!profile || profile.fillStatus !== "pending") {
        continue;
      }
      const row = rows.find((r) => r.profileId === slot.profileId);
      if (!row || typeof row !== "object") {
        continue;
      }
      applyFillRow(slot, row);
    }
  }

  async function fillBatch(
    batch: {
      profileId: string;
      primarySegment: PrimarySegment;
      usesProduct: boolean;
    }[],
  ): Promise<void> {
    const pending = () =>
      batch.filter((slot) => profileById.get(slot.profileId)?.fillStatus === "pending");

    let rows = await requestFillBatch(batch);
    processFillResponse(batch, rows);

    if (pending().length > 0) {
      rows = await requestFillBatch(batch);
      processFillResponse(batch, rows);
    }

    for (const slot of pending()) {
      for (let solo = 0; solo < 2; solo += 1) {
        if (blocked()) {
          recordStop();
          break;
        }
        const soloRows = await requestFillBatch([slot]);
        processFillResponse([slot], soloRows);
        if (profileById.get(slot.profileId)?.fillStatus === "ok") {
          break;
        }
      }
      const profile = profileById.get(slot.profileId);
      if (profile && profile.fillStatus === "pending") {
        profile.fillStatus = "dropped";
      }
    }
  }

  if (apiKey && apiKey.length > 0) {
    for (let i = 0; i < slots.length; i += FILL_CHUNK_SIZE) {
      if (blocked()) {
        recordStop();
        break;
      }
      const batch = slots.slice(i, i + FILL_CHUNK_SIZE);
      await fillBatch(batch);
    }

    const completions: {
      profileId: string;
      primarySegment: PrimarySegment;
      primaryChoice: PanelPrimaryChoice;
      confidence: number;
      objection: string;
    }[] = [];
    const evaluationRows: unknown[] = [];
    let evaluationAttempts = 0;

    const okProfiles = profiles.filter((p) => p.fillStatus === "ok");

    async function evaluateOne(profile: FilledProfile): Promise<void> {
      const profileJson = {
        profileId: profile.profileId,
        primarySegment: profile.primarySegment,
        usesProduct: profile.usesProduct,
        companySizeBand: profile.companySizeBand,
        budgetSensitivity: profile.budgetSensitivity,
        painLevel: profile.painLevel,
        workflowSummary: profile.workflowSummary,
        aiAdoptionComfort: profile.aiAdoptionComfort,
        switchingCost: profile.switchingCost,
        buyingAuthority: profile.buyingAuthority,
        primaryPurchasePriority: profile.primaryPurchasePriority,
      };

      const userMessage = [
        stimulus.text,
        `Profile: ${JSON.stringify(profileJson)}`,
        "Return JSON with primaryChoice (pay_extra, use_if_included, try_not_pay, ignore, consider_switching), confidence from 0 to 100, and objection.",
      ].join("\n\n");

      for (let attempt = 0; attempt < EVAL_MAX_TRIES; attempt += 1) {
        try {
          const { json, usage } = await postCommandCode({
            apiKey,
            messages: [
              { role: "system", content: SYSTEM_MESSAGE },
              { role: "user", content: userMessage },
            ],
            fetchFn,
          });
          addUsage(usage);
          if (!json || typeof json !== "object") {
            continue;
          }
          const row = json as Record<string, unknown>;
          const choiceResult = panelPrimaryChoiceSchema.safeParse(row.primaryChoice);
          const confidenceResult = evaluationConfidenceSchema.safeParse(
            row.confidence,
          );
          const objectionResult = evaluationObjectionSchema.safeParse(
            row.objection,
          );
          if (
            !choiceResult.success ||
            !confidenceResult.success ||
            !objectionResult.success
          ) {
            continue;
          }
          if (
            profile.buyingAuthority === "none" &&
            choiceResult.data === PanelPrimaryChoice.PayExtra
          ) {
            continue;
          }
          const completion = {
            profileId: profile.profileId,
            primarySegment: profile.primarySegment,
            primaryChoice: choiceResult.data,
            confidence: confidenceResult.data,
            objection: objectionResult.data,
          };
          completions.push(completion);
          evaluationRows.push(completion);
          return;
        } catch {
          // failed HTTP try
        }
      }
    }

    const executing = new Set<Promise<void>>();
    for (const profile of okProfiles) {
      if (blocked()) {
        recordStop();
        break;
      }
      evaluationAttempts += 1;
      const task = evaluateOne(profile).finally(() => {
        executing.delete(task);
      });
      executing.add(task);
      if (executing.size >= EVAL_CONCURRENCY) {
        await Promise.race(executing);
      }
    }
    await Promise.all(executing);

    const assignedSegments = PANEL_SEGMENT_CATALOG.filter((seg) =>
      slots.some((slot) => slot.primarySegment === seg),
    );

    const aggregate = aggregatePanel({
      mode,
      assignedSegments,
      evaluationAttempts,
      completions,
    });

    let summary: PanelSummary;
    let profilesOut: unknown[];
    let evaluationsOut: unknown[];

    if (aggregate.nCompleted === 0) {
      if (mode === RunMode.Demo) {
        const fixture = loadFixture();
        summary = {
          ...fixture.summary,
          panelRunId,
          panelSeed,
          rerunCount,
          status: "fallback",
          source: "fixture",
        };
        profilesOut = fixture.rows.profiles;
        evaluationsOut = fixture.rows.evaluations;
      } else {
        summary = {
          status: "unavailable",
          source: "live",
          panelRunId,
          panelSeed,
          modelId: PANEL_MODEL_ID,
          questionnaireVersion: 1,
          nRequested: n,
          nCompleted: 0,
          evaluationAttempts,
          stopReason,
          lowDisagreement: false,
          priceShown: stimulus.priceShown,
          packaging: stimulus.packaging,
          currentUserCount,
          promptTokens,
          completionTokens,
          cacheReadTokens,
          estimatedUsd,
          segments: [],
          noSimulatedRespondents: [],
          overall: {
            n: 0,
            choiceCounts: { ...ZERO_CHOICE_COUNTS },
            choiceRatesPercent: { ...ZERO_CHOICE_RATES },
            meanConfidence: 0,
          },
          disagreement: false,
          polarizedPairs: [],
          rerunCount,
        };
        profilesOut = [];
        evaluationsOut = [];
      }
    } else {
      summary = {
        status: aggregate.status,
        source: "live",
        panelRunId,
        panelSeed,
        modelId: PANEL_MODEL_ID,
        questionnaireVersion: 1,
        nRequested: n,
        nCompleted: aggregate.nCompleted,
        evaluationAttempts: aggregate.evaluationAttempts,
        stopReason,
        lowDisagreement: aggregate.lowDisagreement,
        priceShown: stimulus.priceShown,
        packaging: stimulus.packaging,
        currentUserCount,
        promptTokens,
        completionTokens,
        cacheReadTokens,
        estimatedUsd,
        segments: aggregate.segments,
        noSimulatedRespondents: aggregate.noSimulatedRespondents,
        overall: aggregate.overall,
        disagreement: aggregate.disagreement,
        strongestSegment: aggregate.strongestSegment,
        polarizedPairs: aggregate.polarizedPairs,
        rerunCount,
      };
      profilesOut = profiles
        .filter((p) => p.fillStatus === "ok")
        .map((p) => ({
          profileId: p.profileId,
          primarySegment: p.primarySegment,
          usesProduct: p.usesProduct,
          companySizeBand: p.companySizeBand,
          budgetSensitivity: p.budgetSensitivity,
          painLevel: p.painLevel,
          workflowSummary: p.workflowSummary,
          aiAdoptionComfort: p.aiAdoptionComfort,
          switchingCost: p.switchingCost,
          buyingAuthority: p.buyingAuthority,
          primaryPurchasePriority: p.primaryPurchasePriority,
        }));
      evaluationsOut = evaluationRows;
    }

    const parsedSummary = panelSummarySchema.parse(summary);
    const out = structuredClone(snapshot);
    out.panel = parsedSummary;
    const validation = validateEpistemicSnapshot(out);
    if (!validation.ok) {
      throw new Error(
        `invalid_epistemic_snapshot: ${JSON.stringify(validation.errors)}`,
      );
    }

    writeRaw(`data/panel/${sessionId}/${panelRunId}.json`, {
      contractVersion: 1,
      panelRunId,
      sessionId,
      profiles: profilesOut,
      evaluations: evaluationsOut,
    });

    return { snapshot: out };
  }

  // Zero-completion path (missing api key)
  let summary: PanelSummary;
  let profilesOut: unknown[];
  let evaluationsOut: unknown[];

  if (mode === RunMode.Demo) {
    const fixture = loadFixture();
    summary = {
      ...fixture.summary,
      panelRunId,
      panelSeed,
      rerunCount,
      status: "fallback",
      source: "fixture",
    };
    profilesOut = fixture.rows.profiles;
    evaluationsOut = fixture.rows.evaluations;
  } else {
    summary = {
      status: "unavailable",
      source: "live",
      panelRunId,
      panelSeed,
      modelId: PANEL_MODEL_ID,
      questionnaireVersion: 1,
      nRequested: n,
      nCompleted: 0,
      evaluationAttempts: 0,
      stopReason: "none",
      lowDisagreement: false,
      priceShown: stimulus.priceShown,
      packaging: stimulus.packaging,
      currentUserCount,
      promptTokens: 0,
      completionTokens: 0,
      cacheReadTokens: 0,
      estimatedUsd: 0,
      segments: [],
      noSimulatedRespondents: [],
      overall: {
        n: 0,
        choiceCounts: { ...ZERO_CHOICE_COUNTS },
        choiceRatesPercent: { ...ZERO_CHOICE_RATES },
        meanConfidence: 0,
      },
      disagreement: false,
      polarizedPairs: [],
      rerunCount,
    };
    profilesOut = [];
    evaluationsOut = [];
  }

  const parsedSummary = panelSummarySchema.parse(summary);
  const out = structuredClone(snapshot);
  out.panel = parsedSummary;
  const validation = validateEpistemicSnapshot(out);
  if (!validation.ok) {
    throw new Error(
      `invalid_epistemic_snapshot: ${JSON.stringify(validation.errors)}`,
    );
  }

  writeRaw(`data/panel/${sessionId}/${panelRunId}.json`, {
    contractVersion: 1,
    panelRunId,
    sessionId,
    profiles: profilesOut,
    evaluations: evaluationsOut,
  });

  return { snapshot: out };
}
