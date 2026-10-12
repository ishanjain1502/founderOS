# SP-06 Synthetic Market Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After intake is frozen, a session-page control runs a simulated buyer panel through Command Code and shows segment choices, per-segment confidence, and a supplemental overall mean.

**Architecture:** `@ceo-sandbox/domain` owns slot assignment, schemas, aggregation, stimulus text, cost math, and the `epistemic.panel` summary. `apps/web/lib/panel` owns the Command Code client, fill and evaluation loops, and `runPanelPath`. The POST route writes the summary with `applyEpistemicSnapshot` and rows under `data/panel/`. The session page only renders that summary.

**Tech Stack:** TypeScript 5.x, Zod 3.x, Vitest, pnpm, Next.js 15, better-sqlite3. Native `fetch`. No new HTTP client.

## Global Constraints

- Source of truth: `.docs/specs/SP-06-synthetic-market-panel.md`. Where this plan and the spec disagree, the spec wins.
- Model id `deepseek/deepseek-v4-flash`. `POST https://api.commandcode.ai/provider/v1/chat/completions` with `authorization: Bearer ${COMMANDCODE_API_KEY}` and `content-type: application/json`.
- Do not send the key to the browser. Do not call OpenAI or Anthropic for this path. Do not change scope-check.
- N is an integer from 10 to 1000. The slider starts at 10.
- Profile fill: batches of 8, one batch at a time. Evaluation: one call per profile, at most 5 in flight.
- Demo clock 90 seconds and $2. Full clock 12 minutes and $15. Cost uses peak rates: input $0.30 / million, output $1.20 / million, cache-read $0.006 / million.
- Demo zero completions load `fixtures/panel/demo_run.json`. Full zero completions are `unavailable` with no fixture. A completed evaluation is never replaced by the fixture.
- CI injects `fetch`. No live call to `api.commandcode.ai`. No Playwright.
- `data/` stays gitignored. Do not commit `.env`.

## File map

| Path | Responsibility |
|------|----------------|
| `packages/domain/src/panel-assign.ts` | Catalog order and slot assignment |
| `packages/domain/src/panel-aggregate.ts` | Percents, objections, gates, status |
| `packages/domain/src/panel-cost.ts` | Peak-rate dollars and shared constants |
| `packages/domain/src/panel-stimulus.ts` | Stimulus text, price, packaging |
| `packages/domain/src/panel-copy.ts` | Authored page strings |
| `packages/domain/src/contracts/panel-summary.ts` | `epistemic.panel` Zod schema |
| `packages/domain/src/contracts/panel-run.ts` | Required `usesProduct`, size enum, confidence, objection |
| `apps/web/lib/panel/command-code.ts` | Request, JSON parse, usage |
| `apps/web/lib/panel/run-path.ts` | Fill, evaluation, stops, fixture, summary |
| `fixtures/panel/demo_run.json` | Demo fallback rows |
| `apps/web/app/api/sessions/[id]/panel/route.ts` | POST |
| `apps/web/components/session/SyntheticPanel.tsx` | Slider and results |
| `apps/web/app/session/[sessionId]/page.tsx` | Mount the block |

---

### Task 1: Slot assignment

**Files:**
- Create: `packages/domain/src/panel-assign.ts`
- Create: `packages/domain/src/panel-assign.test.ts`
- Modify: `packages/domain/src/client.ts`
- Test: `packages/domain/src/panel-assign.test.ts`

**Interfaces:**
- Consumes: `RunMode`, `PrimarySegment` from `@ceo-sandbox/domain`
- Produces: `PANEL_SEGMENT_CATALOG`, `assignPanelSlots({ n, mode }) => { slots: PanelSlot[]; currentUserCount: number }` where `PanelSlot = { profileId: string; primarySegment: PrimarySegment; usesProduct: boolean }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { PrimarySegment } from "./contracts/enums";
import { RunMode } from "./run-mode";
import { assignPanelSlots, PANEL_SEGMENT_CATALOG } from "./panel-assign";

describe("assignPanelSlots", () => {
  it("lists the ten segments in spec order", () => {
    expect(PANEL_SEGMENT_CATALOG).toEqual([
      PrimarySegment.PriceSensitiveSmb,
      PrimarySegment.EnterpriseBuyer,
      PrimarySegment.PowerUser,
      PrimarySegment.LoyalExisting,
      PrimarySegment.LowEngagement,
      PrimarySegment.TechnicalEvaluator,
      PrimarySegment.ProcurementEnterprise,
      PrimarySegment.EarlyAdopter,
      PrimarySegment.ConservativeBuyer,
      PrimarySegment.CompetitorLoyal,
    ]);
  });

  it("demo N=10 matches the normative table", () => {
    const { slots, currentUserCount } = assignPanelSlots({
      n: 10,
      mode: RunMode.Demo,
    });
    expect(currentUserCount).toBe(7);
    expect(slots.map((s) => s.profileId)).toEqual([
      "0000", "0001", "0002", "0003", "0004",
      "0005", "0006", "0007", "0008", "0009",
    ]);
    expect(slots.map((s) => [s.primarySegment, s.usesProduct])).toEqual([
      [PrimarySegment.PriceSensitiveSmb, true],
      [PrimarySegment.EnterpriseBuyer, true],
      [PrimarySegment.PowerUser, true],
      [PrimarySegment.LoyalExisting, true],
      [PrimarySegment.LowEngagement, true],
      [PrimarySegment.TechnicalEvaluator, true],
      [PrimarySegment.PriceSensitiveSmb, true],
      [PrimarySegment.EnterpriseBuyer, false],
      [PrimarySegment.PowerUser, false],
      [PrimarySegment.LoyalExisting, false],
    ]);
  });

  it("full N=10 puts the remainder on the first two segments", () => {
    const { slots, currentUserCount } = assignPanelSlots({
      n: 10,
      mode: RunMode.Full,
    });
    expect(currentUserCount).toBe(7);
    const counts = new Map<string, number>();
    for (const slot of slots) {
      counts.set(slot.primarySegment, (counts.get(slot.primarySegment) ?? 0) + 1);
    }
    expect(counts.get(PrimarySegment.PriceSensitiveSmb)).toBe(3);
    expect(counts.get(PrimarySegment.EnterpriseBuyer)).toBe(3);
    expect(counts.get(PrimarySegment.PowerUser)).toBe(2);
    expect(counts.get(PrimarySegment.LoyalExisting)).toBe(2);
    expect(counts.get(PrimarySegment.LowEngagement)).toBeUndefined();
  });

  it("N=15 marks 11 current users", () => {
    const { currentUserCount, slots } = assignPanelSlots({
      n: 15,
      mode: RunMode.Full,
    });
    expect(currentUserCount).toBe(11);
    expect(slots.filter((s) => s.usesProduct)).toHaveLength(11);
    expect(slots.slice(0, 11).every((s) => s.usesProduct)).toBe(true);
    expect(slots.slice(11).every((s) => !s.usesProduct)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/panel-assign.test.ts`

Expected: FAIL because `./panel-assign` does not exist.

- [ ] **Step 3: Implement**

```ts
import { PrimarySegment } from "./contracts/enums";
import { RunMode } from "./run-mode";

export const PANEL_SEGMENT_CATALOG: PrimarySegment[] = [
  PrimarySegment.PriceSensitiveSmb,
  PrimarySegment.EnterpriseBuyer,
  PrimarySegment.PowerUser,
  PrimarySegment.LoyalExisting,
  PrimarySegment.LowEngagement,
  PrimarySegment.TechnicalEvaluator,
  PrimarySegment.ProcurementEnterprise,
  PrimarySegment.EarlyAdopter,
  PrimarySegment.ConservativeBuyer,
  PrimarySegment.CompetitorLoyal,
];

export type PanelSlot = {
  profileId: string;
  primarySegment: PrimarySegment;
  usesProduct: boolean;
};

export function assignPanelSlots(input: {
  n: number;
  mode: RunMode;
}): { slots: PanelSlot[]; currentUserCount: number } {
  const counts = PANEL_SEGMENT_CATALOG.map(() => 0);
  for (let i = 0; i < 4; i++) counts[i] = 2;
  if (input.mode === RunMode.Demo) {
    counts[4] = 1;
    counts[5] = 1;
  }
  let reserved = counts.reduce((sum, n) => sum + n, 0);
  let remainder = input.n - reserved;
  let cursor = 0;
  while (remainder > 0) {
    counts[cursor % 10] += 1;
    remainder -= 1;
    cursor += 1;
  }
  const remaining = counts.slice();
  const order: PrimarySegment[] = [];
  while (order.length < input.n) {
    for (let i = 0; i < PANEL_SEGMENT_CATALOG.length; i++) {
      if (remaining[i] > 0) {
        remaining[i] -= 1;
        order.push(PANEL_SEGMENT_CATALOG[i]);
      }
    }
  }
  const currentUserCount = Math.round(0.7 * input.n);
  const slots = order.map((primarySegment, index) => ({
    profileId: String(index).padStart(4, "0"),
    primarySegment,
    usesProduct: index < currentUserCount,
  }));
  return { slots, currentUserCount };
}
```

Export `assignPanelSlots`, `PANEL_SEGMENT_CATALOG`, and `PanelSlot` from `packages/domain/src/client.ts`.

- [ ] **Step 4: Run the test**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/panel-assign.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/panel-assign.ts packages/domain/src/panel-assign.test.ts packages/domain/src/client.ts
git commit -m "feat: assign simulated panel slots by segment and current-user quota"
```

---

### Task 2: Profile and evaluation schemas

**Files:**
- Modify: `packages/domain/src/contracts/panel-run.ts`
- Modify: `packages/domain/src/contracts/panel-run.test.ts`
- Test: `packages/domain/src/contracts/panel-run.test.ts`

**Interfaces:**
- Consumes: existing `archetypeProfileSchema`, `respondentEvaluationSchema`
- Produces: `companySizeBandSchema` (`smb` | `mid` | `enterprise`), required `usesProduct: boolean`, `workflowSummary` trimmed 1–280, required `confidence` (finite 0–100) and `objection` (trimmed 1–120) on `respondentEvaluationSchema`

- [ ] **Step 1: Write the failing test**

Add these cases to `panel-run.test.ts`. The existing happy-path evaluation object already includes `confidence: 72.5` and `objection: "Price is the blocker."`. Add:

```ts
it("rejects a company size outside smb, mid, and enterprise", () => {
  const r = archetypeSchema.safeParse({
    id: ARCHETYPE_ID,
    sessionId: SESSION_ID,
    contractVersion: 1,
    createdAt: CREATED_AT,
    source: EntitySource.Agent,
    primarySegment: PrimarySegment.EnterpriseBuyer,
    ...archetypeProfile,
    companySizeBand: "mid_market",
  });
  expect(r.success).toBe(false);
});

it("rejects an evaluation without confidence", () => {
  const r = respondentEvaluationSchema.safeParse({
    id: EVAL_ID,
    contractVersion: 1,
    createdAt: CREATED_AT,
    source: EntitySource.Agent,
    panelRunId: PANEL_RUN_ID,
    archetypeId: ARCHETYPE_ID,
    panelStimulusId: STIMULUS_ID,
    primaryChoice: PanelPrimaryChoice.PayExtra,
    objection: "Price is the blocker.",
    snapshot: evaluationSnapshot,
  });
  expect(r.success).toBe(false);
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/contracts/panel-run.test.ts`

Expected: FAIL. `mid_market` is still accepted because `companySizeBand` is a free string. The missing-confidence case still passes because Zod strips unknown keys and does not require `confidence`.

- [ ] **Step 3: Implement**

In `panel-run.ts`:

```ts
export const companySizeBandSchema = z.enum(["smb", "mid", "enterprise"]);

export const archetypeProfileSchema = z.object({
  companySizeBand: companySizeBandSchema,
  usesProduct: z.boolean(),
  budgetSensitivity: likertScaleSchema,
  painLevel: likertScaleSchema,
  workflowSummary: z.string().trim().min(1).max(280),
  aiAdoptionComfort: likertScaleSchema,
  switchingCost: switchingCostSchema,
  buyingAuthority: buyingAuthoritySchema,
  primaryPurchasePriority: primaryPurchasePrioritySchema,
  industry: z.string().trim().min(1).optional(),
  region: z.string().trim().min(1).optional(),
});
```

On `respondentEvaluationSchema` add:

```ts
confidence: z.number().finite().min(0).max(100),
objection: z.string().trim().min(1).max(120),
```

Keep `primaryChoice` and `snapshot`. Do not add a closed objection enum.

- [ ] **Step 4: Run the test**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/contracts/panel-run.test.ts`

Expected: PASS, including the existing evaluation happy path.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/contracts/panel-run.ts packages/domain/src/contracts/panel-run.test.ts
git commit -m "feat: require panel confidence, objection, and company size band"
```

---

### Task 3: Aggregation

**Files:**
- Create: `packages/domain/src/panel-aggregate.ts`
- Create: `packages/domain/src/panel-aggregate.test.ts`
- Modify: `packages/domain/src/client.ts`
- Test: `packages/domain/src/panel-aggregate.test.ts`

**Interfaces:**
- Consumes: `PanelSlot` is not required. Consumes `PrimarySegment`, `PanelPrimaryChoice`, `RunMode`.
- Produces:

```ts
export function roundHalfUp1(value: number): number

export type PanelCompletion = {
  profileId: string;
  primarySegment: PrimarySegment;
  primaryChoice: PanelPrimaryChoice;
  confidence: number;
  objection: string;
};

export type PanelAggregate = {
  status: "complete" | "incomplete" | "failed";
  nCompleted: number;
  evaluationAttempts: number;
  lowDisagreement: boolean;
  disagreement: boolean;
  segments: Array<{
    primarySegment: PrimarySegment;
    n: number;
    lowN: boolean;
    choiceCounts: Record<PanelPrimaryChoice, number>;
    choiceRatesPercent: Record<PanelPrimaryChoice, number>;
    meanConfidence: number;
    topObjections: string[];
  }>;
  noSimulatedRespondents: PrimarySegment[];
  overall: {
    n: number;
    choiceCounts: Record<PanelPrimaryChoice, number>;
    choiceRatesPercent: Record<PanelPrimaryChoice, number>;
    meanConfidence: number;
  };
  strongestSegment?: { primarySegment: PrimarySegment; positiveRate: number };
  polarizedPairs: Array<{
    choice: PanelPrimaryChoice;
    left: PrimarySegment;
    right: PrimarySegment;
    leftObjection: string | null;
    rightObjection: string | null;
  }>;
};

export function aggregatePanel(input: {
  mode: RunMode;
  assignedSegments: PrimarySegment[];
  evaluationAttempts: number;
  completions: PanelCompletion[];
}): PanelAggregate
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { PanelPrimaryChoice, PrimarySegment } from "./contracts/enums";
import { RunMode } from "./run-mode";
import { aggregatePanel, roundHalfUp1 } from "./panel-aggregate";

const pay = PanelPrimaryChoice.PayExtra;
const use = PanelPrimaryChoice.UseIfIncluded;
const ignore = PanelPrimaryChoice.Ignore;

function row(
  profileId: string,
  primarySegment: PrimarySegment,
  primaryChoice: PanelPrimaryChoice,
  confidence: number,
  objection: string,
) {
  return { profileId, primarySegment, primaryChoice, confidence, objection };
}

describe("aggregatePanel", () => {
  it("rounds 1.25 to 1.3", () => {
    expect(roundHalfUp1(1.25)).toBe(1.3);
    expect(roundHalfUp1(12.5)).toBe(12.5);
  });

  it("fails the 70% bar at 2/3 and passes at 7/10", () => {
    const one = row("0000", PrimarySegment.PriceSensitiveSmb, pay, 10, "Price");
    const failed = aggregatePanel({
      mode: RunMode.Full,
      assignedSegments: [PrimarySegment.PriceSensitiveSmb],
      evaluationAttempts: 3,
      completions: [one, { ...one, profileId: "0001" }],
    });
    expect(failed.status).toBe("failed");
    const passed = aggregatePanel({
      mode: RunMode.Demo,
      assignedSegments: [
        PrimarySegment.PriceSensitiveSmb,
        PrimarySegment.EnterpriseBuyer,
        PrimarySegment.PowerUser,
        PrimarySegment.LoyalExisting,
        PrimarySegment.LowEngagement,
        PrimarySegment.TechnicalEvaluator,
      ],
      evaluationAttempts: 10,
      completions: [
        row("0000", PrimarySegment.PriceSensitiveSmb, pay, 80, "Price"),
        row("0006", PrimarySegment.PriceSensitiveSmb, pay, 80, "Price"),
        row("0001", PrimarySegment.EnterpriseBuyer, use, 40, "Security"),
        row("0007", PrimarySegment.EnterpriseBuyer, use, 40, "Security"),
        row("0002", PrimarySegment.PowerUser, use, 50, "Security"),
        row("0008", PrimarySegment.PowerUser, use, 50, "Fit"),
        row("0003", PrimarySegment.LoyalExisting, ignore, 10, "Inertia"),
        row("0009", PrimarySegment.LoyalExisting, ignore, 10, "Inertia"),
        row("0004", PrimarySegment.LowEngagement, ignore, 5, "Inertia"),
        row("0005", PrimarySegment.TechnicalEvaluator, pay, 90, "Proof"),
      ],
    });
    expect(passed.status).toBe("complete");
    expect(passed.lowDisagreement).toBe(false);
  });

  it("breaks objection ties by the earliest profile id", () => {
    const result = aggregatePanel({
      mode: RunMode.Full,
      assignedSegments: [PrimarySegment.EnterpriseBuyer],
      evaluationAttempts: 2,
      completions: [
        row("0002", PrimarySegment.EnterpriseBuyer, pay, 50, "Beta"),
        row("0001", PrimarySegment.EnterpriseBuyer, pay, 50, "Alpha"),
      ],
    });
    expect(result.segments[0].topObjections).toEqual(["Alpha", "Beta"]);
  });

  it("sets a polarized pair at a 20 point unrounded gap", () => {
    const result = aggregatePanel({
      mode: RunMode.Full,
      assignedSegments: [
        PrimarySegment.PriceSensitiveSmb,
        PrimarySegment.EnterpriseBuyer,
      ],
      evaluationAttempts: 2,
      completions: [
        row("0000", PrimarySegment.PriceSensitiveSmb, ignore, 10, "Price"),
        row("0001", PrimarySegment.EnterpriseBuyer, pay, 90, "Proof"),
      ],
    });
    expect(result.disagreement).toBe(true);
    expect(result.polarizedPairs[0]).toMatchObject({
      choice: pay,
      left: PrimarySegment.PriceSensitiveSmb,
      right: PrimarySegment.EnterpriseBuyer,
      leftObjection: "Price",
      rightObjection: "Proof",
    });
  });

  it("names a lone n=1 segment and omits strongest when several n=1 segments exist", () => {
    const lone = aggregatePanel({
      mode: RunMode.Full,
      assignedSegments: [PrimarySegment.PowerUser],
      evaluationAttempts: 1,
      completions: [row("0000", PrimarySegment.PowerUser, pay, 50, "Proof")],
    });
    expect(lone.segments[0].lowN).toBe(true);
    expect(lone.strongestSegment?.primarySegment).toBe(PrimarySegment.PowerUser);
    const two = aggregatePanel({
      mode: RunMode.Full,
      assignedSegments: [
        PrimarySegment.PowerUser,
        PrimarySegment.LoyalExisting,
      ],
      evaluationAttempts: 2,
      completions: [
        row("0000", PrimarySegment.PowerUser, pay, 50, "Proof"),
        row("0001", PrimarySegment.LoyalExisting, ignore, 20, "Inertia"),
      ],
    });
    expect(two.strongestSegment).toBeUndefined();
  });
});
```

The 2/3 case is `failed` even though two rows exist. The 7/10 case above has 10 completions and 10 attempts, six distinct segments, and four segments with n ≥ 2, so demo status is `complete`.

The tie test has two objections with count 1. Earliest id `0001` ranks `Alpha` first.

The polarized test: SMB `pay_extra` rate is 0 and enterprise is 100. Left is the earlier catalog segment.

- [ ] **Step 2: Run the test**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/panel-aggregate.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement**

`roundHalfUp1` is `Math.round(value * 10) / 10` for these non-negative inputs.

`aggregatePanel`:

- Group completions by `primarySegment`.
- `noSimulatedRespondents` is `assignedSegments` with zero completions, in catalog order. Also include any catalog segment that was assigned. Do not list segments that were never assigned.
- A segment with n ≥ 1 is in `segments`, catalog order. `choiceCounts` includes all five choices. Percent is `roundHalfUp1(count / n * 100)`. Mean confidence is `roundHalfUp1` of the arithmetic mean.
- `lowN` is `n === 1`.
- Overall uses every completion with equal weight. Same rounding. Overall mean is not the mean of segment means.
- Top objections: group by trimmed `objection`, sort by count descending, then earliest `profileId` ascending, take 3.
- Polarized pairs: every unordered pair of segments with n ≥ 1, left earlier in the catalog. For each of the five choices, if the absolute difference of the unrounded percents is ≥ 20, emit a pair. Objections are the first top-objection string or null.
- `disagreement` is `polarizedPairs.length > 0`.
- `lowDisagreement` is true when `completions.length > 0` and every `primaryChoice` is equal.
- Strongest: among n ≥ 5, or the only segment when it is the sole segment with n ≥ 1, maximize unrounded `(pay_extra + use_if_included) / n`. Tie: earlier catalog segment. Omit the field otherwise.
- Status: if `evaluationAttempts > 0` and `completions.length / evaluationAttempts < 0.7`, `failed`. Else if the mode gate passes, `complete`. Else `incomplete`. Demo gate: at least 6 segments with n ≥ 1 and at least 4 with n ≥ 2. Full gate: at least 4 with n ≥ 2. `evaluationAttempts === 0` does not take the failed branch; status is then `incomplete` and `runPanelPath` replaces it when `nCompleted` is 0.

Export the function and types from `client.ts`.

- [ ] **Step 4: Run the test**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/panel-aggregate.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/panel-aggregate.ts packages/domain/src/panel-aggregate.test.ts packages/domain/src/client.ts
git commit -m "feat: aggregate simulated panel choices and confidence by segment"
```

---

### Task 4: Cost, stimulus, and page copy

**Files:**
- Create: `packages/domain/src/panel-cost.ts`
- Create: `packages/domain/src/panel-cost.test.ts`
- Create: `packages/domain/src/panel-stimulus.ts`
- Create: `packages/domain/src/panel-stimulus.test.ts`
- Create: `packages/domain/src/panel-copy.ts`
- Create: `packages/domain/src/panel-copy.test.ts`
- Modify: `packages/domain/src/client.ts`
- Test: the three test files above

**Interfaces:**
- Consumes: nothing from Tasks 1–3
- Produces:
  - `PANEL_MODEL_ID = "deepseek/deepseek-v4-flash"`
  - `PANEL_DEMO_USD_CAP = 2`, `PANEL_FULL_USD_CAP = 15`
  - `PANEL_DEMO_CLOCK_MS = 90_000`, `PANEL_FULL_CLOCK_MS = 720_000`, `PANEL_FULL_NOTICE_MS = 480_000`
  - `estimatePanelUsd({ promptTokens, completionTokens, cacheReadTokens }) => number`
  - `buildPanelStimulus(intake) => { text: string; priceShown: { usd: number; period: string } | null; packaging: string | null; marketText: string }`
  - `PANEL_COPY` object used by the page

- [ ] **Step 1: Write the failing tests**

`panel-cost.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { estimatePanelUsd } from "./panel-cost";

describe("estimatePanelUsd", () => {
  it("bills cache-read tokens at 0.006 and other input at 0.30", () => {
    const usd = estimatePanelUsd({
      promptTokens: 1_000_000,
      cacheReadTokens: 250_000,
      completionTokens: 1_000_000,
    });
    expect(usd).toBeCloseTo(0.75 * 0.3 + 0.25 * 0.006 + 1.2, 10);
  });

  it("bills every prompt token at 0.30 when cache detail is zero", () => {
    const usd = estimatePanelUsd({
      promptTokens: 1_000_000,
      cacheReadTokens: 0,
      completionTokens: 0,
    });
    expect(usd).toBeCloseTo(0.3, 10);
  });
});
```

`panel-stimulus.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildPanelStimulus } from "./panel-stimulus";

describe("buildPanelStimulus", () => {
  it("omits price when the amount is absent and keeps packaging when present", () => {
    const built = buildPanelStimulus({
      feature: {
        title: "AI analytics",
        description: "Premium analytics layer",
        packaging: "  Add-on seat  ",
      },
      company: { productSummary: "B2B workflow SaaS" },
      market: { targetMarketBehavior: "Ops leads" },
    });
    expect(built.text).toBe(
      [
        "Feature: AI analytics",
        "Description: Premium analytics layer",
        "Product: B2B workflow SaaS",
      ].join("\n"),
    );
    expect(built.priceShown).toBeNull();
    expect(built.packaging).toBe("Add-on seat");
    expect(built.marketText).toBe("Ops leads");
    expect(built.text.includes("Crustdata")).toBe(false);
  });

  it("adds the price line and uses (no title) and period absent", () => {
    const built = buildPanelStimulus({
      feature: { description: "A change", proposedPriceUsd: 40 },
      company: { productSummary: "SaaS" },
    });
    expect(built.text).toContain("Feature: (no title)");
    expect(built.text).toContain("Price shown: 40 USD period absent");
    expect(built.priceShown).toEqual({ usd: 40, period: "period absent" });
    expect(built.packaging).toBeNull();
    expect(built.marketText).toBe("");
  });
});
```

`panel-copy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PANEL_COPY } from "./panel-copy";

const banned = ["survey", "respondents said", "market research", "customers said"];

describe("PANEL_COPY", () => {
  it("allows survey only in the required banner", () => {
    expect(PANEL_COPY.banner).toBe(
      "Simulated panel — not real customer interviews or survey data.",
    );
    for (const [key, value] of Object.entries(PANEL_COPY)) {
      if (key === "banner") continue;
      const lower = value.toLowerCase();
      for (const phrase of banned) {
        expect(lower.includes(phrase)).toBe(false);
      }
    }
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/panel-cost.test.ts src/panel-stimulus.test.ts src/panel-copy.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement**

`estimatePanelUsd` uses the formula in spec §7. Constants are the numbers in Global Constraints.

`buildPanelStimulus` reads optional `feature.title`, `feature.description`, `feature.proposedPriceUsd`, `feature.proposedPricePeriod`, `feature.packaging`, `company.productSummary`, and `market.targetMarketBehavior`. Trim packaging. Null packaging when empty. Price line only when `proposedPriceUsd` is a number. Period text is the stored period or `period absent`. Market text is the trimmed behavior or `""`. Description and product summary are the stored strings (frozen intake has them).

`PANEL_COPY` keys and exact values:

| Key | Value |
|-----|-------|
| `banner` | Simulated panel — not real customer interviews or survey data. |
| `buyers` | Simulated buyers; not your actual user base unless you imported segments. |
| `simulated` | Simulated |
| `inferred` | Inferred |
| `run` | Run simulated panel |
| `rerun` | Re-run |
| `unweightedOverall` | unweighted overall |
| `disagreement` | Overall share can hide segment disagreement. |
| `unanimity` | The simulated panel showed unanimity. |
| `lowN` | low n |
| `noRespondents` | no simulated respondents |
| `raiseN` | Raise N to finish the simulated panel. |
| `stopDemoClock` | The simulated panel stopped at 90 seconds. |
| `stopFullClock` | The simulated panel stopped at 12 minutes. |
| `stopDemoCost` | The simulated panel stopped at $2. |
| `stopFullCost` | The simulated panel stopped at $15. |
| `failed` | The simulated panel failed. |
| `fixture` | Recorded simulated panel (fixture) |
| `unavailable` | The simulated panel is unavailable. |
| `stillGoing` | This run is still going. |
| `priceAbsent` | price absent |
| `packagingAbsent` | packaging absent |
| `currentUsers` | 70% of profiles were marked current users. |

Export all three modules from `client.ts`.

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/panel-cost.test.ts src/panel-stimulus.test.ts src/panel-copy.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/panel-cost.ts packages/domain/src/panel-cost.test.ts packages/domain/src/panel-stimulus.ts packages/domain/src/panel-stimulus.test.ts packages/domain/src/panel-copy.ts packages/domain/src/panel-copy.test.ts packages/domain/src/client.ts
git commit -m "feat: add panel cost, stimulus text, and page copy"
```

---

### Task 5: Summary schema on the epistemic snapshot

**Files:**
- Create: `packages/domain/src/contracts/panel-summary.ts`
- Create: `packages/domain/src/contracts/panel-summary.test.ts`
- Modify: `packages/domain/src/contracts/epistemic-snapshot.ts`
- Modify: `packages/domain/src/client.ts` (export the schema if not already re-exported via the snapshot module)
- Test: `packages/domain/src/contracts/panel-summary.test.ts`
- Test: `packages/domain/src/contracts/epistemic-snapshot.test.ts`

**Interfaces:**
- Consumes: `PanelAggregate` field names from Task 3, `PANEL_MODEL_ID` from Task 4
- Produces: `panelSummarySchema`, `PanelSummary`, and optional `panel` on `epistemicSnapshotSchema`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { emptyEpistemicSnapshot, epistemicSnapshotSchema } from "./epistemic-snapshot";
import { panelSummarySchema } from "./panel-summary";

describe("panelSummarySchema", () => {
  it("accepts a live complete summary and keeps old snapshots valid", () => {
    const summary = {
      status: "complete",
      source: "live",
      panelRunId: "00000000-0000-4000-8000-000000000099",
      panelSeed: "42",
      modelId: "deepseek/deepseek-v4-flash",
      questionnaireVersion: 1,
      nRequested: 10,
      nCompleted: 10,
      evaluationAttempts: 10,
      stopReason: "none",
      lowDisagreement: false,
      priceShown: null,
      packaging: null,
      currentUserCount: 7,
      promptTokens: 100,
      completionTokens: 50,
      cacheReadTokens: 0,
      estimatedUsd: 0.001,
      segments: [],
      noSimulatedRespondents: [],
      overall: {
        n: 0,
        choiceCounts: {
          pay_extra: 0,
          use_if_included: 0,
          try_not_pay: 0,
          ignore: 0,
          consider_switching: 0,
        },
        choiceRatesPercent: {
          pay_extra: 0,
          use_if_included: 0,
          try_not_pay: 0,
          ignore: 0,
          consider_switching: 0,
        },
        meanConfidence: 0,
      },
      disagreement: false,
      polarizedPairs: [],
      rerunCount: 0,
    };
    expect(panelSummarySchema.safeParse(summary).success).toBe(true);
    const snap = emptyEpistemicSnapshot();
    expect(epistemicSnapshotSchema.safeParse(snap).success).toBe(true);
    expect(
      epistemicSnapshotSchema.safeParse({ ...snap, panel: summary }).success,
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/contracts/panel-summary.test.ts src/contracts/epistemic-snapshot.test.ts`

Expected: FAIL because `panel-summary` does not exist and `panel` is stripped or rejected by the strict snapshot schema.

- [ ] **Step 3: Implement**

`panelSummarySchema` is a Zod object with the fields in the test, plus optional `strongestSegment: { primarySegment, positiveRate }`. `status` is `complete | incomplete | failed | fallback | unavailable`. `source` is `live | fixture`. `stopReason` is `none | cost | clock`. Segment entries match the Task 3 segment object, with `primarySegment` using `primarySegmentSchema` and choices using `panelPrimaryChoiceSchema`. `questionnaireVersion` is `z.literal(1)`. `meanConfidence` and rates are numbers. Do not require segments to be non-empty, so the schema test can use `[]`.

Add `panel: panelSummarySchema.optional()` to `epistemicSnapshotSchema` and keep `.strict()`.

Export `panelSummarySchema` and `PanelSummary` from `client.ts`.

- [ ] **Step 4: Run the test**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/contracts/panel-summary.test.ts src/contracts/epistemic-snapshot.test.ts`

Expected: PASS. Existing epistemic snapshot tests still pass.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/contracts/panel-summary.ts packages/domain/src/contracts/panel-summary.test.ts packages/domain/src/contracts/epistemic-snapshot.ts packages/domain/src/client.ts
git commit -m "feat: store the simulated panel summary on the epistemic snapshot"
```

---

### Task 6: Command Code client

**Files:**
- Create: `apps/web/lib/panel/command-code.ts`
- Create: `apps/web/lib/panel/command-code.test.ts`
- Test: `apps/web/lib/panel/command-code.test.ts`

**Interfaces:**
- Consumes: `PANEL_MODEL_ID`
- Produces:

```ts
export function parseAssistantJson(content: string): unknown
export function readUsage(body: unknown): {
  promptTokens: number;
  completionTokens: number;
  cacheReadTokens: number;
}
export async function postCommandCode(input: {
  apiKey: string;
  messages: { role: "system" | "user"; content: string }[];
  fetchFn: typeof fetch;
}): Promise<{ json: unknown; usage: { promptTokens: number; completionTokens: number; cacheReadTokens: number } }>
```

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run the test**

Run: `pnpm --filter @ceo-sandbox/web exec vitest run lib/panel/command-code.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement**

`parseAssistantJson` trims, and if the text starts with a ``` fence, removes the first line and the trailing fence, then `JSON.parse`. `readUsage` returns zeros when `usage` is missing. Missing `prompt_tokens_details.cached_tokens` yields `cacheReadTokens: 0`. `postCommandCode` throws if `response.ok` is false or `choices[0].message.content` is not a string. Header `content-type` is `application/json`. Body is `{ model: PANEL_MODEL_ID, messages }`.

- [ ] **Step 4: Run the test**

Run: `pnpm --filter @ceo-sandbox/web exec vitest run lib/panel/command-code.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/panel/command-code.ts apps/web/lib/panel/command-code.test.ts
git commit -m "feat: call Command Code for simulated panel completions"
```

---

### Task 7: Fill, evaluation, and runPanelPath

**Files:**
- Create: `apps/web/lib/panel/run-path.ts`
- Create: `apps/web/lib/panel/run-path.test.ts`
- Test: `apps/web/lib/panel/run-path.test.ts`

**Interfaces:**
- Consumes: `assignPanelSlots`, `aggregatePanel`, `buildPanelStimulus`, `estimatePanelUsd`, `panelSummarySchema`, `companySizeBandSchema`, `PANEL_MODEL_ID`, clock and dollar caps, `postCommandCode`
- Produces:

```ts
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
}): Promise<{ snapshot: EpistemicSnapshot }>
```

`PanelSummaryAndRows` is the fixture shape: `{ summary: PanelSummary; rows: { profiles: unknown[]; evaluations: unknown[] } }`. The stored summary gets a new `panelRunId` from `newRunId`.

- [ ] **Step 1: Write the failing tests**

Use a fake `fetchFn` that returns valid fill JSON and valid evaluation JSON for the profile ids it was given. Assert:

1. Demo N = 10 with a working key writes `epistemic.panel.status === "complete"` and `source === "live"`, and `writeRaw` is called once with a ref `data/panel/{sessionId}/{panelRunId}.json`.
2. A fill object that returns a different `primarySegment` is stored with the assigned segment. Capture the evaluation request body and expect the assigned segment id, not the model's segment.
3. Missing `apiKey` in demo sets `status` `fallback`, `source` `fixture`, and does not call `fetchFn`.
4. Missing `apiKey` in full sets `status` `unavailable` and does not call `fetchFn`.
5. One successful evaluation and nine failed evaluation calls (HTTP 500) keeps `source` `live` and does not use the fixture. Status is `failed` because 1/10 is under 70%.
6. `buyingAuthority: "none"` plus `primaryChoice: "pay_extra"` is dropped and not counted as a completion. Return a second valid choice on the retry only if you want it kept; for this test, return `pay_extra` all three tries and expect that profile id absent from completions in the raw file.
7. `nowMs` returns `startedAtMs` during fill, then `startedAtMs + 90_000` once fill has returned. Evaluation `fetch` count is 0. `nCompleted` is 0, so demo status is `fallback`.
8. For N = 10, fill `fetch` calls are exactly 2 (a batch of 8, then a batch of 2) before any evaluation call. A deferred evaluation `fetch` never has more than 5 calls in flight. Count in-flight by incrementing a counter before resolving each evaluation response.

Keep the fixture loader returning a summary that already validates and has six segments with four at n ≥ 2. The test fixture can be the same object Task 8 writes to disk, loaded from `fixtures/panel/demo_run.json` once that file exists. Until Task 8, inline a minimal valid summary in the test double and replace it when the file lands. Do not skip the assertion.

- [ ] **Step 2: Run the test**

Run: `pnpm --filter @ceo-sandbox/web exec vitest run lib/panel/run-path.test.ts`

Expected: FAIL because `run-path` does not exist.

- [ ] **Step 3: Implement**

Control flow inside `runPanelPath`:

1. `const { slots, currentUserCount } = assignPanelSlots({ n, mode })`.
2. `const stimulus = buildPanelStimulus(intake)`.
3. If `apiKey` is missing or empty, go to the zero-completion finish.
4. Token counters start at 0. `stopReason` starts as `none`. `estimatedUsd` starts at 0.
5. `function blocked(): "cost" | "clock" | null` checks cost against the mode cap, then clock against the mode cap, using `nowMs() - startedAtMs`.
6. Fill loop: chunks of 8. Before each batch, if `blocked()` is set, record it and break. One `postCommandCode` call. Parse an array. For each slot in the batch, find the object with that `profileId`. Overwrite `primarySegment` and `usesProduct` with the slot values. Validate with `archetypeProfileSchema` pick of the model-owned fields plus the overwritten flags. On failure, retry the whole batch once. Then retry each still-invalid profile alone up to 2 more times. Then mark `fillStatus: "dropped"`.
7. Evaluation pool, limit 5, only over `fillStatus: "ok"` profiles. Before starting a call, if `blocked()` is set, do not start it and do not count an attempt. Otherwise count an attempt and try up to 3 times. Validate `primaryChoice`, `confidence`, and `objection` with the evaluation field schemas. If `buyingAuthority === "none"` and `primaryChoice === "pay_extra"`, treat the try as invalid. Add usage after each HTTP response, including failed tries that returned usage. In-flight calls finish even after the cap is crossed.
8. `aggregatePanel` with `assignedSegments` equal to the unique slot segments in catalog order.
9. If `nCompleted === 0`, demo loads the fixture, replaces `panelRunId` and `panelSeed` and `rerunCount`, sets `source: "fixture"` and `status: "fallback"`. Full sets `status: "unavailable"`, `source: "live"`, empty segment arrays, and the token totals gathered so far.
10. Otherwise store `status` from the aggregate, `source: "live"`, price, packaging, seed, model id, questionnaire version 1, N requested, N completed, attempts, stop reason, and `rerunCount`.
11. `panelSummarySchema.parse` the summary. Put it on a cloned snapshot as `panel`. `validateEpistemicSnapshot`. Throw if invalid so the route does not write.
12. `writeRaw("data/panel/" + sessionId + "/" + panelRunId + ".json", { contractVersion: 1, panelRunId, sessionId, profiles, evaluations })`.

System message for both stages: `Return only JSON. Do not mention competitors, finances, or external market evidence.`

Fill user message: stimulus text, market text, and the batch slots as JSON. Ask for a JSON array of `{ profileId, companySizeBand, usesProduct, budgetSensitivity, painLevel, workflowSummary, aiAdoptionComfort, switchingCost, buyingAuthority, primaryPurchasePriority }`.

Evaluation user message: stimulus text plus one profile JSON. Ask for `{ primaryChoice, confidence, objection }` with the five choice strings and confidence from 0 to 100.

- [ ] **Step 4: Run the test**

Run: `pnpm --filter @ceo-sandbox/web exec vitest run lib/panel/run-path.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/panel/run-path.ts apps/web/lib/panel/run-path.test.ts
git commit -m "feat: run the simulated panel fill and evaluation path"
```

---

### Task 8: Demo fixture

**Files:**
- Create: `fixtures/panel/demo_run.json`
- Modify: `apps/web/lib/panel/run-path.test.ts` if it still inlines the fixture
- Test: `apps/web/lib/panel/run-path.test.ts`

**Interfaces:**
- Consumes: `panelSummarySchema`, `aggregatePanel` gates (6 segments, 4 with n ≥ 2)
- Produces: a checked-in fixture whose `summary.status` is `fallback`, `summary.source` is `fixture`, `summary.modelId` is `deepseek/deepseek-v4-flash`, and whose 10 rows match the demo N = 10 slot table. Choices are not all the same. Each of the six used segments has an objection string.

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { panelSummarySchema } from "@ceo-sandbox/domain";

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
      nBySegment.set(row.primarySegment, (nBySegment.get(row.primarySegment) ?? 0) + 1);
    }
    expect(nBySegment.size).toBeGreaterThanOrEqual(6);
    const doubles = [...nBySegment.values()].filter((n) => n >= 2);
    expect(doubles.length).toBeGreaterThanOrEqual(4);
  });
});
```

Fix `__dirname` to the repo-relative path that Vitest can read from `apps/web`. From `apps/web/lib/panel`, the repo root is four directories up only if the test file lives there: `lib/panel` → `lib` → `web` → `apps` → repo is `../../../..`. Use that join.

- [ ] **Step 2: Run the test**

Run: `pnpm --filter @ceo-sandbox/web exec vitest run lib/panel/run-path.test.ts`

Expected: FAIL because the fixture file is missing.

- [ ] **Step 3: Write the fixture**

Ten evaluations, profile ids `0000`–`0009`, segments and no current-user field required on the evaluation row. Store `primarySegment` on each evaluation row so the gate test can count. Summary `segments` must match those counts and include choice percents, mean confidence, and top objections so `panelSummarySchema` accepts it. Use `pay_extra` for both SMB rows and `ignore` for both enterprise rows so the file is not unanimous. `nRequested` 10, `nCompleted` 10, `evaluationAttempts` 10, `currentUserCount` 7, `panelSeed` `"42"`, `rerunCount` 0, `stopReason` `"none"`, token totals 0, `estimatedUsd` 0, `priceShown` null, `packaging` null.

- [ ] **Step 4: Run the test**

Run: `pnpm --filter @ceo-sandbox/web exec vitest run lib/panel/run-path.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add fixtures/panel/demo_run.json apps/web/lib/panel/run-path.test.ts
git commit -m "test: add the recorded simulated panel fixture"
```

---

### Task 9: POST route

**Files:**
- Create: `apps/web/app/api/sessions/[id]/panel/route.ts`
- Create: `apps/web/app/api/sessions/[id]/panel/route.test.ts`
- Test: `apps/web/app/api/sessions/[id]/panel/route.test.ts`

**Interfaces:**
- Consumes: `runPanelPath`, `getStore`, `applyEpistemicSnapshot` via the store, `sessionToJson`, `writeRawPayload` from `apps/web/lib/crustdata/raw-files.ts` (same `repoRoot + ref` join), `loadDemoCard` for the demo seed
- Produces: `POST` behavior from spec §9

- [ ] **Step 1: Write the failing test**

Follow `apps/web/app/api/sessions/[id]/research/crustdata/route.test.ts`: temp sqlite via `SANDBOX_SQLITE_PATH`, dynamic import of the route, `completeFullIntake` helper. Delete `COMMANDCODE_API_KEY` in `afterEach`.

Assert:

- Unfrozen POST returns 409 `{ "error": "not_frozen" }`.
- Frozen full session with body `{ "n": 9 }` returns 400.
- Frozen demo session with body `{ "n": 10 }` and no key returns 200, `epistemic.panel.status === "fallback"`, `source === "fixture"`.
- Second POST with the same body returns 200 and the same `panelRunId` (no second run).
- A further demo POST `{ "n": 10, "rerun": true }` returns that same `panelRunId`.
- Frozen full session with no key returns `status === "unavailable"`.
- After that full result, POST `{ "n": 10, "rerun": true }` returns `unavailable` again with a new `panelRunId` and `rerunCount === 1`. A third POST with `rerun: true` returns the same `panelRunId`.

Demo create body is `{ mode: "demo" }` using `RunMode.Demo`. Full uses `RunMode.Full`. Freeze with `updateIntake`, `approveSession`, and `startSession`, as the Crustdata test does.

- [ ] **Step 2: Run the test**

Run: `pnpm --filter @ceo-sandbox/web exec vitest run "app/api/sessions/[id]/panel/route.test.ts"`

Expected: FAIL because the route file does not exist.

- [ ] **Step 3: Implement**

Mirror the Crustdata route's id parse, 404, 409 `not_frozen`, and 500 `missing_epistemic_snapshot`. Parse the body with Zod: `n` optional integer 10–1000, `rerun` optional boolean default false. First run (`epistemic.panel` absent) requires `n` or returns 400. A stored terminal status returns the current `sessionToJson` unless full, `rerun === true`, and `rerunCount === 0`.

Demo seed: `String(loadDemoCardFixture().panelSeed)`. Full seed: `String(crypto.randomInt(0, 2_147_483_647))`. Pass `process.env.COMMANDCODE_API_KEY`, `fetch`, `Date.now`, and a fixture loader that reads `fixtures/panel/demo_run.json` from the repo root (`join(dirname(resolveSqlitePath()), "..", "..")`, same as Crustdata). `newRunId` is `crypto.randomUUID()`.

On success, `store.applyEpistemicSnapshot(id, snapshot)`. If `runPanelPath` throws a validation error, return 500 and do not write. `export const runtime = "nodejs"`.

- [ ] **Step 4: Run the test**

Run: `pnpm --filter @ceo-sandbox/web exec vitest run "app/api/sessions/[id]/panel/route.test.ts"`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/api/sessions/[id]/panel/route.ts" "apps/web/app/api/sessions/[id]/panel/route.test.ts"
git commit -m "feat: add the frozen-session simulated panel route"
```

---

### Task 10: Session page block

**Files:**
- Create: `apps/web/components/session/SyntheticPanel.tsx`
- Create: `apps/web/components/session/SyntheticPanel.test.ts`
- Modify: `apps/web/app/session/[sessionId]/page.tsx`
- Test: `apps/web/components/session/SyntheticPanel.test.ts`

**Interfaces:**
- Consumes: `PANEL_COPY`, `PANEL_FULL_NOTICE_MS`, `PanelSummary`, `RunMode`
- Produces: a client component mounted under `CrustdataResearch` when `sessionStatus === "frozen"`

- [ ] **Step 1: Write the failing test**

The copy test already lives in domain. This test checks the component module exports a notice delay constant re-export and that the page file contains `<SyntheticPanel`. A source assertion is enough if the web package has no React test renderer. Assert the page source includes `SyntheticPanel` and the component source includes `PANEL_COPY.banner` and `PANEL_COPY.run`.

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("SyntheticPanel mount", () => {
  it("is mounted from the session page and uses the shared copy", () => {
    const page = readFileSync(
      join(__dirname, "../../app/session/[sessionId]/page.tsx"),
      "utf8",
    );
    const component = readFileSync(join(__dirname, "SyntheticPanel.tsx"), "utf8");
    expect(page.includes("SyntheticPanel")).toBe(true);
    expect(component.includes("PANEL_COPY.banner")).toBe(true);
    expect(component.includes("PANEL_COPY.run")).toBe(true);
    expect(component.includes("PANEL_FULL_NOTICE_MS")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm --filter @ceo-sandbox/web exec vitest run components/session/SyntheticPanel.test.ts`

Expected: FAIL because the component does not exist and the page does not mount it.

- [ ] **Step 3: Implement**

`SyntheticPanel` props: `sessionId`, `sessionStatus`, `mode: RunMode`, `panel: PanelSummary | undefined`, `onComplete: () => void`. Return null when `sessionStatus !== "frozen"`.

Render order:

1. `PANEL_COPY.banner`, then a `Simulated` chip using `PANEL_COPY.simulated`, then `PANEL_COPY.buyers`.
2. If `panel` is absent: `<input type="range" min={10} max={1000} step={1} defaultValue={10}>` controlled by state starting at 10, and a button `PANEL_COPY.run`. POST `{ n }` to `/api/sessions/${sessionId}/panel`.
3. If `panel` is present: show status copy. `incomplete` and `stopReason === "none"` → `raiseN`. Clock and cost use the four stop strings by mode. `failed`, `fixture`, and `unavailable` use those copy keys. `source === "fixture"` also shows `PANEL_COPY.fixture`.
4. Rollup: sum `enterprise_buyer` and `power_user` choice counts; `price_sensitive_smb` is the other side. Omit a side whose n is 0 and list it under `noRespondents`.
5. For each segment with n ≥ 1: five choice percents, mean confidence, `lowN` badge when `lowN`, up to 3 objections each prefixed with `Simulated`.
6. Polarized pair lines from `panel.polarizedPairs`.
7. Overall block labeled `unweightedOverall`, then the overall mean. Disagreement and unanimity lines when the flags are set.
8. Strongest segment with `Inferred` when present.
9. Beside the results: price line or `priceAbsent`; packaging or `packagingAbsent`; `panelSeed`; questionnaire version; `nRequested` and `nCompleted`; `modelId`; `currentUsers`.
10. Full mode and `rerunCount === 0`: button `PANEL_COPY.rerun` posting `{ n: panel.nRequested, rerun: true }`.
11. On click, start a timer. If `mode === RunMode.Full` and the request is still in flight at `PANEL_FULL_NOTICE_MS`, show `stillGoing`. Clear the timer when the request finishes. Then `onComplete()`.

Mount it in `page.tsx` immediately after `<CrustdataResearch ... />`, passing `intake.mode`, `epistemic?.panel`, and `refreshSession`.

- [ ] **Step 4: Run the test**

Run: `pnpm --filter @ceo-sandbox/web exec vitest run components/session/SyntheticPanel.test.ts`

Expected: PASS

- [ ] **Step 5: Browser check**

Start the web app. Freeze a demo session. Confirm the slider starts at 10, the banner is the required sentence, and Run with no `COMMANDCODE_API_KEY` shows **Recorded simulated panel (fixture)** and the segment grid. Click Run again and confirm the `panelRunId` does not change.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/session/SyntheticPanel.tsx apps/web/components/session/SyntheticPanel.test.ts apps/web/app/session/[sessionId]/page.tsx
git commit -m "feat: show the simulated panel on the frozen session page"
```

---

### Task 11: Regression

**Files:**
- Test: domain and web suites already added

- [ ] **Step 1: Run the domain and web tests**

Run: `pnpm --filter @ceo-sandbox/domain test`

Expected: PASS

Run: `pnpm --filter @ceo-sandbox/web test`

Expected: PASS

- [ ] **Step 2: Commit** only if a previous step left an uncommitted fix. Do not create an empty commit.
