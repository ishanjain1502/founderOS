# SP-07 cfo.ai Financial Evaluation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** At **wizard start**, provision (or queue) a **per-company cfo.ai workspace** and store `orgId` on the session. On a frozen session, after assumption approve, run Pilot vs Broad in **that** org via MCP (or labeled fixture), persist results, and show Modeled comparison.

**Architecture:** `POST /api/sessions` calls `provisionCfoWorkspace` (see `.docs/practical/cfo-workspace-provisioning.md`). `@ceo-sandbox/domain` owns `cfoWorkspace` schema, mapping template, assumption-pack validation, checks, sensitivity, `epistemic.finance`. `apps/web/lib/cfo-ai` owns MCP client (**`org_id` on every call**), bootstrap, smoke, `runFinancePath`. Finance routes require `session.cfoWorkspace.bootstrapStatus === "ready"` for live path.

**Tech Stack:** TypeScript 5.x, Zod 3.x, Vitest, pnpm, Next.js 15 (`runtime = "nodejs"` on finance routes). Native `fetch` for MCP HTTP transport.

## Global Constraints

- Source of truth: `.docs/specs/SP-07-cfo-ai-financial-evaluation.md`. Where this plan and the spec disagree, the spec wins.
- **Per-company `org_id`** on session intake; MCP tools always pass `org_id`. No shared production org.
- Live finance only when `cfoWorkspace.bootstrapStatus === "ready"` **and** `CFO_LIVE=1` **and** `CFO_MCP_ACCESS_TOKEN` set. MCP cannot create workspaces — provisioning uses partner API or interim `pending` + fixture (see practical doc).
- ≤ **20** MCP tool calls per finance phase; ≤ **90s** wall-clock (`FINANCE_STAGE_MS = 90_000`).
- Attribution copy: **Modeled — cfo.ai workspace (not a verified forecast).** Storage: `EpistemicKind.Inferred` on mapped metrics.
- Fixture: `fixtures/finance/demo_run.json`. Banner: **Recorded finance fixture — not live cfo.ai**.
- Raw files: `data/cfo-raw/{sessionId}/{financeRunId}.json`. `data/` gitignored.
- Do not expose `CFO_MCP_ACCESS_TOKEN` to the browser. CI mocks MCP — no live `api.cfo.ai` in vitest.
- Panel→adoption only via Assumption with optional `derivedFrom`; block finance send otherwise.

## File map

| Path | Responsibility |
|------|----------------|
| `packages/domain/src/cfo-ai-mapping.ts` | Load + validate `config/cfo-ai-mapping.json` |
| `packages/domain/src/finance-assumption-pack.ts` | Finance-ready validation + input hash |
| `packages/domain/src/finance-checks.ts` | Q37 deterministic checks |
| `packages/domain/src/finance-sensitivity.ts` | 3×3 grid defaults + driver ranking |
| `packages/domain/src/contracts/finance-snapshot.ts` | `epistemic.finance` Zod schema |
| `packages/domain/src/finance-fixture.ts` | Parse `demo_run.json` into snapshot shape |
| `apps/web/lib/cfo-ai/mcp-client.ts` | Server MCP call wrapper (token auth) |
| `apps/web/lib/cfo-ai/smoke.ts` | Q45 health checks |
| `apps/web/lib/cfo-ai/run-path.ts` | `runFinancePath` orchestration |
| `apps/web/lib/cfo-ai/select-adapter.ts` | live \| fixture \| deferred |
| `apps/web/app/api/health/cfoai/route.ts` | GET smoke |
| `apps/web/app/api/sessions/[id]/finance/approve-assumptions/route.ts` | POST gate |
| `apps/web/app/api/sessions/[id]/finance/route.ts` | POST run |
| `apps/web/components/session/FinanceComparison.tsx` | UI |
| `packages/domain/src/epistemic.ts` | Add `financeModeled` copy |
| `packages/domain/src/contracts/cfo-workspace.ts` | Session `cfoWorkspace` Zod schema |
| `apps/web/lib/cfo-ai/provision.ts` | Wizard-start provisioning + bootstrap |
| `apps/web/app/api/sessions/route.ts` | Invoke provision on create |

---

### Task 0: Per-company workspace binding (wizard start)

**Files:**
- Create: `packages/domain/src/contracts/cfo-workspace.ts`
- Create: `apps/web/lib/cfo-ai/provision.ts`
- Modify: `apps/web/app/api/sessions/route.ts`
- Test: `packages/domain/src/contracts/cfo-workspace.test.ts`, `apps/web/lib/cfo-ai/provision.test.ts`

**Interfaces:**
- Produces: `cfoWorkspaceSchema`, `provisionCfoWorkspace({ companyName, userId?, email? }): Promise<CfoWorkspace>`

**MCP facts (do not assume create):**
- Identifiers: `org_id`, `slug`, `name` from `list_orgs`.
- `edit_org` **does not create** workspaces.

**Steps:**
- [ ] Define `cfoWorkspaceSchema` with `status`, `orgId`, `slug`, `name`, `bootstrapStatus`, optional `scenarioRefs`, `error`.
- [ ] On `POST /api/sessions`, set `intake.cfoWorkspace = { status: "pending", ... }` and call `provisionCfoWorkspace`.
- [ ] Implement provision adapter interface: `CfoProvisioningAdapter.createWorkspace()` — **stub** throws or returns pending until cfo documents create API; tests use mock that returns fake `orgId`.
- [ ] When `orgId` known, optional `bootstrapCfoSandboxModel(client, orgId)` (scenarios + tables per practical doc).
- [ ] Persist updated intake on session row.

---

### Task 1: Finance attribution copy

**Files:**
- Modify: `packages/domain/src/epistemic.ts`
- Modify: `packages/domain/src/epistemic.test.ts`

**Interfaces:**
- Produces: `CLAIM_SAFETY_COPY.financeModeled` string (Q09 exact sentence).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { CLAIM_SAFETY_COPY } from "./epistemic";

describe("CLAIM_SAFETY_COPY", () => {
  it("includes financeModeled attribution", () => {
    expect(CLAIM_SAFETY_COPY.financeModeled).toBe(
      "Modeled — cfo.ai workspace (not a verified forecast).",
    );
  });
});
```

- [ ] **Step 2: Run test**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/epistemic.test.ts`

Expected: FAIL — `financeModeled` undefined.

- [ ] **Step 3: Add copy**

```ts
  financeModeled:
    "Modeled — cfo.ai workspace (not a verified forecast).",
```

- [ ] **Step 4: Run test** — PASS.

- [ ] **Step 5: Commit** — `feat(domain): add cfo.ai modeled attribution copy`

---

### Task 2: Mapping config schema

**Files:**
- Create: `packages/domain/src/cfo-ai-mapping.ts`
- Create: `packages/domain/src/cfo-ai-mapping.test.ts`
- Modify: `packages/domain/src/server.ts` (export)

**Interfaces:**
- Produces: `cfoAiMappingSchema`, `CfoAiMapping`, `loadCfoAiMappingFromJson(json: unknown)`

- [ ] **Step 1: Failing test** — parse checked-in `config/cfo-ai-mapping.json` fixture fragment:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cfoAiMappingSchema } from "./cfo-ai-mapping";

describe("cfoAiMappingSchema", () => {
  it("accepts repo config", () => {
    const root = join(__dirname, "../../../config/cfo-ai-mapping.json");
    const json = JSON.parse(readFileSync(root, "utf8"));
    const r = cfoAiMappingSchema.safeParse(json);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.scenarios.pilot.strategyKind).toBe("pilot");
      expect(r.data.setupStatus).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: Implement schema** matching keys in `config/cfo-ai-mapping.json`: `contractVersion`, `orgId`, `setupStatus`, `scenarios`, `compare`, `inputs`, `outputs`, `sensitivity`.

```ts
import { z } from "zod";

export const cfoAiMappingSchema = z.object({
  contractVersion: z.literal(1),
  orgId: z.string().min(1),
  mcpUrl: z.string().url(),
  setupStatus: z.enum(["ready", "deferred_per_tenant"]),
  setupNote: z.string().optional(),
  scenarios: z.record(
    z.object({
      strategyKind: z.enum(["pilot", "broad_launch"]),
      cfoScenarioName: z.string().min(1),
      cfoScenarioRef: z.string().min(1),
    }),
  ),
  compare: z.object({
    inspectTableBlocks: z.object({
      page: z.string().min(1),
      table: z.string().min(1),
      scenarios: z.array(z.string().min(1)).min(2),
    }),
  }),
  inputs: z.record(
    z.object({
      page: z.string().min(1),
      table: z.string().min(1),
      row: z.string().min(1),
      mapsToAssumption: z.string().min(1),
      perScenario: z.boolean().optional(),
      scenarioOnly: z.enum(["pilot"]).optional(),
    }),
  ),
  outputs: z.record(
    z.object({
      page: z.string().min(1),
      table: z.string().min(1),
      row: z.string().min(1),
      canonical: z.enum([
        "cost",
        "pricing",
        "revenue",
        "margin",
        "burn",
        "runway",
        "adoption",
      ]),
    }),
  ),
  sensitivity: z.object({
    applyToScenario: z.string().min(1),
    inputs: z.array(z.string().min(1)).min(1),
  }),
});

export type CfoAiMapping = z.infer<typeof cfoAiMappingSchema>;

export function loadCfoAiMappingFromJson(json: unknown): CfoAiMapping {
  return cfoAiMappingSchema.parse(json);
}
```

- [ ] **Step 4: Run test** — PASS.

- [ ] **Step 5: Commit**

---

### Task 3: Finance assumption pack validation

**Files:**
- Create: `packages/domain/src/finance-assumption-pack.ts`
- Create: `packages/domain/src/finance-assumption-pack.test.ts`
- Modify: `packages/domain/src/contracts/claim.ts` — add optional `derivedFrom` on assumption claims:

```ts
const panelDerivedFromSchema = z.object({
  panelRunId: z.string().uuid(),
  segmentIds: z.array(z.string().min(1)).min(1),
  questionId: z.string().min(1),
});
// on assumption claim: derivedFrom: panelDerivedFromSchema.optional()
```

**Interfaces:**
- Consumes: `EpistemicSnapshot`, `CfoAiMapping`, intake `SessionDraft` assumptions with `mapsTo` + `scenarioKey`
- Produces: `validateFinanceAssumptionPack(input): { ok: true, valuesByScenario, assumptionRefs, packHash } | { ok: false, errors: string[] }`

Required `mapsTo` keys per scenario: `build_cost`, `build_timeline_months`, `price_per_seat`, `adoption_rate`, `inference_cost_per_user`; pilot also `pilot_cohort_size`.

- [ ] **Step 1: Failing tests** — missing adoption for broad → errors; happy path from demo card assumptions → hash stable across calls.

- [ ] **Step 2: Implement** — collect active Assumption claims; map by `mapsTo` + `scenarioKey`; reject panel-derived adoption without `derivedFrom` when statement references panel; compute `packHash` as SHA-256 of sorted JSON (use `node:crypto` in domain only from server path — **or** implement hash in `apps/web/lib/cfo-ai` and pass into domain validator; prefer hash function in `finance-assumption-pack.ts` accepting precomputed digest from caller to keep domain free of node crypto if client barrel imports it — export `buildAssumptionPackDigest(values: Record<string, number>)` using simple deterministic stringify).

- [ ] **Step 3: Run tests** — PASS.

- [ ] **Step 4: Commit**

---

### Task 4: Deterministic checks + sensitivity

**Files:**
- Create: `packages/domain/src/finance-checks.ts`
- Create: `packages/domain/src/finance-sensitivity.ts`
- Tests for each

**Interfaces:**
- Produces: `runFinanceDeterministicChecks(ctx): FinanceCheck[]`
- Produces: `buildSensitivityGrid(basePrice, baseAdoption, ranges?): SensitivityGrid`, `rankSensitivityDrivers(grid): ("price" | "adoption")[]`

Implement Q37 runway tension at 25%; Q34 defaults ±20% price, adoption ×0.7/×1.3 clamped [0,100].

- [ ] **Step 1–4:** TDD each module.

- [ ] **Step 5: Commit**

---

### Task 5: `epistemic.finance` schema

**Files:**
- Create: `packages/domain/src/contracts/finance-snapshot.ts`
- Modify: `packages/domain/src/contracts/epistemic-snapshot.ts` — add optional `finance` + `financeAssumptionsApproved`
- Modify: `packages/domain/src/contracts/epistemic-snapshot.test.ts`

**Interfaces:**
- Produces: `financeSnapshotSchema`, extend `epistemicSnapshotSchema`

Use `financialMappedMetricsSchema` from `./finance` for `compare.pilot` / `compare.broad_launch`.

- [ ] **Step 1: Test** snapshot with `finance.status: "fallback"` parses.

- [ ] **Step 2: Implement** per spec §10.

- [ ] **Step 3: Commit**

---

### Task 6: Fixture parser

**Files:**
- Create: `packages/domain/src/finance-fixture.ts`
- Create: `packages/domain/src/finance-fixture.test.ts`

**Interfaces:**
- Produces: `financeSnapshotFromFixture(doc, { financeRunId, sessionId }): FinanceSnapshot`

Map `fixtures/finance/demo_run.json` into `compare` + `baseline` + `sensitivity`; set `source: "fixture"`, `status: "fallback"`.

- [ ] **Step 1–4:** TDD against checked-in fixture.

- [ ] **Step 5: Commit**

---

### Task 7: MCP client (server)

**Files:**
- Create: `apps/web/lib/cfo-ai/mcp-client.ts`
- Create: `apps/web/lib/cfo-ai/mcp-client.test.ts`
- Create: `apps/web/lib/cfo-ai/types.ts`

**Interfaces:**

```ts
export type CfoMcpClient = {
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
};

export function createLiveCfoMcpClient(opts: {
  accessToken: string;
  mcpUrl: string;
}): CfoMcpClient;
```

- [ ] **Step 1: Read** [MCP server docs](https://docs.cfo.ai/integrations/mcp-server) for server-side auth header and JSON-RPC/streamable HTTP shape. Document chosen header in `types.ts` comment.

- [ ] **Step 2: Failing test** — mock `fetch`; `callTool("list_orgs", {})` posts to `mcpUrl` with Bearer token.

- [ ] **Step 3: Minimal implementation** with `AbortSignal.timeout` per call (default 15s).

- [ ] **Step 4: Commit**

---

### Task 8: Smoke test + health route

**Files:**
- Create: `apps/web/lib/cfo-ai/smoke.ts`
- Create: `apps/web/app/api/health/cfoai/route.ts`
- Create: `apps/web/app/api/health/cfoai/route.test.ts`

**Interfaces:**
- Produces: `runCfoAiSmoke(client, mapping): Promise<{ ok: boolean; detail: string }>`

Checks: `list_orgs`; `inspect_scenarios` includes both scenario names; `inspect_table_blocks` read on mapped outputs table.

- [ ] **Step 1–4:** Mirror `apps/web/app/api/health/crustdata/route.ts` response shape `{ ok, live, detail, mappingReady }`.

- [ ] **Step 5: Commit**

---

### Task 9: `select-adapter` + `runFinancePath`

**Files:**
- Create: `apps/web/lib/cfo-ai/select-adapter.ts`
- Create: `apps/web/lib/cfo-ai/run-path.ts`
- Create: `apps/web/lib/cfo-ai/run-path.test.ts`
- Create: `apps/web/lib/cfo-ai/write-raw.ts`

**Interfaces:**

```ts
export type FinancePathResult = {
  snapshot: EpistemicSnapshot;
  mcpCallCount: number;
};

export async function runFinancePath(args: {
  sessionId: string;
  intake: IntakeJson;
  epistemic: EpistemicSnapshot;
  mapping: CfoAiMapping;
  clock: () => number;
  client: CfoMcpClient | null;
}): Promise<FinancePathResult>;
```

Flow:

1. `validateFinanceAssumptionPack` — on fail set `finance.status = "failed"` + errors.
2. If `!financeAssumptionsApproved` throw before writes (caller should 409).
3. If mapping not `ready` or `!client` → `financeSnapshotFromFixture` with `status: "deferred"` or `"fallback"`.
4. Live: writes per scenario → compare → map outputs via row labels → sensitivity loops on Pilot (stop if `mcpCallCount >= 20` or clock exceeded).
5. `runFinanceDeterministicChecks` → attach to snapshot.
6. Write raw JSON array of tool calls + responses to `data/cfo-raw/...`.
7. `validateEpistemicSnapshot`.

- [ ] **Step 1: Test** deferred mapping → zero `client.callTool` invocations, `status: "deferred"`.

- [ ] **Step 2: Test** live mock → writes + compare called, `mcpCallCount` ≥ 2.

- [ ] **Step 3: Test** compare empty twice → `status: "unavailable"`.

- [ ] **Step 4: Implement**

- [ ] **Step 5: Commit**

---

### Task 10: Session finance routes

**Files:**
- Create: `apps/web/app/api/sessions/[id]/finance/approve-assumptions/route.ts`
- Create: `apps/web/app/api/sessions/[id]/finance/route.ts`
- Create: `apps/web/app/api/sessions/[id]/finance/route.test.ts`

Pattern: copy gates from `apps/web/app/api/sessions/[id]/research/crustdata/route.ts` (frozen check, idempotent replay, `applyEpistemicSnapshot`).

- [ ] **Step 1: Tests** — 409 not frozen; 409 finance without approve; second POST idempotent.

- [ ] **Step 2: Implement POST approve** — sets `financeAssumptionsApproved: true`.

- [ ] **Step 3: Implement POST finance** — load mapping from `join(process.cwd(), "../../config/cfo-ai-mapping.json")`, `selectCfoAdapter()`, `runFinancePath`.

- [ ] **Step 4: Commit**

---

### Task 11: Session UI

**Files:**
- Create: `apps/web/components/session/FinanceComparison.tsx`
- Modify: `apps/web/app/session/[sessionId]/page.tsx`

Show: approve button (if not approved); run button; baseline row; Pilot vs Broad table; `financeModeled` + `financeNotForecast`; fixture banner when `source === "fixture"`; warnings from `checks`; sensitivity top drivers.

- [ ] **Step 1: Render** from `session.epistemic.finance` only — no invented numbers.

- [ ] **Step 2: Manual check** on frozen demo session with fixture path.

- [ ] **Step 3: Commit**

---

## Self-review (plan author)

| Spec requirement | Task |
|------------------|------|
| Q11 Pilot vs Broad compare | Task 9 |
| Q41 approve gate | Task 10 |
| Q45 smoke | Task 8 |
| Q37 checks | Task 4 |
| Q33–36 sensitivity | Task 4, 9 |
| Q28–31 persist raw + mapped | Task 9 |
| Q46–47 fixture labels | Task 6, 11 |
| Q20 derivedFrom | Task 3 |
| ≤20 MCP calls | Task 9 guard |

**Gap:** `edit_table_blocks` / `inspect_table_blocks` request bodies depend on live MCP tool schemas — implementer must call `GetDynamicTools` / vendor docs during Task 9 and encode exact compare payload in `map-compare.ts` helper (add file if >80 lines).

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-10-12-sp07-cfo-ai-financial-evaluation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks.

**2. Inline Execution** — execute in this session with executing-plans checkpoints.

Which approach?
