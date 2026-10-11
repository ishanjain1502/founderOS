# SP-01 Scope Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish repository scaffolding, mode configuration, claim-safety constants, and traceability artifacts so SP-02+ can implement features against a single scope contract.

**Architecture:** Monorepo with a Next.js web app (`apps/web`), shared TypeScript types (`packages/domain`), and docs/specs as the scope source of truth. Demo vs Full mode is driven by a typed config loader reading fixture cards from `fixtures/demo/`. No business pipeline logic in SP-01 — only boundaries and empty shells with tests.

**Tech Stack:** Node 20+, pnpm workspaces, TypeScript 5.x, Next.js 15 (App Router), Vitest, ESLint.

## Global Constraints

- Deliverable: parameterized web app with Demo mode cards (SP-01-Q01b, Q22d).
- Cloud/AWS deployment target; open-source repo (SP-01-Q23, Q25, Q28).
- Claim safety L2: labels on all UI numbers and exports (SP-01-Q29); glossary aligns with SP-02.
- Do not present invented numbers as Crustdata/cfo.ai facts (SP-01-Q11).
- Neatlogs has no LLM fallback; Crustdata/cfo.ai use labeled fallbacks (SP-01-Q08).
- Source of truth for decisions: `SP-XX-QNN` in `.docs/subproblems/`; specs in `.docs/specs/`.

---

### Task 1: Workspace and package manager

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `.nvmrc`
- Create: `README.md`

**Interfaces:**
- Produces: `pnpm test` at repo root runs all package tests.

- [ ] **Step 1: Write the failing test**

Create `packages/domain/package.json` with `"test": "vitest run"` and `packages/domain/src/index.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("workspace", () => {
  it("loads domain package", () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd e:/Projects/neatHacks/ideaSiulation && pnpm install && pnpm test`  
Expected: FAIL — `pnpm-workspace.yaml` or root `package.json` missing.

- [ ] **Step 3: Write minimal implementation**

Root `package.json`:

```json
{
  "name": "idea-simulation",
  "private": true,
  "scripts": {
    "test": "pnpm -r test",
    "lint": "pnpm -r lint"
  },
  "packageManager": "pnpm@9.15.0"
}
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`.nvmrc`: `20`

`README.md`: link to `.docs/specs/SP-01-scope-success-nongoals.md`, `.docs/init.md`, env setup (`.env` not committed).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml .nvmrc README.md packages/domain
git commit -m "chore: add pnpm workspace root for CEO sandbox"
```

---

### Task 2: Epistemic labels and claim-safety copy

**Files:**
- Create: `packages/domain/src/epistemic.ts`
- Create: `packages/domain/src/epistemic.test.ts`
- Modify: `packages/domain/src/index.ts` (re-export)

**Interfaces:**
- Produces: `EpistemicKind`, `epistemicLabel()`, `CLAIM_SAFETY_COPY` for UI and export (SP-01-Q29).

- [ ] **Step 1: Write the failing test**

`packages/domain/src/epistemic.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { EpistemicKind, epistemicLabel, CLAIM_SAFETY_COPY } from "./epistemic";

describe("epistemicLabel", () => {
  it("maps simulated panel metrics", () => {
    expect(epistemicLabel(EpistemicKind.Simulated)).toBe("Simulated");
  });
});

describe("CLAIM_SAFETY_COPY", () => {
  it("includes finance disclaimer", () => {
    expect(CLAIM_SAFETY_COPY.financeNotForecast).toMatch(/not a forecast/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ceo-sandbox/domain test`  
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`packages/domain/package.json` name: `@ceo-sandbox/domain`, devDependency `vitest`.

`packages/domain/src/epistemic.ts`:

```typescript
export enum EpistemicKind {
  Observed = "observed",
  Simulated = "simulated",
  Assumed = "assumed",
  Inferred = "inferred",
}

export function epistemicLabel(kind: EpistemicKind): string {
  const labels: Record<EpistemicKind, string> = {
    [EpistemicKind.Observed]: "Observed",
    [EpistemicKind.Simulated]: "Simulated",
    [EpistemicKind.Assumed]: "Assumed",
    [EpistemicKind.Inferred]: "Inferred",
  };
  return labels[kind];
}

export const CLAIM_SAFETY_COPY = {
  panelSimulated:
    "Customer panel results are simulated, not survey data.",
  financeNotForecast:
    "Financial figures are illustrative scenarios, not a verified forecast.",
  competitorNotDemand:
    "Competitor activity does not prove customer demand for this feature.",
  fallbackBanner:
    "This section used a labeled fallback, not live vendor data.",
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ceo-sandbox/domain test`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/domain
git commit -m "feat(domain): add epistemic kinds and claim-safety copy"
```

---

### Task 3: Demo card schema and loader

**Files:**
- Create: `packages/domain/src/demo-card.ts`
- Create: `packages/domain/src/demo-card.test.ts`
- Test uses: `fixtures/demo/decision-card-ai-analytics.json`

**Interfaces:**
- Produces: `DemoDecisionCard`, `loadDemoCard(json: unknown): DemoDecisionCard`
- Consumes: shape of `fixtures/demo/decision-card-ai-analytics.json`

- [ ] **Step 1: Write the failing test**

```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { loadDemoCard } from "./demo-card";

describe("loadDemoCard", () => {
  it("parses ai analytics fixture", () => {
    const raw = JSON.parse(
      readFileSync(
        join(__dirname, "../../../fixtures/demo/decision-card-ai-analytics.json"),
        "utf8",
      ),
    );
    const card = loadDemoCard(raw);
    expect(card.id).toBe("demo-ai-analytics-premium");
    expect(card.illustrative).toBe(true);
    expect(card.company.mrrUsd).toBe(80000);
  });

  it("rejects missing decisionQuestion", () => {
    expect(() => loadDemoCard({ id: "x" })).toThrow(/decisionQuestion/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ceo-sandbox/domain test`  
Expected: FAIL — `loadDemoCard` not defined.

- [ ] **Step 3: Write minimal implementation**

Define `DemoDecisionCard` interface matching fixture fields (`id`, `label`, `illustrative`, `decisionQuestion`, `company`, `feature`, `goals`, `constraints`, `scenarios`, etc.). `loadDemoCard` validates required keys and returns typed object.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ceo-sandbox/domain test`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/domain fixtures/demo
git commit -m "feat(domain): validate demo decision card fixture"
```

---

### Task 4: App run mode enum

**Files:**
- Create: `packages/domain/src/run-mode.ts`
- Create: `packages/domain/src/run-mode.test.ts`

**Interfaces:**
- Produces: `RunMode.Demo | RunMode.Full`, `parseRunMode(value: string): RunMode`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { RunMode, parseRunMode } from "./run-mode";

describe("parseRunMode", () => {
  it("accepts demo and full", () => {
    expect(parseRunMode("demo")).toBe(RunMode.Demo);
    expect(parseRunMode("full")).toBe(RunMode.Full);
  });
  it("rejects unknown", () => {
    expect(() => parseRunMode("batch")).toThrow();
  });
});
```

- [ ] **Step 2–4:** Implement enum + parser; run tests.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/run-mode.ts packages/domain/src/run-mode.test.ts
git commit -m "feat(domain): add demo vs full run mode"
```

---

### Task 5: Next.js web shell with mode toggle

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/page.test.tsx` (optional: use vitest + jsdom or playwright later; minimal smoke via `next build`)

**Interfaces:**
- Consumes: `@ceo-sandbox/domain` (`RunMode`, `loadDemoCard`, `CLAIM_SAFETY_COPY`)
- Produces: `/` UI with Demo/Full toggle and demo card selector (loads fixture via API route)

- [ ] **Step 1: Write the failing test**

Add `apps/web/package.json` script `"build": "next build"`. No unit test yet — use build as gate:

Run: `pnpm --filter @ceo-sandbox/web build`  
Expected: FAIL — app missing.

- [ ] **Step 2: Scaffold Next app**

- Dependency: `@ceo-sandbox/domain` workspace:*
- `app/page.tsx`: heading “Autonomous CEO Decision Sandbox”; radio Demo/Full; when Demo, dropdown with one card id `demo-ai-analytics-premium`.
- Footer: one line from `CLAIM_SAFETY_COPY.panelSimulated`.

- [ ] **Step 3: API route for demo cards**

Create `apps/web/app/api/demo-cards/[id]/route.ts` that reads `fixtures/demo/decision-card-ai-analytics.json`, calls `loadDemoCard`, returns JSON.

- [ ] **Step 4: Run build**

Run: `pnpm --filter @ceo-sandbox/web build`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): shell with demo/full mode and demo card API"
```

---

### Task 6: Index link to specs and subproblems

**Files:**
- Modify: `.docs/subproblems/00-index.md`
- Modify: `README.md`

**Interfaces:**
- Produces: table row linking SP-01 → `.docs/specs/SP-01-scope-success-nongoals.md` and plan path.

- [ ] **Step 1: Add to index after “How to use”**

```markdown
## Implementation specs and plans

| SP | Spec | Plan |
|----|------|------|
| SP-01 | `.docs/specs/SP-01-scope-success-nongoals.md` | `docs/superpowers/plans/2026-10-11-sp01-scope-foundation.md` |
```

- [ ] **Step 2: Commit**

```bash
git add .docs/subproblems/00-index.md README.md
git commit -m "docs: link SP-01 spec and implementation plan"
```

---

### Task 7: CI smoke (build + test)

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Add workflow**

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm --filter @ceo-sandbox/web build
```

- [ ] **Step 2: Run locally**

Run: `pnpm install && pnpm test && pnpm --filter @ceo-sandbox/web build`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml pnpm-lock.yaml
git commit -m "ci: test domain package and build web shell"
```

---

## Self-review (plan author)

**Spec coverage:** SP-01 spec §1–9 map to Tasks 1–7 (scaffold, labels, demo card, modes, web shell, docs, CI). AWS deploy deferred to SP-14. Full pipeline stages deferred to SP-03–SP-10.

**Placeholder scan:** No TBD steps.

**Type consistency:** `DemoDecisionCard` and `RunMode` defined in Task 3–4 before web Task 5.

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-10-11-sp01-scope-foundation.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — run tasks in this session with checkpoints  

**Which approach?**

**Next subproblem:** SP-02 shared domain contracts — spec + plan after SP-01 execution or in parallel if only documenting.
