# SP-03 Intake and Company Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a five-step intake wizard that persists every step to SQLite, recap/approve with a fail-open Full-mode LLM scope check, and freeze on Start investigation into a placeholder page (no Run, no agent).

**Architecture:** `intakeDraftPartialSchema` / `intakeDraftSchema` in `@ceo-sandbox/domain` (client-safe). `demoCardToIntakeDraft` on the server export. `@ceo-sandbox/db` owns one `sessions` table (`intake_json` blob, `better-sqlite3`). Next.js App Router: `/`, `/intake/[sessionId]`, `/intake/[sessionId]/recap`, `/session/[sessionId]`, plus `/api/sessions/*`. Cookie `ceoSandboxLastSessionId` is resume-only; URL id is canonical.

**Tech Stack:** TypeScript 5.x, Zod 3.x, Vitest, pnpm workspaces, Next.js 15 App Router, better-sqlite3, React 19.

## Global Constraints

- Source of truth: `.docs/specs/SP-03-decision-intake-and-company-context.md` (Q&A in `.docs/subproblems/03-decision-intake-and-company-context.md`).
- `contractVersion: 1` on persisted JSON; money fields store `currency: "USD"` (no picker).
- Repo URL is optional. No Run row. No Edit intake after freeze (view-only). No Reset demo.
- LLM scope check: Full-mode recap only; demo skips; missing key / timeout / bad JSON → `scopeCheck.status = "unknown"`; never block Approve/Start.
- Cookie name must be exactly `ceoSandboxLastSessionId` (`HttpOnly`, `SameSite=Lax`, `Path=/`).
- Product title: **CEO Decision Sandbox**. Demo path shows **Illustrative example**.
- Do not call Crustdata, cfo.ai, Neatlogs, or GitHub. Do not add Playwright.
- Node runtime only for SQLite (not Edge). `serverExternalPackages: ["better-sqlite3"]`.

## File map

| Path | Responsibility |
|------|----------------|
| `packages/domain/src/contracts/intake.ts` | Enums, partial/complete Zod, step validators, warnings, empty draft, deep merge |
| `packages/domain/src/demo-card-to-intake.ts` | Demo card → complete `IntakeDraft` (Node) |
| `packages/domain/src/intake-to-session-draft.ts` | Projection onto existing `SessionDraft` |
| `packages/db/src/sessions.ts` | SQLite CRUD |
| `apps/web/lib/sqlite-path.ts` | Resolve `data/sandbox.sqlite` |
| `apps/web/lib/session-cookie.ts` | Cookie helpers |
| `apps/web/lib/scope-check.ts` | LLM classify, fail-open |
| `apps/web/app/api/sessions/**` | HTTP API |
| `apps/web/app/page.tsx` | Start: Demo card / New decision / Continue |
| `apps/web/app/intake/[sessionId]/page.tsx` | Five-step wizard |
| `apps/web/app/intake/[sessionId]/recap/page.tsx` | Recap, approve, start |
| `apps/web/app/session/[sessionId]/page.tsx` | Frozen placeholder |

---

### Task 1: Intake enums, schemas, step validators

**Files:**
- Create: `packages/domain/src/contracts/intake.ts`
- Create: `packages/domain/src/contracts/intake.test.ts`
- Modify: `packages/domain/src/client.ts` (export intake symbols)
- Modify: `packages/domain/src/server.ts` (re-export if needed)

**Interfaces:**
- Produces: `CONTRACT_VERSION` already exists. New: `GoalChip`, `SizeBand`, `DecisionHorizon`, `FieldSource`, `ScopeCheckStatus`, `LAST_SESSION_COOKIE`, `intakeDraftPartialSchema`, `intakeDraftSchema`, `emptyIntakeDraft(mode: RunMode): IntakeDraftPartial`, `validateIntakeStep(step: 1 \| 2 \| 3 \| 4 \| 5, draft: IntakeDraftPartial): { ok: boolean; errors: Record<string, string> }`, `isIntakeComplete(draft: IntakeDraftPartial): { ok: boolean; errors: Record<string, string> }`, `intakeWarnings(draft: IntakeDraftPartial): { path: string; message: string }[]`, `financialMetricCount(financials: { cashUsd?: number; customerCount?: number; mrrUsd?: number; runwayMonths?: number } | undefined): number`, `deepMergeIntake(base: IntakeDraftPartial, patch: Record<string, unknown>): IntakeDraftPartial`, types `IntakeDraft`, `IntakeDraftPartial`.

- [ ] **Step 1: Write the failing test**

Create `packages/domain/src/contracts/intake.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { RunMode } from "../run-mode";
import {
  LAST_SESSION_COOKIE,
  emptyIntakeDraft,
  financialMetricCount,
  intakeDraftPartialSchema,
  intakeDraftSchema,
  intakeWarnings,
  isIntakeComplete,
  validateIntakeStep,
  deepMergeIntake,
  FieldSource,
  GoalChip,
  SizeBand,
} from "./intake";

describe("emptyIntakeDraft", () => {
  it("is a valid partial with USD and saas defaults", () => {
    const draft = emptyIntakeDraft(RunMode.Full);
    const parsed = intakeDraftPartialSchema.safeParse(draft);
    expect(parsed.success).toBe(true);
    expect(draft.currency).toBe("USD");
    expect(draft.company?.deliveryModel).toBe("saas");
    expect(draft.fieldSources?.["currency"]).toBe(FieldSource.SystemDefault);
    expect(draft.scopeCheck?.status).toBe("unknown");
    expect(LAST_SESSION_COOKIE).toBe("ceoSandboxLastSessionId");
  });

  it("demo empty draft skips scope check", () => {
    expect(emptyIntakeDraft(RunMode.Demo).scopeCheck?.status).toBe("skipped");
  });
});

describe("validateIntakeStep", () => {
  it("blocks step 1 without name", () => {
    const r = validateIntakeStep(1, emptyIntakeDraft(RunMode.Full));
    expect(r.ok).toBe(false);
    expect(r.errors["company.name"]).toBeTruthy();
  });

  it("allows step 5 when provideLater is true with zero metrics", () => {
    const draft = emptyIntakeDraft(RunMode.Full);
    draft.financials = { provideLater: true };
    expect(validateIntakeStep(5, draft).ok).toBe(true);
  });

  it("blocks step 5 when only one metric and provideLater is false", () => {
    const draft = emptyIntakeDraft(RunMode.Full);
    draft.financials = { provideLater: false, mrrUsd: 1000 };
    expect(validateIntakeStep(5, draft).ok).toBe(false);
  });

  it("allows step 5 with two metrics", () => {
    const draft = emptyIntakeDraft(RunMode.Full);
    draft.financials = {
      provideLater: false,
      mrrUsd: 1000,
      customerCount: 10,
    };
    expect(validateIntakeStep(5, draft).ok).toBe(true);
    expect(financialMetricCount(draft.financials)).toBe(2);
  });
});

describe("isIntakeComplete", () => {
  it("rejects empty full draft", () => {
    expect(isIntakeComplete(emptyIntakeDraft(RunMode.Full)).ok).toBe(false);
  });

  it("rejects primaryChip not in chips", () => {
    const draft = emptyIntakeDraft(RunMode.Full);
    draft.goals = { chips: [GoalChip.Revenue], primaryChip: GoalChip.Enterprise };
    const r = intakeDraftPartialSchema.safeParse(draft);
    expect(r.success).toBe(false);
  });
});

describe("intakeWarnings", () => {
  it("warns on negative cash and zero customers", () => {
    const draft = emptyIntakeDraft(RunMode.Full);
    draft.financials = { provideLater: false, cashUsd: -1, customerCount: 0 };
    const paths = intakeWarnings(draft).map((w) => w.path);
    expect(paths).toContain("financials.cashUsd");
    expect(paths).toContain("financials.customerCount");
  });
});

describe("caps", () => {
  it("rejects questionText over 500", () => {
    const r = intakeDraftPartialSchema.safeParse({
      ...emptyIntakeDraft(RunMode.Full),
      decision: { questionText: "x".repeat(501) },
    });
    expect(r.success).toBe(false);
  });
});

describe("deepMergeIntake", () => {
  it("replaces competitor arrays and marks user sources", () => {
    const base = emptyIntakeDraft(RunMode.Full);
    const merged = deepMergeIntake(base, {
      company: { name: "Acme", competitors: ["CompA"] },
    });
    expect(merged.company?.name).toBe("Acme");
    expect(merged.company?.competitors).toEqual(["CompA"]);
    expect(merged.fieldSources?.["company.name"]).toBe(FieldSource.User);
  });
});

describe("intakeDraftSchema unknown keys", () => {
  it("rejects extra keys on partial", () => {
    const r = intakeDraftPartialSchema.safeParse({
      ...emptyIntakeDraft(RunMode.Full),
      nope: 1,
    });
    expect(r.success).toBe(false);
  });
});

describe("SizeBand", () => {
  it("parses mid", () => {
    expect(SizeBand.Mid).toBe("mid");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd e:/Projects/neatHacks/ideaSiulation && pnpm --filter @ceo-sandbox/domain test`

Expected: FAIL — `Cannot find module './intake'` (or similar).

- [ ] **Step 3: Write minimal implementation**

Create `packages/domain/src/contracts/intake.ts`. Use `.strict()` on object schemas. Reuse `featureChangeTypeSchema`, `primarySegmentSchema`, `sessionDraftAssumptionSchema`, `sessionDraftScenarioSchema` from `./session` and `./enums`.

Required constants and logic:

```typescript
export const LAST_SESSION_COOKIE = "ceoSandboxLastSessionId";

export enum GoalChip {
  Revenue = "revenue",
  Retention = "retention",
  Expansion = "expansion",
  Enterprise = "enterprise",
  Efficiency = "efficiency",
  CompetitiveDefense = "competitive_defense",
  Other = "other",
}

export enum SizeBand {
  Smb = "smb",
  Mid = "mid",
  Enterprise = "enterprise",
}

export enum DecisionHorizon {
  ThisQuarter = "this_quarter",
  Months6 = "months_6",
  Months12 = "months_12",
  UntilRunway = "until_runway",
}

export enum FieldSource {
  User = "user",
  DemoFixture = "demo_fixture",
  SystemDefault = "system_default",
  ProvideLater = "provide_later",
}

export enum ScopeCheckStatus {
  Skipped = "skipped",
  Unknown = "unknown",
  InScope = "in_scope",
  OutOfScope = "out_of_scope",
}

export const SHORT_TEXT_MAX = 200;
export const QUESTION_MAX = 500;
export const PRODUCT_SUMMARY_MAX = 2000;
export const FEATURE_DESCRIPTION_MAX = 4000;
export const MARKET_BEHAVIOR_MAX = 4000;
```

`emptyIntakeDraft(mode)` must return:

- `contractVersion: 1`, `mode`, `currency: "USD"`
- `outsideSpecIntent: false`, `alreadyLive: false`
- `scopeCheck.status`: `skipped` if demo, else `unknown`
- `company: { deliveryModel: "saas" }`
- `financials: { provideLater: false }`
- `scenarios: []`, `assumptions: []`
- `fieldSources: { currency: system_default, "company.deliveryModel": system_default }`

`financialMetricCount`: count how many of `cashUsd`, `customerCount`, `mrrUsd`, `runwayMonths` are `typeof number` (including `0` and negatives).

`validateIntakeStep`:

- Step 1: `company.name`, `productSummary`, `category`, `primaryBuyer`, `jobToBeDone`, `deliveryModel`, `sizeBand` non-empty (strings trimmed). `repoUrl` if present must be `http:` or `https:` URL.
- Step 2: `market.targetMarketBehavior` non-empty.
- Step 3: `constraints.budgetUsd >= 0` (number), `constraints.executionMonths > 0`.
- Step 4: `feature.description`, `feature.changeType`, `decision.questionText` non-empty.
- Step 5: `financials.provideLater === true` OR `financialMetricCount >= 2`. `customerCount` if present must be an integer `>= 0`. `mrrUsd`/`runwayMonths` if present `>= 0`. `cashUsd` if present may be negative.

`isIntakeComplete`: all five steps `ok` AND `intakeDraftSchema.safeParse` after filling defaults for booleans.

`intakeWarnings`:

- `financials.cashUsd < 0` → path `financials.cashUsd`, message includes negative cash
- `financials.customerCount === 0` → `financials.customerCount`
- `financials.provideLater === true` → `financials.provideLater`
- `alreadyLive` → `alreadyLive`
- `outsideSpecIntent` → `outsideSpecIntent`
- `scopeCheck.status` `unknown` or `out_of_scope` → `scopeCheck`

`deepMergeIntake`: deep-merge objects; **replace** arrays at `company.competitors`, `market.segmentChips`, `goals.chips`, `scenarios`, `assumptions`. Do **not** let the client overwrite `scopeCheck` unless the patch explicitly contains `scopeCheck`. For every dotted path whose value is present in the patch (except `scopeCheck`, `currency`, `company.deliveryModel`), set `fieldSources[path] = user`. Preserve existing `fieldSources` for untouched paths.

`intakeDraftPartialSchema`: required `contractVersion` literal 1, `mode`, `currency` literal `"USD"`; nested objects optional; `goals.primaryChip` refine: if set, must be in `goals.chips`; `company.competitors` max 10 strings each ≤200; money numbers when present.

`intakeDraftSchema`: same keys but company/market/constraints/feature/decision/financials required as in spec §6.2 complete document (goals still optional object). SuperRefine: financial rule same as step 5.

Export types via `z.infer`.

Add exports to `packages/domain/src/client.ts` (intake is browser-safe). Do not import `node:crypto` in this file.

- [ ] **Step 4: Run tests and make sure they pass**

Run: `pnpm --filter @ceo-sandbox/domain test`

Expected: PASS (existing domain tests still pass).

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/contracts/intake.ts packages/domain/src/contracts/intake.test.ts packages/domain/src/client.ts packages/domain/src/server.ts
git commit -m "$(cat <<'EOF'
feat(domain): add intake draft schemas and step validators

EOF
)"
```

---

### Task 2: Demo card Q20 fields and goal chips

**Files:**
- Modify: `fixtures/demo/decision-card-ai-analytics.json`
- Modify: `packages/domain/src/demo-card.ts`
- Modify: `packages/domain/src/demo-card.test.ts`

**Interfaces:**
- Consumes: `GoalChip`, `SizeBand` from Task 1
- Produces: `DemoCompany` gains `category`, `primaryBuyer`, `jobToBeDone`, `deliveryModel`, `sizeBand`. `DemoDecisionCard` gains `goalChips: GoalChip[]`, `primaryGoalChip: GoalChip`. `loadDemoCard` requires those keys.

- [ ] **Step 1: Write the failing test**

Append to `packages/domain/src/demo-card.test.ts`:

```typescript
  it("requires Q20 company fields and goal chips", () => {
    const raw = JSON.parse(
      readFileSync(
        join(__dirname, "../../../fixtures/demo/decision-card-ai-analytics.json"),
        "utf8",
      ),
    );
    const card = loadDemoCard(raw);
    expect(card.company.category).toBe("Workflow / project operations SaaS");
    expect(card.company.primaryBuyer).toBe("Mid-market operations or team lead");
    expect(card.company.jobToBeDone).toBe(
      "Track projects and operations in one workspace",
    );
    expect(card.company.deliveryModel).toBe("saas");
    expect(card.company.sizeBand).toBe("mid");
    expect(card.goalChips).toEqual(["revenue", "expansion", "enterprise"]);
    expect(card.primaryGoalChip).toBe("expansion");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ceo-sandbox/domain test`

Expected: FAIL — `category` undefined or `goalChips` missing.

- [ ] **Step 3: Write minimal implementation**

Update `fixtures/demo/decision-card-ai-analytics.json` `company` object to include:

```json
"category": "Workflow / project operations SaaS",
"primaryBuyer": "Mid-market operations or team lead",
"jobToBeDone": "Track projects and operations in one workspace",
"deliveryModel": "saas",
"sizeBand": "mid"
```

Add top-level (keep existing `goals` strings):

```json
"goalChips": ["revenue", "expansion", "enterprise"],
"primaryGoalChip": "expansion"
```

Extend `DemoCompany` and `parseCompany` in `demo-card.ts` to require those five fields (`deliveryModel` must equal `"saas"`, `sizeBand` one of `smb|mid|enterprise`). Extend `DemoDecisionCard` + `loadDemoCard` to require `goalChips` (non-empty string array) and `primaryGoalChip` (string, must be in `goalChips`).

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @ceo-sandbox/domain test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add fixtures/demo/decision-card-ai-analytics.json packages/domain/src/demo-card.ts packages/domain/src/demo-card.test.ts
git commit -m "$(cat <<'EOF'
feat(domain): require demo-card product context and goal chips

EOF
)"
```

---

### Task 3: `demoCardToIntakeDraft` and SessionDraft projection

**Files:**
- Create: `packages/domain/src/demo-card-to-intake.ts`
- Create: `packages/domain/src/demo-card-to-intake.test.ts`
- Create: `packages/domain/src/intake-to-session-draft.ts`
- Modify: `packages/domain/src/demo-card-to-draft.ts`
- Modify: `packages/domain/src/server.ts`

**Interfaces:**
- Consumes: `loadDemoCard`, `demoCardToSessionDraft` assumption-building (keep existing functions used internally or re-call current mapper then overlay).
- Produces: `demoCardToIntakeDraft(card: DemoDecisionCard): IntakeDraft` (complete; passes `intakeDraftSchema` + `isIntakeComplete`). `intakeDraftToSessionDraft(intake: IntakeDraftPartial): SessionDraft`. After this task, `demoCardToSessionDraft(card)` is `intakeDraftToSessionDraft(demoCardToIntakeDraft(card))`.

- [ ] **Step 1: Write the failing test**

Create `packages/domain/src/demo-card-to-intake.test.ts`:

```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { loadDemoCard } from "./demo-card";
import { demoCardToIntakeDraft } from "./demo-card-to-intake";
import { intakeDraftToSessionDraft } from "./intake-to-session-draft";
import { demoCardToSessionDraft } from "./demo-card-to-draft";
import {
  FieldSource,
  GoalChip,
  intakeDraftSchema,
  isIntakeComplete,
} from "./contracts/intake";
import { sessionDraftSchema } from "./contracts/session";
import { RunMode } from "./run-mode";

describe("demoCardToIntakeDraft", () => {
  it("hydrates a complete illustrative intake", () => {
    const card = loadDemoCard(
      JSON.parse(
        readFileSync(
          join(__dirname, "../../../fixtures/demo/decision-card-ai-analytics.json"),
          "utf8",
        ),
      ),
    );
    const intake = demoCardToIntakeDraft(card);
    expect(intake.mode).toBe(RunMode.Demo);
    expect(intake.scopeCheck.status).toBe("skipped");
    expect(intake.company.category).toBe(card.company.category);
    expect(intake.goals.chips).toEqual([
      GoalChip.Revenue,
      GoalChip.Expansion,
      GoalChip.Enterprise,
    ]);
    expect(intake.goals.primaryChip).toBe(GoalChip.Expansion);
    expect(intake.constraints.budgetUsd).toBe(250000);
    expect(intake.constraints.executionMonths).toBe(4);
    expect(intake.constraints.extraText).toBe(card.constraints.notes);
    expect(intake.feature.packaging).toBe(card.feature.packaging);
    expect(intake.financials.mrrUsd).toBe(80000);
    expect(intake.financials.provideLater).toBe(false);
    expect(intake.fieldSources["company.name"]).toBe(FieldSource.DemoFixture);
    expect(intakeDraftSchema.safeParse(intake).success).toBe(true);
    expect(isIntakeComplete(intake).ok).toBe(true);

    const projected = intakeDraftToSessionDraft(intake);
    expect(sessionDraftSchema.safeParse(projected).success).toBe(true);
    expect(projected.companyProfile.mrrUsd).toBe(80000);
    expect(demoCardToSessionDraft(card)).toEqual(projected);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ceo-sandbox/domain test`

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`demoCardToIntakeDraft`:

- Copy company name, productSummary, Q20 fields, financials from `card.company`.
- `decision.questionText = card.decisionQuestion`, `questionRevision: 1`.
- `feature` from card + `changeType: FeatureChangeType.Feature`.
- `market.targetMarketBehavior = card.targetMarketBehavior`.
- `goals.chips/primaryChip` from card; `constraints` from card (`notes` → `extraText`).
- Reuse existing assumption/scenario construction from current `demo-card-to-draft.ts` (move `FINANCE_SCENARIO_KEYS` / `assumptionsForScenario` into a shared helper in `demo-card-to-draft.ts` or into `demo-card-to-intake.ts` and have `demoCardToSessionDraft` call the intake mapper).
- Set `fieldSources` for every hydrated dotted path to `demo_fixture` (including financials and constraints).
- `alreadyLive: false`, `outsideSpecIntent: false`, `scopeCheck: { status: "skipped" }`.

`intakeDraftToSessionDraft`:

```typescript
export function intakeDraftToSessionDraft(intake: IntakeDraftPartial): SessionDraft {
  const parsed = sessionDraftSchema.parse({
    mode: intake.mode,
    decision: {
      questionText: intake.decision?.questionText ?? "",
      questionRevision: intake.decision?.questionRevision ?? 1,
    },
    companyProfile: {
      name: intake.company?.name,
      productSummary: intake.company?.productSummary ?? "",
      customerCount: intake.financials?.customerCount,
      cashUsd: intake.financials?.cashUsd,
      mrrUsd: intake.financials?.mrrUsd,
      runwayMonths: intake.financials?.runwayMonths,
    },
    featureProposal: {
      title: intake.feature?.title,
      description: intake.feature?.description ?? "",
      changeType: intake.feature?.changeType ?? FeatureChangeType.Feature,
    },
    scenarios: intake.scenarios ?? [],
    assumptions: intake.assumptions ?? [],
  });
  return parsed;
}
```

If `name` is missing (partial), omit it — `sessionDraftCompanyProfileSchema` already has `name` optional.

Rewrite `demoCardToSessionDraft` as:

```typescript
export function demoCardToSessionDraft(card: DemoDecisionCard): SessionDraft {
  return intakeDraftToSessionDraft(demoCardToIntakeDraft(card));
}
```

Existing `demo-card-to-draft.test.ts` must still pass.

Export `demoCardToIntakeDraft` and `intakeDraftToSessionDraft` from `packages/domain/src/server.ts`.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @ceo-sandbox/domain test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/demo-card-to-intake.ts packages/domain/src/demo-card-to-intake.test.ts packages/domain/src/intake-to-session-draft.ts packages/domain/src/demo-card-to-draft.ts packages/domain/src/server.ts
git commit -m "$(cat <<'EOF'
feat(domain): map demo cards to intake drafts

EOF
)"
```

---

### Task 4: `@ceo-sandbox/db` SQLite session store

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/src/index.ts`
- Create: `packages/db/src/sessions.ts`
- Create: `packages/db/src/sessions.test.ts`
- Create: `packages/db/src/frozen-error.ts`
- Modify: `.gitignore` (add `data/` and `*.sqlite`)

**Interfaces:**
- Consumes: `intakeDraftPartialSchema`, `isIntakeComplete`, `RunMode`, `emptyIntakeDraft`
- Produces: `class FrozenSessionError extends Error`, `openSessionStore(filePath: string): SessionStore` with:
  - `createSession(input: { mode: RunMode; intake: IntakeDraftPartial }): SessionRecord`
  - `getSession(id: string): SessionRecord | null`
  - `updateIntake(id: string, intake: IntakeDraftPartial): SessionRecord` — if status is `frozen`, throw `FrozenSessionError`; if status is `approved`, set status back to `draft` and clear `approvedAt`
  - `approveSession(id: string): SessionRecord` — throw if `!isIntakeComplete`; set `status: "approved"`, `approvedAt`
  - `startSession(id: string): SessionRecord` — throw `Error("not_approved")` if status !== `approved`; set `status: "frozen"`, `frozenAt`
- `SessionRecord`: `{ id, contractVersion: 1, mode, status: "draft"|"approved"|"frozen", questionRevision: number, intake: IntakeDraftPartial, createdAt, updatedAt, approvedAt: string | null, frozenAt: string | null }`

- [ ] **Step 1: Write the failing test**

`packages/db/src/sessions.test.ts` (use `mkdtempSync` + a file path; never the real `data/sandbox.sqlite`):

```typescript
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, afterEach } from "vitest";
import { emptyIntakeDraft, isIntakeComplete } from "@ceo-sandbox/domain";
import { RunMode } from "@ceo-sandbox/domain";
import { FrozenSessionError, openSessionStore } from "./sessions";

function completeDemoLike(mode: RunMode) {
  const d = emptyIntakeDraft(mode);
  d.company = {
    name: "Acme",
    productSummary: "B2B SaaS",
    category: "Workflow",
    primaryBuyer: "Ops lead",
    jobToBeDone: "Track work",
    deliveryModel: "saas",
    sizeBand: "mid",
  };
  d.market = { targetMarketBehavior: "SMB and enterprise buyers" };
  d.constraints = { budgetUsd: 1000, executionMonths: 3 };
  d.feature = {
    description: "AI add-on",
    changeType: "feature",
  };
  d.decision = { questionText: "Should we launch it?" };
  d.financials = { provideLater: true };
  return d;
}

describe("openSessionStore", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  });

  function store() {
    const dir = mkdtempSync(join(tmpdir(), "ceo-db-"));
    dirs.push(dir);
    return openSessionStore(join(dir, "sandbox.sqlite"));
  }

  it("creates, reads, patches, approves, starts, and rejects frozen patch", () => {
    const db = store();
    const created = db.createSession({
      mode: RunMode.Full,
      intake: emptyIntakeDraft(RunMode.Full),
    });
    expect(created.status).toBe("draft");
    expect(created.questionRevision).toBe(1);
    expect(created.intake.currency).toBe("USD");

    const again = db.getSession(created.id);
    expect(again?.id).toBe(created.id);

    const patched = db.updateIntake(created.id, {
      ...created.intake,
      company: { ...created.intake.company, name: "N" },
    });
    expect(patched.intake.company?.name).toBe("N");
    expect(patched.status).toBe("draft");

    expect(() => db.approveSession(created.id)).toThrow(/incomplete|intake/i);

    db.updateIntake(created.id, completeDemoLike(RunMode.Full));
    expect(isIntakeComplete(db.getSession(created.id)!.intake).ok).toBe(true);

    const approved = db.approveSession(created.id);
    expect(approved.status).toBe("approved");
    expect(approved.approvedAt).toBeTruthy();

    const afterEdit = db.updateIntake(created.id, {
      ...approved.intake,
      decision: { questionText: "Edited?" },
    });
    expect(afterEdit.status).toBe("draft");

    db.approveSession(created.id);
    const started = db.startSession(created.id);
    expect(started.status).toBe("frozen");
    expect(started.frozenAt).toBeTruthy();

    expect(() => db.updateIntake(created.id, started.intake)).toThrow(
      FrozenSessionError,
    );

    const reopened = openSessionStore(join(dirs[0], "sandbox.sqlite"));
    expect(reopened.getSession(created.id)?.status).toBe("frozen");
  });

  it("start without approve throws", () => {
    const db = store();
    const row = db.createSession({
      mode: RunMode.Full,
      intake: completeDemoLike(RunMode.Full),
    });
    expect(() => db.startSession(row.id)).toThrow(/not_approved/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Create `packages/db/package.json`:

```json
{
  "name": "@ceo-sandbox/db",
  "private": true,
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "@ceo-sandbox/domain": "workspace:*",
    "better-sqlite3": "^11.8.1"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "typescript": "^5.7.3",
    "vitest": "^3.0.5"
  }
}
```

`packages/db/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

Run: `cd e:/Projects/neatHacks/ideaSiulation && pnpm install && pnpm --filter @ceo-sandbox/db test`

Expected: FAIL — `./sessions` missing (or `openSessionStore` not defined). If `better-sqlite3` native build fails on Windows, install Visual Studio C++ build tools and retry `pnpm install`; do not swap to a different database.

- [ ] **Step 3: Write minimal implementation**

`packages/db/src/frozen-error.ts`:

```typescript
export class FrozenSessionError extends Error {
  constructor(message = "Session intake is frozen") {
    super(message);
    this.name = "FrozenSessionError";
  }
}
```

`packages/db/src/sessions.ts`: create table exactly as spec §5. `id` via `crypto.randomUUID()`. `intake_json` = `JSON.stringify` of object that `intakeDraftPartialSchema.parse`s on write and read. `contract_version` always 1. `question_revision` always 1 on create (never bump in SP-03). Timestamps `new Date().toISOString()`.

`getSession`: `SELECT` by id; return `null` if missing.

`updateIntake`: load row; if `status === 'frozen'` throw `FrozenSessionError`; parse incoming with `intakeDraftPartialSchema` (throw Zod error if invalid); if current status is `approved`, write `status='draft'` and `approved_at=NULL`.

`approveSession`: load; parse complete via `isIntakeComplete`; if not ok throw `Error("incomplete_intake")`; set approved.

`startSession`: if `status !== 'approved'` throw `Error("not_approved")`.

`packages/db/src/index.ts`:

```typescript
export { FrozenSessionError } from "./frozen-error";
export { openSessionStore, type SessionRecord, type SessionStore } from "./sessions";
```

Append to `.gitignore`:

```
data/
*.sqlite
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @ceo-sandbox/db test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/db .gitignore pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(db): persist intake sessions in SQLite

EOF
)"
```

---

### Task 5: Session HTTP API (create, get, patch, current, cookie)

**Files:**
- Create: `apps/web/lib/resolve-sqlite-path.ts`
- Create: `apps/web/lib/session-store.ts`
- Create: `apps/web/lib/session-cookie.ts`
- Create: `apps/web/lib/load-demo-card.ts`
- Create: `apps/web/lib/api-errors.ts`
- Create: `apps/web/app/api/sessions/route.ts`
- Create: `apps/web/app/api/sessions/current/route.ts`
- Create: `apps/web/app/api/sessions/[id]/route.ts`
- Create: `apps/web/app/api/sessions/route.test.ts`
- Modify: `apps/web/package.json` (add `@ceo-sandbox/db`, vitest, test script)
- Modify: `apps/web/next.config.ts` (`transpilePackages` + `serverExternalPackages`)

**Interfaces:**
- Consumes: `openSessionStore`, `deepMergeIntake`, `emptyIntakeDraft`, `demoCardToIntakeDraft`, `LAST_SESSION_COOKIE`, `FrozenSessionError`
- Produces: HTTP as spec §4. `setLastSessionCookie(response, id)`, `readLastSessionCookie(request): string | undefined`. `getStore()` uses `SANDBOX_SQLITE_PATH` or `resolveSqlitePath()`.

JSON bodies:

- `POST /api/sessions` `{ "mode": "demo"|"full", "demoCardId"?: string }` → 201 `{ id, status, intake }`. Demo without card or with `demo-ai-analytics-premium` hydrates fixture. Full ignores card and uses `emptyIntakeDraft(full)`. Unknown `demoCardId` → 404. Sets cookie.
- `GET /api/sessions/current` cookie → 200 same JSON or 404
- `GET /api/sessions/:id` → 200 or 404
- `PATCH /api/sessions/:id` `{ "intake": { ...partial } }` → deepMerge + `updateIntake`. Frozen → 409 `{ error: "frozen" }`. Invalid UUID → 400. Zod fail → 400 `{ errors }`.

- [ ] **Step 1: Write the failing test**

`apps/web/app/api/sessions/route.test.ts`:

```typescript
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LAST_SESSION_COOKIE, RunMode } from "@ceo-sandbox/domain";

describe("POST /api/sessions", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
    delete process.env.SANDBOX_SQLITE_PATH;
  });

  it("creates a full session, sets cookie, patches, and 409s after freeze via store", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ceo-web-"));
    dirs.push(dir);
    process.env.SANDBOX_SQLITE_PATH = join(dir, "sandbox.sqlite");

    const { POST } = await import("./route");
    const created = await POST(
      new Request("http://localhost/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: RunMode.Full }),
      }),
    );
    expect(created.status).toBe(201);
    const body = await created.json();
    expect(body.status).toBe("draft");
    expect(body.intake.mode).toBe("full");
    const cookie = created.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(LAST_SESSION_COOKIE);
    expect(cookie.toLowerCase()).toContain("httponly");

    const { PATCH, GET } = await import("./[id]/route");
    const got = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: body.id }),
    });
    expect(got.status).toBe(200);

    const patched = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intake: { company: { name: "Acme" } } }),
      }),
      { params: Promise.resolve({ id: body.id }) },
    );
    expect(patched.status).toBe(200);
    const patchedBody = await patched.json();
    expect(patchedBody.intake.company.name).toBe("Acme");
  });
});
```

Dynamic `import()` after setting env so `getStore()` sees the temp path. If the module caches the store, `getStore()` must open a new connection when `SANDBOX_SQLITE_PATH` changes **or** call `openSessionStore` per request (per-request open is the required implementation).

- [ ] **Step 2: Run test to verify it fails**

`apps/web/package.json` add:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "test": "vitest run"
}
```

Dependencies: `"@ceo-sandbox/db": "workspace:*"`. Dev: `"vitest": "^3.0.5"`.

`next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ceo-sandbox/domain", "@ceo-sandbox/db"],
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
```

Run: `cd e:/Projects/neatHacks/ideaSiulation && pnpm install && pnpm --filter @ceo-sandbox/web test`

Expected: FAIL — route module missing.

- [ ] **Step 3: Write minimal implementation**

`resolve-sqlite-path.ts`: if `process.env.SANDBOX_SQLITE_PATH` use it; else walk `process.cwd()` and parents until `pnpm-workspace.yaml` exists, then `join(root, "data", "sandbox.sqlite")`; if not found throw. `mkdirSync` dirname `{ recursive: true }` at open time in `getStore`.

`session-store.ts`:

```typescript
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { openSessionStore } from "@ceo-sandbox/db";
import { resolveSqlitePath } from "./resolve-sqlite-path";

export function getStore() {
  const filePath = resolveSqlitePath();
  mkdirSync(dirname(filePath), { recursive: true });
  return openSessionStore(filePath);
}
```

`session-cookie.ts`:

```typescript
import { NextResponse } from "next/server";
import { LAST_SESSION_COOKIE } from "@ceo-sandbox/domain";

export function setLastSessionCookie(res: NextResponse, sessionId: string) {
  res.cookies.set(LAST_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return res;
}

export function readLastSessionCookie(request: Request): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  const parts = header.split(";");
  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=");
    if (k === LAST_SESSION_COOKIE) return rest.join("=");
  }
  return undefined;
}
```

`POST /api/sessions`: parse JSON; `mode` via `parseRunMode`. If `mode === demo` load `fixtures/demo/decision-card-ai-analytics.json` with `loadDemoCard` + `demoCardToIntakeDraft` (from `@ceo-sandbox/domain/server`). If `demoCardId` present and not `demo-ai-analytics-premium`, 404. Create row, 201 + cookie.

`PATCH`: `deepMergeIntake(existing.intake, body.intake ?? {})` then `updateIntake`. Catch `FrozenSessionError` → 409.

UUID check: `z.string().uuid().safeParse(id)`.

Map Zod errors to `{ errors: { [path]: message } }` with path joined by `.`.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @ceo-sandbox/web test` and `pnpm --filter @ceo-sandbox/domain test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web packages/db pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(web): add session create/get/patch API

EOF
)"
```

---

### Task 6: Approve and Start endpoints

**Files:**
- Create: `apps/web/app/api/sessions/[id]/approve/route.ts`
- Create: `apps/web/app/api/sessions/[id]/start/route.ts`
- Create: `apps/web/app/api/sessions/[id]/approve/route.test.ts`

**Interfaces:**
- Consumes: `getStore().approveSession` / `startSession`
- Produces: `POST /api/sessions/:id/approve` → 200 `{ id, status, intake }` or 400 `{ errors }` from `isIntakeComplete`. `POST /api/sessions/:id/start` → 200 frozen or 400 `{ error: "not_approved" }`. Missing id → 404.

- [ ] **Step 1: Write the failing test**

```typescript
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { emptyIntakeDraft } from "@ceo-sandbox/domain";
import { RunMode } from "@ceo-sandbox/domain";

function complete(mode: typeof RunMode.Full) {
  const d = emptyIntakeDraft(mode);
  d.company = {
    name: "Acme",
    productSummary: "B2B SaaS",
    category: "Workflow",
    primaryBuyer: "Ops",
    jobToBeDone: "Track",
    deliveryModel: "saas",
    sizeBand: "mid",
  };
  d.market = { targetMarketBehavior: "Buyers" };
  d.constraints = { budgetUsd: 1, executionMonths: 1 };
  d.feature = { description: "Feat", changeType: "feature" };
  d.decision = { questionText: "Go?" };
  d.financials = { provideLater: true };
  return d;
}

describe("approve and start", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
    delete process.env.SANDBOX_SQLITE_PATH;
  });

  it("rejects start before approve and freeze after start", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ceo-web-"));
    dirs.push(dir);
    process.env.SANDBOX_SQLITE_PATH = join(dir, "sandbox.sqlite");

    const { POST: create } = await import("../../route");
    const createdRes = await create(
      new Request("http://localhost/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "full" }),
      }),
    );
    const created = await createdRes.json();

    const { PATCH } = await import("../route");
    await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intake: complete(RunMode.Full) }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );

    const { POST: start } = await import("./start/route");
    const startEarly = await start(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(startEarly.status).toBe(400);

    const { POST: approve } = await import("./approve/route");
    const approved = await approve(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(approved.status).toBe(200);
    expect((await approved.json()).status).toBe("approved");

    const started = await start(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(started.status).toBe(200);
    expect((await started.json()).status).toBe("frozen");
  });
});
```

Adjust relative imports to match file location `apps/web/app/api/sessions/[id]/approve/route.test.ts` (`../../route` = `sessions/route.ts`, `../route` = `[id]/route.ts`, `./start/route` sibling under `[id]`). If Vitest path aliases fail, import via absolute `apps/web/app/api/...` from the test using relative paths that actually resolve: from `approve/route.test.ts`, create is `../../route.ts`, patch is `../route.ts`, start is `../start/route.ts`.

- [ ] **Step 2: Run test — fail**

- [ ] **Step 3: Implement approve/start route handlers** calling `getStore()`. Catch `incomplete_intake` → 400 `{ errors }` using `isIntakeComplete`. Catch `not_approved` → 400.

- [ ] **Step 4: Run** `pnpm --filter @ceo-sandbox/web test` → PASS

- [ ] **Step 5: Commit** `feat(web): add intake approve and start endpoints`

---

### Task 7: LLM scope-check (fail-open)

**Files:**
- Create: `apps/web/lib/scope-check.ts`
- Create: `apps/web/lib/scope-check.test.ts`
- Create: `apps/web/app/api/sessions/[id]/recap/scope-check/route.ts`
- Create: `apps/web/app/api/sessions/[id]/recap/scope-check/route.test.ts`

**Interfaces:**
- Produces: `classifyIntakeScope(input, deps?: { fetchFn?: typeof fetch; now?: () => Date; env?: NodeJS.ProcessEnv }): Promise<{ status: ScopeCheckStatus; reason?: string; ranAt: string }>`
- Input: `{ questionText, featureDescription, changeType, productSummary, alreadyLive }`
- Env: `LLM_PROVIDER`, `LLM_MODEL`. Also read `OPENAI_API_KEY` if provider is `openai`, `ANTHROPIC_API_KEY` if `anthropic`. Missing provider, model, or key → `{ status: unknown, reason: "LLM not configured" }` without calling network.
- Timeout 8000ms (AbortController). Non-JSON / invalid classification / HTTP !ok / abort → `unknown` with reason, **never throw**.
- Map: `existing_product_change` → `in_scope`; `entirely_new` → `out_of_scope`; `unclear` → `unknown`.
- Route: if session `mode === demo` **do not call** classifier; write `scopeCheck: { status: skipped, ranAt }` and return it. Full: call classifier; if `out_of_scope` also set `intake.outsideSpecIntent = true`; persist via `updateIntake` **unless frozen** (if frozen, return stored check without rewrite).

- [ ] **Step 1: Write the failing tests**

`apps/web/lib/scope-check.test.ts`:

```typescript
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
```

Prompt the model (system + user) to return **only** JSON `{ "classification": "existing_product_change" | "entirely_new" | "unclear", "reason": string }` with reason ≤200 chars. OpenAI: `POST https://api.openai.com/v1/chat/completions` with `response_format: { type: "json_object" }`, `Authorization: Bearer ${OPENAI_API_KEY}`. Anthropic: `POST https://api.anthropic.com/v1/messages` with `anthropic-version: 2023-06-01`, `x-api-key`. Any other `LLM_PROVIDER` → unknown, no fetch.

- [ ] **Step 2: Run fail** — `pnpm --filter @ceo-sandbox/web test`

- [ ] **Step 3: Implement** `scope-check.ts` and the route. Route tests: demo session returns skipped without using fetch (pass a fetchFn that `throw`s if called, via env injection only in unit tests of classify; for the route, create a demo session and assert skipped).

- [ ] **Step 4: Tests pass**

- [ ] **Step 5: Commit** `feat(web): add fail-open intake scope check`

---

### Task 8: Start page (create session + continue)

**Files:**
- Modify: `apps/web/app/layout.tsx` (title **CEO Decision Sandbox**)
- Modify: `apps/web/app/page.tsx`
- Create: `apps/web/app/not-found.tsx`

**Interfaces:**
- Consumes: `POST /api/sessions`, `GET /api/sessions/current`
- Produces: Demo card button (id `demo-ai-analytics-premium`), Full **New decision**, **Continue last session** only if current returns 200. Continue routes: `draft` → `/intake/{id}?step=1`, `approved` → `/intake/{id}/recap`, `frozen` → `/session/{id}`. No Reset demo. Keep Demo/Full radios. Footer may keep `CLAIM_SAFETY_COPY.panelSimulated`.

- [ ] **Step 1: Write a small module test for continue href** (pure function, no browser)

Create `apps/web/lib/continue-href.ts`:

```typescript
export function continueHref(status: string, id: string): string {
  if (status === "approved") return `/intake/${id}/recap`;
  if (status === "frozen") return `/session/${id}`;
  return `/intake/${id}?step=1`;
}
```

Create `apps/web/lib/continue-href.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { continueHref } from "./continue-href";

describe("continueHref", () => {
  it("maps status to routes", () => {
    expect(continueHref("draft", "abc")).toBe("/intake/abc?step=1");
    expect(continueHref("approved", "abc")).toBe("/intake/abc/recap");
    expect(continueHref("frozen", "abc")).toBe("/session/abc");
  });
});
```

- [ ] **Step 2: Run** `pnpm --filter @ceo-sandbox/web test` — FAIL missing module

- [ ] **Step 3: Implement** `continueHref` + rewrite `page.tsx` as a client component:

On mount, `fetch("/api/sessions/current")`; if 200, show Continue using `continueHref`.

Demo selected: button **Use illustrative scenario** → `POST { mode: "demo", demoCardId: "demo-ai-analytics-premium" }` then `window.location.assign(/intake/${id}?step=1)`.

Full: button **New decision** → `POST { mode: "full" }` then same assign.

Show **Illustrative example** near the demo card label.

`layout.tsx` metadata title: `CEO Decision Sandbox`. `h1` on the page: `CEO Decision Sandbox`.

`not-found.tsx`: heading `Session not found` and link home `/`.

- [ ] **Step 4: Tests pass** (`pnpm --filter @ceo-sandbox/web test`)

- [ ] **Step 5: Commit** `feat(web): start page creates and resumes intake sessions`

---

### Task 9: Five-step intake wizard

**Files:**
- Create: `apps/web/app/intake/[sessionId]/page.tsx`
- Create: `apps/web/components/intake/IntakeWizard.tsx`
- Create: `apps/web/lib/feature-one-liner.ts`
- Create: `apps/web/lib/feature-one-liner.test.ts`

**Interfaces:**
- Consumes: `GET/PATCH /api/sessions/:id`, `validateIntakeStep`, `intakeWarnings`, enums
- Produces: Client wizard at `/intake/[sessionId]?step=1..5`. Invalid/missing session → `notFound()`. Frozen → all inputs `readOnly`, no PATCH, copy: `Intake is locked after Start investigation.` Next disabled until `validateIntakeStep(step, draft).ok`. Each Next/Back/Save PATCHes `{ intake: draft }` (send the full current draft object as the merge patch of changed sections — simplest correct approach: PATCH `{ intake: localDraft }` where localDraft is the edited partial; server deep-merges). After successful Next, `router.push(?step=n+1)`. Step 5 Next goes to `/intake/{id}/recap`. Demo mode: chip **Illustrative example**. Steps 1–4 wrap optional fields in `<details><summary>More details</summary>…`.

- [ ] **Step 1: Test feature one-liner**

```typescript
import { describe, expect, it } from "vitest";
import { featureOneLiner } from "./feature-one-liner";

describe("featureOneLiner", () => {
  it("prefers title", () => {
    expect(featureOneLiner({ title: "AI add-on", description: "Long. Text." })).toBe(
      "AI add-on",
    );
  });
  it("uses first sentence of description", () => {
    expect(featureOneLiner({ description: "Natural-language insights. Extra." })).toBe(
      "Natural-language insights",
    );
  });
});
```

```typescript
export function featureOneLiner(feature?: {
  title?: string;
  description?: string;
}): string {
  if (feature?.title && feature.title.trim()) return feature.title.trim();
  const d = feature?.description ?? "";
  const sentence = d.split(/[.!?]/)[0] ?? d;
  return sentence.trim().slice(0, 160);
}
```

- [ ] **Step 2: Run fail** then implement helper.

- [ ] **Step 3: Implement wizard UI**

`page.tsx` is a server component: `params.sessionId`, render `<IntakeWizard sessionId={sessionId} />`.

`IntakeWizard.tsx` (`"use client"`):

1. `useEffect` GET `/api/sessions/${sessionId}`. 404 → `window.location.assign` is wrong; throw to error boundary **or** set `missing=true` and render `Session not found` plus link `/`. Prefer: if `res.status === 404` render the same copy as `not-found.tsx`.
2. Local state `intake`, `status`, `step` from `searchParams.get("step")` default 1, clamp 1–5.
3. `frozen = status === "frozen"`.
4. Fields (controlled inputs) — **all of these must exist**:

**Step 1:** name, productSummary (counter / 2000), category, primaryBuyer, jobToBeDone, deliveryModel (read-only text `saas`), sizeBand select (`smb|mid|enterprise`). More details: repoUrl, domain, geography, competitors (comma-separated, split/trim to array max 10).

**Step 2:** targetMarketBehavior (counter / 4000). More details: segmentChips as checkboxes for every `PrimarySegment` value.

**Step 3:** budgetUsd number, executionMonths number. More details: goal chip checkboxes (`GoalChip` values), primaryChip select (only selected chips), nuance, horizon select, extraText, legalPrivacy, segmentRestrictions, pricingRules, hiringRaiseLimits, teamCapacityFte, teamSkillsNote.

**Step 4:** questionText (counter / 500), feature description (counter / 4000), changeType select (`feature|pricing|ui|other`) with empty option in Full when unset. More details: title, packaging, proposedPriceUsd, proposedPricePeriod, currentPricingText, alreadyLive checkbox labeled `Evaluating a change to a live feature`.

**Step 5:** provideLater checkbox; cashUsd, customerCount, mrrUsd, runwayMonths. Show `validateIntakeStep(5)` errors. Show `intakeWarnings` as yellow text; do not block.

5. Buttons: Back (step>1), Save (PATCH, stay), Next (validate, PATCH, navigate). Last step Next label **Go to recap**.
6. Inline errors from `validateIntakeStep` on Next and under fields.
7. Character counters; do not silent-truncate — if over cap, Next stays blocked because PATCH 400; also disable Next when `value.length > max`.

Use the existing inline-style look from `page.tsx` (no new CSS framework).

- [ ] **Step 4: Run** `pnpm --filter @ceo-sandbox/web test` and `pnpm --filter @ceo-sandbox/domain test` → PASS

- [ ] **Step 5: Commit** `feat(web): add five-step intake wizard`

---

### Task 10: Recap, freeze placeholder, 404

**Files:**
- Create: `apps/web/app/intake/[sessionId]/recap/page.tsx`
- Create: `apps/web/components/intake/IntakeRecap.tsx`
- Create: `apps/web/app/session/[sessionId]/page.tsx`
- Create: `apps/web/lib/recap-model.ts`
- Create: `apps/web/lib/recap-model.test.ts`

**Interfaces:**
- Consumes: GET session, POST scope-check, POST approve, POST start, `featureOneLiner`, `intakeWarnings`
- Produces: Recap visible fields from spec §7. Actions: **Edit** → `/intake/{id}?step=1` (PATCH will un-approve if needed). **Approve** → POST approve. **Start investigation** disabled unless `status === "approved"`. Start → POST start then navigate `/session/{id}`. Full mode: on mount POST scope-check if `scopeCheck.status` is `skipped` or `unknown` **or** `decision.questionText`/`feature.description` changed vs values stored in `scopeCheck` — store last hashed texts on the client from the GET payload: rerun when those two strings do not match `scopeCheck.inputQuestion`/`scopeCheck.inputFeature` if you add those optional fields; **simpler required rule:** rerun when Full and (`status` is `skipped` or `unknown` or missing `ranAt`). After a successful check, later remounts with `in_scope`/`out_of_scope` and same GET body do not recall unless Edit happened (status back to draft clears check in wizard PATCH? **Do not auto-clear.** Recap button **Edit** goes to wizard; wizard PATCH of question/feature does not reset scopeCheck. Recap on mount: if Full, always POST scope-check (idempotent enough for v1). Demo: never POST (server skips anyway); show **scope check skipped**.

Placeholder page: heading `Investigation`, body `Intake is frozen. The investigation pipeline lands in SP-10.` Show decision question + **Illustrative example** if demo. Link to recap (view-only).

- [ ] **Step 1: Recap model test**

```typescript
import { describe, expect, it } from "vitest";
import { emptyIntakeDraft, GoalChip, RunMode } from "@ceo-sandbox/domain";
import { buildRecapModel } from "./recap-model";

describe("buildRecapModel", () => {
  it("shows two goal chips, budget, time, and illustrative for demo", () => {
    const intake = emptyIntakeDraft(RunMode.Demo);
    intake.decision = { questionText: "Launch?" };
    intake.feature = { title: "AI add-on", description: "Insights." };
    intake.goals = {
      chips: [GoalChip.Revenue, GoalChip.Expansion, GoalChip.Enterprise],
    };
    intake.constraints = { budgetUsd: 250000, executionMonths: 4 };
    const model = buildRecapModel(intake, "draft");
    expect(model.question).toBe("Launch?");
    expect(model.featureOneLiner).toBe("AI add-on");
    expect(model.goalChips).toEqual(["revenue", "expansion"]);
    expect(model.budgetUsd).toBe(250000);
    expect(model.executionMonths).toBe(4);
    expect(model.illustrative).toBe(true);
  });
});
```

```typescript
import { GoalChip, RunMode, type IntakeDraftPartial } from "@ceo-sandbox/domain";
import { featureOneLiner } from "./feature-one-liner";

export function buildRecapModel(
  intake: IntakeDraftPartial,
  _status: string,
) {
  const chips = (intake.goals?.chips ?? []).slice(0, 2);
  return {
    question: intake.decision?.questionText ?? "",
    featureOneLiner: featureOneLiner(intake.feature),
    goalChips: chips.map((c) => (c as GoalChip)),
    budgetUsd: intake.constraints?.budgetUsd,
    executionMonths: intake.constraints?.executionMonths,
    illustrative: intake.mode === RunMode.Demo,
    provideLater: intake.financials?.provideLater === true,
    outsideSpecIntent: intake.outsideSpecIntent === true,
    alreadyLive: intake.alreadyLive === true,
    scopeStatus: intake.scopeCheck?.status,
  };
}
```

- [ ] **Step 2: Fail then implement helper**

- [ ] **Step 3: Recap + placeholder UI**

`IntakeRecap.tsx`: load GET; if Full POST scope-check then GET again. Render model fields as a list. Chips: Illustrative example; Assumed/provide later if `provideLater` or any `fieldSources` value is `demo_fixture` or `provide_later`; warning copy `This sandbox is tuned for existing B2B SaaS feature decisions.` when `outsideSpecIntent` or `scopeStatus === out_of_scope`; `Scope check skipped` when `unknown` or `skipped`. Buttons as specified. Frozen: hide Approve/Start or disable; Edit hidden or disabled (view-only — **no Edit button when frozen**).

Approve error: show `errors` from 400.

Start enabled only when `status === "approved"`.

Placeholder uses GET; 404 → not found copy.

- [ ] **Step 4: Tests pass**

- [ ] **Step 5: Commit** `feat(web): add intake recap, start freeze, and placeholder`

---

### Task 11: Docs, README, index

**Files:**
- Modify: `.docs/subproblems/00-index.md` (SP-03 plan path)
- Modify: `README.md` (link spec + plan; mention `data/sandbox.sqlite`, `SANDBOX_SQLITE_PATH`, optional `LLM_PROVIDER` / `LLM_MODEL` / `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`)
- Modify: `.docs/specs/SP-01-success-checklist.md` only if there is an intake checkbox — add `- [ ] Demo card → wizard → recap → Start investigation placeholder` if that file lists demo beats.

**Interfaces:** none.

- [ ] **Step 1:** Set the SP-03 plan cell to `docs/superpowers/plans/2026-10-11-sp03-intake-and-company-context.md` (replace `*(plan after spec review)*`).

- [ ] **Step 2:** README development section: SQLite file is created at `data/sandbox.sqlite`; gitignored.

- [ ] **Step 3:** Commit `docs: link SP-03 intake spec and plan`

---

### Task 12: Manual browser verification (no Playwright)

**Files:** none required.

- [ ] **Step 1:** `pnpm test` at repo root → all packages PASS.

- [ ] **Step 2:** `pnpm --filter @ceo-sandbox/web dev`. In the browser:

  1. Demo → Use illustrative scenario → five steps already filled → recap shows question, AI feature one-liner, two goal chips, budget/time, Illustrative example → Approve → Start investigation → placeholder copy. Refresh placeholder; session remains frozen. Wizard URL is view-only.
  2. Home Full → New decision → step 1 Next blocked → fill required fields through step 5 (`provideLater` ok) → recap (scope skipped or unknown if no LLM keys; still Approve) → Start.
  3. Home Continue last session returns to frozen placeholder.
  4. PATCH frozen returns 409 (DevTools or wizard save does nothing / errors).

If any step fails, fix in the matching task and re-run that task's tests before continuing.

- [ ] **Step 3:** Commit only if verification required code fixes: `fix(web): intake verification follow-ups`

---

## Self-review

| Spec section | Task |
|--------------|------|
| §1 clarifications | Global constraints + Tasks 4–10 |
| §3 architecture | 4, 5, 8–10 |
| §4 HTTP + cookie | 5, 6, 7 |
| §5 SQLite | 4 |
| §6 schemas, caps, steps, financial rule | 1, 3 |
| §7 wizard UI | 8, 9, 10 |
| §8 LLM | 7 |
| §9 validation/warnings | 1, 9 |
| §10 demo card | 2, 3 |
| §11 downstream mapping | types only (Task 1 fields) — no vendor calls |
| §12 errors | 5, 6, 10 |
| §13 tests | 1–7, 12 |
| §14 out of scope | not implemented |

**Placeholder scan:** no TBD. `LLM_PROVIDER` other than openai/anthropic fail-opens (specified).

**Type consistency:** `LAST_SESSION_COOKIE`, `openSessionStore`, `FrozenSessionError`, `demoCardToIntakeDraft`, `deepMergeIntake`, `continueHref`, `buildRecapModel`, `classifyIntakeScope` names are stable across tasks.

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-10-11-sp03-intake-and-company-context.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks

**2. Inline Execution** — run tasks in this session with executing-plans and checkpoints

Which approach?
