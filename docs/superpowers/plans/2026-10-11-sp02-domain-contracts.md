# SP-02 Domain Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `contractVersion: 1` domain types, Zod validators, enums, and demo-card → session draft mapping in `@ceo-sandbox/domain` so SP-03+ can persist and exchange objects safely.

**Architecture:** Zod schemas colocated under `packages/domain/src/contracts/`; shared `baseFields` (`id`, `contractVersion`, `createdAt`, `source`); Vitest golden fixtures under `packages/domain/fixtures/`. No SQLite in this plan — pure validation + types. Finance outputs validate as **Inferred** + `assumptionRefs`.

**Tech Stack:** TypeScript 5.x, Zod 3.x, Vitest (existing), pnpm workspace.

## Global Constraints

- `contractVersion: 1` on every persisted object; validators reject wrong version.
- Four epistemic kinds only (`Observed`, `Simulated`, `Assumed`, `Inferred`); **cfo.ai mapped fields = Inferred** with required `assumptionRefs` (user decision).
- Adoption and scenario drivers are **Assumption** Claims, not orphan numbers (user decision).
- Assumption percents: **0–100** with `unit: "percent"`.
- Demo cards are **not** persisted types; use `demoCardToSessionDraft`.
- `CodeImpactArtifact` and `PanelStimulus` are first-class in v1 (user decision).
- Money: currency + period required; block unitless reported numbers (SP-02-Q40).
- Source of truth spec: `.docs/specs/SP-02-shared-domain-contracts.md`.

---

### Task 1: Contract foundations (base fields + Zod)

**Files:**
- Create: `packages/domain/src/contracts/base.ts`
- Create: `packages/domain/src/contracts/base.test.ts`
- Modify: `packages/domain/package.json` (add `zod` dependency)

**Interfaces:**
- Produces: `CONTRACT_VERSION = 1`, `baseEntitySchema`, `EntitySource` enum, `newId()` helper (uuid v4 via `crypto.randomUUID`)

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { baseEntitySchema, CONTRACT_VERSION } from "./base";

describe("baseEntitySchema", () => {
  it("requires contractVersion 1", () => {
    const r = baseEntitySchema.safeParse({
      id: "00000000-0000-4000-8000-000000000001",
      contractVersion: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      source: "system",
    });
    expect(r.success).toBe(true);
    expect(CONTRACT_VERSION).toBe(1);
  });
  it("rejects wrong version", () => {
    const r = baseEntitySchema.safeParse({
      id: "x",
      contractVersion: 2,
      createdAt: "2026-01-01T00:00:00.000Z",
      source: "system",
    });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test** — `pnpm --filter @ceo-sandbox/domain test` → FAIL

- [ ] **Step 3: Implement** `base.ts` with Zod schemas

- [ ] **Step 4: Run test** → PASS

- [ ] **Step 5: Commit** — `feat(domain): add contract v1 base entity schema`

---

### Task 2: Closed enums

**Files:**
- Create: `packages/domain/src/contracts/enums.ts`
- Create: `packages/domain/src/contracts/enums.test.ts`

**Interfaces:**
- Produces: `PrimarySegment`, `PanelPrimaryChoice`, `StrategyKind`, `FeatureChangeType`, `ClaimKind`, `RecommendationStatus`, `RunStatus` Zod enums

- [ ] **Step 1: Test** `PanelPrimaryChoice` parses `pay_extra` and rejects `maybe`

- [ ] **Step 2–4:** Implement per SP-02 spec §4

- [ ] **Step 5: Commit** — `feat(domain): add v1 domain enums`

---

### Task 3: Claim + Evidence schemas

**Files:**
- Create: `packages/domain/src/contracts/claim.ts`
- Create: `packages/domain/src/contracts/evidence.ts`
- Create: `packages/domain/src/contracts/claim-evidence.test.ts`

**Interfaces:**
- Produces: `claimSchema`, `evidenceSchema`, `assumptionNumericSchema` (value + unit + optional currency/period)

- [ ] **Step 1: Test** Assumption with `unit: "percent"`, value `18` passes; bare number fails

- [ ] **Step 2: Test** Evidence requires `retrievedAt`; allows `sourceTimeUnknown: true`

- [ ] **Step 3–4: Implement**

- [ ] **Step 5: Commit** — `feat(domain): add Claim and Evidence schemas`

---

### Task 4: Session graph core (Session, Decision, profiles)

**Files:**
- Create: `packages/domain/src/contracts/session.ts`
- Create: `packages/domain/src/contracts/session.test.ts`

**Interfaces:**
- Produces: `sessionSchema`, `decisionSchema`, `companyProfileSchema`, `featureProposalSchema`, `sessionDraftSchema`

- [ ] **Step 1: Test** minimal valid Session `{ mode: "demo" }` + Decision with `questionText`

- [ ] **Step 2–4: Implement** nested ids `sessionId`, `decisionId`

- [ ] **Step 5: Commit** — `feat(domain): add Session and Decision contracts`

---

### Task 5: PanelStimulus + PanelQuestionnaire

**Files:**
- Create: `packages/domain/src/contracts/panel.ts`
- Create: `packages/domain/src/contracts/panel.test.ts`

**Interfaces:**
- Produces: `panelStimulusSchema`, `panelQuestionnaireSchema` (id, version, questions[])

- [ ] **Step 1: Test** PanelStimulus requires `featureSummary`, `productSummary`, `questionnaireVersion`

- [ ] **Step 2–4: Implement**

- [ ] **Step 5: Commit** — `feat(domain): add PanelStimulus and questionnaire contracts`

---

### Task 6: Panel run objects (Archetype, Evaluation, Segment aggregate)

**Files:**
- Create: `packages/domain/src/contracts/panel-run.ts`
- Create: `packages/domain/src/contracts/panel-run.test.ts`

**Interfaces:**
- Produces: `archetypeSchema`, `respondentEvaluationSchema`, `segmentAggregateSchema`, `panelRunSchema`

- [ ] **Step 1: Test** RespondentEvaluation requires `primaryChoice`, `snapshot`, `panelStimulusId`

- [ ] **Step 2: Test** SegmentAggregate requires `simulatedLabel: true` literal or enum Simulated

- [ ] **Step 3–4: Implement**

- [ ] **Step 5: Commit** — `feat(domain): add panel run contracts`

---

### Task 7: Scenario + FinancialRunResult

**Files:**
- Create: `packages/domain/src/contracts/scenario.ts`
- Create: `packages/domain/src/contracts/finance.ts`
- Create: `packages/domain/src/contracts/scenario-finance.test.ts`

**Interfaces:**
- Produces: `scenarioSchema` with `assumptionRefs: string[]`, `financialRunResultSchema` with mapped metrics + `epistemicLabel: Inferred` + `assumptionRefs`

- [ ] **Step 1: Test** Scenario rejects empty `assumptionRefs` when `requiresFinance: true` (custom refine)

- [ ] **Step 2: Test** FinancialRunResult requires `assumptionRefs.length >= 1`

- [ ] **Step 3–4: Implement** mapped fields: cost, pricing, revenue, margin, burn, runway, adoption — each `{ value?, provided: boolean }`

- [ ] **Step 5: Commit** — `feat(domain): add Scenario and finance result contracts`

---

### Task 8: Run, CodeImpactArtifact, Recommendation, Revision

**Files:**
- Create: `packages/domain/src/contracts/run.ts`
- Create: `packages/domain/src/contracts/recommendation.ts`
- Create: `packages/domain/src/contracts/run-recommendation.test.ts`

**Interfaces:**
- Produces: `runSchema`, `codeImpactArtifactSchema`, `recommendationSchema`, `revisionSchema`

- [ ] **Step 1: Test** Run requires `neatlogsTraceId` unless `runKind === "fallback"`

- [ ] **Step 2: Test** Recommendation `nextValidationStep` max 3 items (refine)

- [ ] **Step 3–4: Implement** Q30 core fields

- [ ] **Step 5: Commit** — `feat(domain): add Run, CodeImpact, Recommendation contracts`

---

### Task 9: demoCardToSessionDraft mapper

**Files:**
- Create: `packages/domain/src/demo-card-to-draft.ts`
- Create: `packages/domain/src/demo-card-to-draft.test.ts`
- Modify: `packages/domain/src/index.ts` (exports)

**Interfaces:**
- Consumes: `DemoDecisionCard` from `loadDemoCard`
- Produces: `SessionDraft` with Decision question, CompanyProfile, FeatureProposal, Scenario stubs, **Assumption** rows for adoption/build cost from card scenarios (`rationale: demo_fixture`)

- [ ] **Step 1: Test** load fixture `decision-card-ai-analytics.json` → draft has `mode: "demo"`, decision question matches, ≥2 assumptions for pilot adoption

- [ ] **Step 2–4: Implement** mapper (no persistence)

- [ ] **Step 5: Commit** — `feat(domain): map demo card to session draft`

---

### Task 10: Forbidden phrases + barrel export

**Files:**
- Create: `packages/domain/src/forbidden-phrases.ts`
- Create: `packages/domain/src/forbidden-phrases.test.ts`
- Modify: `packages/domain/src/index.ts`

**Interfaces:**
- Produces: `FORBIDDEN_PHRASES`, `findForbiddenPhrases(text: string): string[]`

- [ ] **Step 1: Test** detects `customers said` in sample paragraph

- [ ] **Step 2–4: Implement** list from SP-02-Q43

- [ ] **Step 5: Commit** — `feat(domain): add report forbidden-phrase check`

---

### Task 11: Golden fixture validation suite

**Files:**
- Create: `packages/domain/fixtures/v1/minimal-session.json`
- Create: `packages/domain/src/contracts/validate-fixtures.test.ts`

**Interfaces:**
- Produces: `validateSessionBundle(json)` composing schemas

- [ ] **Step 1: Test** minimal-session.json parses

- [ ] **Step 2–4: Add fixture + validator entrypoint**

- [ ] **Step 5: Commit** — `test(domain): golden fixture for contract v1`

---

### Task 12: Docs index link

**Files:**
- Modify: `.docs/subproblems/00-index.md`
- Modify: `README.md` (one line under SP-01 links)

- [ ] **Step 1: Add SP-02 row to implementation specs table**

- [ ] **Step 2: Commit** — `docs: link SP-02 spec and implementation plan`

---

## Self-review

| Spec section | Task |
|--------------|------|
| §1 clarifications | 7, 9 |
| §2 inventory | 4–8 |
| §3 Claims | 3 |
| §4 enums | 2 |
| §5 glossary | 10 (+ existing epistemic) |
| §6 persistence | 11 (shape only) |
| §7 demo card | 9 |

**Open follow-up (optional):** Export JSON Schema from Zod (Task 11b) — not required for SP-02 completion.

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-10-11-sp02-domain-contracts.md`.

**Subagent-driven with Composer 2.5** — same as SP-01 when you are ready.

**Confirm if needed:** Adoption Assumption **0–100 percent** scale — spec uses this to match `adoption_rate_percent` in demo fixtures; reply if you want **0–1 fractions** instead.
