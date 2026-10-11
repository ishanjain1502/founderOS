# SP-03 — Implementation spec (decision intake and company context)

**Status:** Locked from `03-decision-intake-and-company-context.md` Q01–Q39 plus the clarifications in §1 (this design pass).  
**Depends on:** SP-01 (Demo/Full, demo cards, claim safety), SP-02 (`contractVersion: 1`, `SessionDraft`, demo card DTO).  
**Produces:** Staged intake wizard, recap/approve, SQLite-backed session JSON, freeze-on-start placeholder.  
**Does not produce:** agent Run, investigation dashboard, Edit intake after freeze (SP-09/SP-10/SP-13).

---

## 1. Clarifications (this pass — not silent defaults)

| Topic | Decision |
|--------|----------|
| **SP-03 build boundary** | Full intake stack in this SP: wizard + recap + persist. Pull SQLite session save forward from SP-09. |
| **When to persist** | Create `Session` on wizard start. PATCH the draft after **every step**. Refresh restores progress. |
| **Repo URL** | **Optional** (SP-13-Q07 wins over SP-03-Q05). `SKIP_CODE_IMPACT` default true is irrelevant to whether Start is allowed. |
| **Wizard** | **Five** steps, then a separate recap gate. Optional fields exist in v1, collapsed under **More details** on the step that owns them. |
| **Session identity** | Opaque `sessionId` in the **URL is canonical**. Cookie `ceoSandboxLastSessionId` resumes the last session when the URL has no id. |
| **Start investigation** | Freeze intake, persist approved snapshot, go to **placeholder** `/session/[sessionId]`. **No Run row. No agent.** |
| **Edit after freeze** | **View-only in SP-03.** Edit intake / `questionRevision` bump / prior-snapshot compare is **SP-09**. |
| **Product context** | Step 1 has **structured required** fields (category, primary buyer, JTBD, delivery model, size band) **plus** product description. |
| **Optional fields** | All of Q06 + Q10–Q12 + Q14 + Q25 + Q34 extras, collapsed (see §6). |
| **Out-of-scope inputs** | Soft warning only. Tag `outsideSpecIntent`. **No generic mode.** |
| **Scope detector** | **LLM** on Full-mode recap only. Demo card path **skips**. LLM down → `scopeCheck.status = unknown`, **fail-open** (do not block). |
| **Currency** | **USD only** in v1. No picker. Every money field still stores `currency: "USD"` (overrides SP-03-Q19 selectable list until a later SP). |
| **Reset demo** | **Not in SP-03.** Start page “New decision” / demo card click creates a fresh session. |
| **Already-live feature** | Step 4 optional checkbox `alreadyLive`. Recap warning; does not block (SP-03-Q33). |
| **Persistence shape** | One SQLite table; whole intake is **versioned JSON** (`intakeDraftSchema`). Normalize in SP-09 if needed. |
| **Q20 text fields** | `category`, `primaryBuyer`, `jobToBeDone` are required **short text** (no catalogs). `deliveryModel` stored as `"saas"` only. `sizeBand`: `smb` \| `mid` \| `enterprise`. |
| **Financial rule** | ≥2 of cash / customer count / MRR / runway **or** `provideLater: true`. A single filled metric without `provideLater` **blocks** step 5 / Start. |
| **Numeric consistency** | Warn only; never auto-correct (SP-03-Q32). **No** ARPU or runway-vs-burn check in SP-03 (no burn field). That check is SP-07. |

---

## 2. Product behavior

Intake is workflow step 1: the operator states the company, the feature/change, goals/constraints, and the decision question. Nothing downstream (Crustdata, panel, cfo.ai) has a target until this snapshot exists.

**Demo mode:** click the AI-analytics card → wizard auto-fills → recap (illustrative label) → Start investigation. Minimal typing (SP-03-Q38).

**Full mode:** same wizard, empty required fields, LLM scope check on recap.

**Must-have visible:** one fictional SaaS company profile + one proposed feature, with **Illustrative example** on the demo path (SP-03-Q15, Q16).

---

## 3. Architecture

```text
Browser                         apps/web                         packages/db
  /                          →  page (Start)                   →  SQLite
  /intake/[sessionId]        →  5-step wizard                  →  sessions.intake_json
  /intake/[sessionId]/recap  →  recap + LLM scope-check (Full)
  /session/[sessionId]       →  frozen placeholder

  POST/PATCH/GET /api/sessions[/...]
```

| Piece | Responsibility |
|-------|----------------|
| `@ceo-sandbox/domain` | `intakeDraftSchema`, step validators, caps, `demoCardToIntakeDraft` (server), field-source helpers. Client-safe schema (no Node crypto). |
| `@ceo-sandbox/db` | `better-sqlite3`, `data/sandbox.sqlite` (gitignored), `sessions` table. Node runtime only — **not** Edge. |
| `apps/web` | Routes, wizard UI, API routes calling db + domain. |

`demoCardToSessionDraft` remains. `demoCardToIntakeDraft` is the SP-03 hydrate; `demoCardToSessionDraft` is a **projection**: copy `financials` onto `companyProfile` (`cashUsd`, `customerCount`, `mrrUsd`, `runwayMonths`) so existing `SessionDraft` tests keep passing.

---

## 4. HTTP API and cookies

| Method | Path | Effect |
|--------|------|--------|
| `POST` | `/api/sessions` | Create session. Body `{ mode, demoCardId? }`. Demo + `demo-ai-analytics-premium` hydrates from fixture. Full + no card → empty draft with `mode: full`, `currency: USD`, `deliveryModel: saas`. Sets cookie. Returns `{ id, status, intake }`. |
| `GET` | `/api/sessions/current` | Cookie resume. 404 if cookie missing/unknown. |
| `GET` | `/api/sessions/:id` | Load draft. |
| `PATCH` | `/api/sessions/:id` | Deep-merge object sections of `intake`; **replace** arrays (`competitors`, `segmentChips`, `goals.chips`, `scenarios`, `assumptions`). Paths present in the PATCH body get `fieldSources[path] = "user"` (except server-owned `scopeCheck`, `currency`, `deliveryModel` unless the client sends them). Reject if `status === frozen` (**409**). |
| `POST` | `/api/sessions/:id/recap/scope-check` | Full mode LLM classify. Demo: `{ status: "skipped" }` without calling LLM. |
| `POST` | `/api/sessions/:id/approve` | Requires draft valid for Start (all required fields). Sets `status: approved`. |
| `POST` | `/api/sessions/:id/start` | Requires `status === approved`. Sets `status: frozen`, `frozenAt`. |

**Cookie:** `ceoSandboxLastSessionId=<uuid>`; `HttpOnly`; `SameSite=Lax`; `Path=/`. Set on create. URL `sessionId` **always wins** over cookie. Cookie does not authorize PATCH of a different id; `:id` in the path is the only target.

**Create + redirect:** Start page `POST` then navigate to `/intake/[id]?step=1`.

**Continue last session:** `GET /api/sessions/current` then route by `status`: `draft` → `/intake/[id]`; `approved` → `/intake/[id]/recap`; `frozen` → `/session/[id]`.

---

## 5. SQLite

File: `data/sandbox.sqlite` (repo-relative). Gitignore `data/` and `*.sqlite`.

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  contract_version INTEGER NOT NULL DEFAULT 1,
  mode TEXT NOT NULL CHECK (mode IN ('demo', 'full')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'approved', 'frozen')),
  question_revision INTEGER NOT NULL DEFAULT 1,
  intake_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  approved_at TEXT,
  frozen_at TEXT
);
```

`id` is a UUID. `intake_json` must parse as `intakeDraftSchema`. Missing/unwritable DB → **500**; no in-memory fallback.

Row `status` vs intake:

| Status | Wizard | Recap | Start |
|--------|--------|-------|-------|
| `draft` | editable | LLM may run; Approve allowed if valid | blocked |
| `approved` | editing PATCH resets to `draft` (must re-approve) | show last scopeCheck | allowed |
| `frozen` | view-only | view-only | already done |

`question_revision` stays `1` in SP-03 (no Edit intake). Column exists so SP-09 can bump it.

---

## 6. `intakeDraftSchema` (`contractVersion: 1`)

Two Zod layers:

- **`intakeDraftPartialSchema`** — what SQLite may store in `draft` (and after each step). `contractVersion`, `mode`, `currency` required; every company/market/goals/constraints/feature/financials field **optional**. Unknown keys rejected.
- **`intakeDraftSchema`** — complete document. `POST .../approve` and `POST .../start` must pass this **plus** the financial ≥2-or-`provideLater` rule. Wizard **Next** uses per-step pickers over the partial object (§6.3).

Money (when a money field is present): `currency` always `"USD"`; period required (`mrr` = `monthly`, `cash` = `point_in_time`, `budget` = `one_time`, proposed price period `monthly` \| `annual` \| `one_time`).

### 6.1 Caps (SP-03-Q21, Q28)

| Field | Max |
|-------|-----|
| `decision.questionText` | 500 |
| `company.productSummary` | 2,000 |
| `feature.description` | 4,000 |
| `market.targetMarketBehavior` | 4,000 |
| Short text (`category`, `primaryBuyer`, `jobToBeDone`, `name`, `title`, domain, geography) | 200 |

Over-cap → validation error (truncate is **not** silent; UI may show a counter).

### 6.2 Shape

```text
IntakeDraft
  contractVersion: 1
  mode: demo | full
  currency: "USD"
  outsideSpecIntent: boolean          // default false
  alreadyLive: boolean                // default false
  scopeCheck: {
    status: skipped | unknown | in_scope | out_of_scope
    reason?: string
    ranAt?: ISO-8601
  }
  decision: { questionText, questionRevision? }
  company: {
    name
    productSummary
    category, primaryBuyer, jobToBeDone
    deliveryModel: "saas"
    sizeBand: smb | mid | enterprise
    repoUrl?: string                  // URL if present
    domain?: string
    geography?: string
    competitors?: string[]            // named competitors, max 10, each ≤200
  }
  market: {
    targetMarketBehavior
    segmentChips?: PrimarySegment[]   // existing SP-02 enum
  }
  goals: {
    chips: GoalChip[]                 // optional; empty ok
    primaryChip?: GoalChip            // must be in chips if set
    nuance?: string                   // ≤500
    horizon?: this_quarter | months_6 | months_12 | until_runway
  }
  constraints: {
    budgetUsd: number                 // required, ≥0
    executionMonths: number           // required, >0
    extraText?: string
    legalPrivacy?: string
    segmentRestrictions?: string
    pricingRules?: string
    hiringRaiseLimits?: string
    teamCapacityFte?: number          // ≥0 if present
    teamSkillsNote?: string
  }
  feature: {
    title?: string
    description
    changeType: feature | pricing | ui | other
    packaging?: string
    proposedPriceUsd?: number         // ≥0
    proposedPricePeriod?: monthly | annual | one_time
    currentPricingText?: string
  }
  financials: {
    provideLater: boolean
    cashUsd?: number                  // may be negative (warn)
    customerCount?: number            // int ≥0
    mrrUsd?: number                   // ≥0
    runwayMonths?: number             // ≥0
  }
  fieldSources: Record<string, "user" | "demo_fixture" | "system_default" | "provide_later">
  scenarios: SessionDraftScenario[]   // demo hydrate; Full starts []
  assumptions: SessionDraftAssumption[]
```

**`GoalChip`:** `revenue` \| `retention` \| `expansion` \| `enterprise` \| `efficiency` \| `competitive_defense` \| `other`.

**`fieldSources` keys** use dotted paths (`company.name`, `financials.cashUsd`, …). Demo hydrate sets `demo_fixture`. User edits flip that path to `user`. `provideLater: true` sets financial metric paths to `provide_later` when the value is absent. `deliveryModel` / `currency` may be `system_default` on Full-mode create.

### 6.3 Step ↔ required fields

| Step | Required to proceed | More details (optional) |
|------|---------------------|-------------------------|
| 1 Company | `name`, `productSummary`, `category`, `primaryBuyer`, `jobToBeDone`, `deliveryModel`, `sizeBand` | `repoUrl`, `domain`, `geography`, `competitors` |
| 2 Market | `targetMarketBehavior` | `segmentChips` |
| 3 Goals / constraints | `budgetUsd`, `executionMonths` | goal chips + nuance + `primaryChip`, extra constraint texts, team, `horizon` |
| 4 Feature | `description`, `changeType` (user must pick in Full mode — **no silent default**), `questionText` | `title`, `packaging`, proposed price + period, `currentPricingText`, `alreadyLive` |
| 5 Financials | (`provideLater === true`) **OR** ≥2 of `cashUsd`, `customerCount`, `mrrUsd`, `runwayMonths` | — |

Goals chips are **optional** (SP-03-Q06). Budget + time are required on step 3 (SP-03-Q05, Q08).

---

## 7. Wizard UI

**Product title on Start:** “CEO Decision Sandbox” (SP-13-Q06). Keep existing Demo/Full toggle.

**Start (`/`):**

- Demo: card `demo-ai-analytics-premium` (label from card). Click → `POST /api/sessions` with that id.
- Full: **New decision** → `POST` with `mode: full`.
- If cookie session exists, show **Continue last session** (GET `/api/sessions/current`). No “Reset demo” control.

**Wizard (`/intake/[sessionId]?step=1..5`):**

- Step indicator 1–5. Next/Back. Each Next/Back/`Save` PATCHes.
- Next blocked until the current step’s required validator passes (inline errors).
- **More details** `<details>` collapsed by default on steps 1–4.
- Frozen session: all inputs `readOnly`; no PATCH; copy that intake is locked (Edit intake is later).
- Illustrative chip on Demo mode (from card `illustrative: true`).

**Recap (`/intake/[sessionId]/recap`):**

Visible (SP-03-Q39): decision question; feature one-liner (`title` or first sentence of description); up to **2** goal chips; budget + time; **Illustrative example** if demo; **Assumed** / **provide later** chips from `fieldSources`; scope warning if `out_of_scope` or `outsideSpecIntent`; **scope check skipped** if `unknown` or `skipped`.

Actions: **Edit** (back to wizard) · **Approve** · **Start investigation** (enabled only when `status === approved`).

On entering recap in **Full** mode, fire scope-check (once per recap visit if `status` is still `skipped`/`unknown` or intake hash changed — implement as: rerun when `decision.questionText` or `feature.description` changed since `scopeCheck.ranAt`). Demo: do not call LLM; `skipped`.

---

## 8. LLM scope check

**Purpose:** classify whether the decision is a change to an **existing product** (feature / pricing / UI / similar) vs **something entirely new** (greenfield product or non-feature ask).

**Env (from SP-10, not chosen here):** `LLM_PROVIDER`, `LLM_MODEL`. Keys server-side only. If unset, treat as LLM down.

**Input:** `questionText`, `feature.description`, `changeType`, `company.productSummary`, `alreadyLive`. Structured JSON out:

```json
{
  "classification": "existing_product_change" | "entirely_new" | "unclear",
  "reason": "≤200 chars"
}
```

Map: `existing_product_change` → `in_scope`; `entirely_new` → `out_of_scope` and `outsideSpecIntent: true`; `unclear` → `unknown` (warning, not auto `outsideSpecIntent`).

**Fail-open:** timeout, HTTP error, missing key, or schema-invalid response → `status: unknown`, `reason` explaining skip. **Never block** Approve or Start.

**Not** recorded in Neatlogs in SP-03 (no Run). Store result only on the session JSON.

---

## 9. Validation and warnings

**Block (400 / inline):** empty required strings; over-cap; invalid UUID; `executionMonths <= 0`; `customerCount` non-integer; `provideLater === false` and fewer than two financial metrics; PATCH while frozen (409); Start while not `approved`.

**Hard-block empty/malicious only** (SP-03-Q27): blank question/feature/product; over-cap treated as invalid, not truncated.

**Warn, allow:** `outsideSpecIntent`; `alreadyLive`; `cashUsd < 0`; `customerCount === 0`; `provideLater`; LLM `unknown` / `out_of_scope`. Copy for out-of-scope: sandbox is tuned for **existing B2B SaaS feature decisions**.

**User numbers win.** No silent illustrative defaults on Full-mode required fields (SP-03-Q30). Demo card pre-fill is labeled illustrative / `demo_fixture`.

---

## 10. Demo card fixture

Keep `fixtures/demo/decision-card-ai-analytics.json`. **Add** required Q20 fields (illustrative, derived from the existing `productSummary`):

| Field | Value |
|-------|--------|
| `company.category` | `Workflow / project operations SaaS` |
| `company.primaryBuyer` | `Mid-market operations or team lead` |
| `company.jobToBeDone` | `Track projects and operations in one workspace` |
| `company.deliveryModel` | `saas` |
| `company.sizeBand` | `mid` |

**Goal chips:** add `goalChips` and `primaryGoalChip` on the card JSON; keep existing `goals` strings for the card subtitle. Values: `goalChips`: `["revenue", "expansion", "enterprise"]`; `primaryGoalChip`: `"expansion"`. Hydrate copies those onto `goals.chips` / `goals.primaryChip`. `loadDemoCard` requires the new keys (update tests).

Optional More-details keys may be omitted on the card (empty in UI). `constraints.notes` maps to `constraints.extraText`. Packaging / budget / time / financials / market text already on the card map 1:1.

All hydrated paths: `fieldSources.* = demo_fixture`.

---

## 11. Downstream mapping (for later SPs; types only here)

Documented so SP-05/06/07 do not invent intake keys. SP-03 does not call those vendors.

| Consumer | Intake fields |
|----------|----------------|
| Crustdata (SP-03-Q34) | `company.name`, `productSummary`, `category`, `sizeBand` / buyer, `geography`, `competitors`, feature keywords from `feature.description` / `title`, `domain`. `repoUrl` is **not** a Crustdata query input. |
| Panel stimulus (SP-03-Q35) | `feature.description`, short product summary, packaging/price if present. **Not** MRR/runway/cash unless a later scenario requires it. |
| cfo.ai (SP-03-Q36) | `financials.*` (user intake wins as baseline), `constraints.budgetUsd`, `executionMonths`, pricing/packaging, demo `assumptions`. `provideLater` → Assumption placeholders before finance (SP-07), not silent gaps. Runway baseline vs modeled runway: SP-03-Q18 (intake wins; modeled labeled separately). |

README → product summary rewrite (SP-03-Q37) is **not** in SP-03 (needs repo fetch / SP-10). Recap in this SP is operator confirmation of **wizard fields**.

---

## 12. Errors

| Case | Behavior |
|------|----------|
| Unknown `sessionId` | 404 page |
| PATCH frozen | 409 + view-only UI |
| Validation | 400 + `{ errors: { path: message } }` |
| DB down | 500 |
| LLM failure | `scopeCheck.unknown`; continue |

---

## 13. Testing (SP-03)

Vitest. No Playwright in this SP. After implementation, browser-check: Demo card → 5 steps → recap → Approve → Start → placeholder; Full New decision required-field blocks; cookie Continue; frozen PATCH.

- **Domain:** schema accept/reject; caps; ≥2-or-`provideLater`; USD required on money; `primaryChip` must be in `chips`; `demoCardToIntakeDraft` fills Q20 + goal chips + `demo_fixture` sources; projection still satisfies `sessionDraftSchema`.
- **db:** create / get / patch / approve / start; frozen patch throws; process restart (re-open file) returns same JSON.
- **API:** create from demo card; scope-check mocked fail-open; cookie set on create; Start without approve → 400.

---

## 14. Out of scope for SP-03 implementation

- Edit intake, material vs cosmetic, `questionRevision` bump, retaining prior snapshots for compare (SP-09)
- Reset demo (SP-09-Q06)
- `Run`, agent, investigation dashboard, assumption gate (SP-10, SP-13)
- README/repo fetch, GitHub token (SP-12)
- Currency picker / FX
- Attachments, qualitative ticket/NPS importers
- Auth / roles
- Generic mode
- Normalized SQL tables for CompanyProfile / Decision / Claim
- Neatlogs spans for intake
- Creating Assumption Claim rows for `provideLater` (SP-07)

---

## 15. Traceability

| Source | Role |
|--------|------|
| `.docs/subproblems/03-decision-intake-and-company-context.md` | Q01–Q39 |
| This spec §1 | Design-pass clarifications |
| `.docs/specs/SP-01-scope-success-nongoals.md` | Demo/Full, illustrative demo card |
| `.docs/specs/SP-02-shared-domain-contracts.md` | `SessionDraft`, enums, demo DTO |
| `fixtures/demo/decision-card-ai-analytics.json` | Default demo hydrate |
