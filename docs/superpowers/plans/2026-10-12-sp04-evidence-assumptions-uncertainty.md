# SP-04 Evidence, Assumptions, and Uncertainty Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** At Start investigation, persist a validated `{ evidence, claims, inferences }` snapshot on the session and show view-only Observed / Assumed / Unknown / Hypothesis / Inferred lists on the frozen page (no Crustdata, panel, finance, recommendation, revision, or agent).

**Architecture:** Extend SP-02 `evidenceSchema` / `claimSchema` in `@ceo-sandbox/domain`. Add `epistemicSnapshotSchema`, `projectIntakeToEpistemic`, and `validateEpistemicSnapshot` (client-safe). `@ceo-sandbox/db` adds `sessions.epistemic_json` and writes it inside `startSession`. GET `/api/sessions/:id` returns `epistemic` (null until freeze). `/session/[sessionId]` renders the lists.

**Tech Stack:** TypeScript 5.x, Zod 3.x, Vitest, pnpm workspaces, Next.js 15 App Router, better-sqlite3, React 19.

## Global Constraints

- Source of truth: `.docs/specs/SP-04-evidence-assumptions-uncertainty.md` (Q&A in `.docs/subproblems/04-evidence-assumptions-uncertainty.md`).
- `contractVersion: 1`. No fifth `EpistemicKind`. No `ClaimKind.Inferred`. Inferences use existing `inferenceSchema` (`statement` + `refIds` min 1).
- Evidence `source` stays EntitySource. Vendor provenance is **`vendor`**: `crustdata` | `fallback` | `demo_fixture`.
- Demo Observed is never `vendor: crustdata`. Chip **Illustrative example**. IdentityKey `fallback:demo:{sessionId}:competitor`.
- Write snapshot **once on Start**. Draft `epistemic` is `null`. Frozen client PATCH → 409.
- Do not call Crustdata, cfo.ai, Neatlogs, or GitHub. Do not add Playwright. Do not commit `.env`.
- Node runtime only for SQLite (not Edge).
- Product title: **CEO Decision Sandbox**. Demand disclaimer copy is `CLAIM_SAFETY_COPY.competitorNotDemand`.

## File map

| Path | Responsibility |
|------|----------------|
| `packages/domain/src/contracts/evidence.ts` | `vendor`, quarantine identity rule |
| `packages/domain/src/contracts/claim.ts` | `owner`, `status`, `mapsTo`, range, contradiction helpers |
| `packages/domain/src/forbidden-phrases.ts` | Q23 substrings |
| `packages/domain/src/contracts/epistemic-snapshot.ts` | Snapshot schema, validate, warnings |
| `packages/domain/src/project-intake-to-epistemic.ts` | Freeze-time projection |
| `packages/domain/src/epistemic-view.ts` | View-model for frozen page (no React) |
| `packages/db/src/sessions.ts` | `epistemic_json` column + start write |
| `apps/web/lib/session-response.ts` | Include `epistemic` |
| `apps/web/app/api/sessions/[id]/start/route.ts` | 500 on projection failure |
| `apps/web/app/session/[sessionId]/page.tsx` | View-only lists |
| `apps/web/components/session/EpistemicLists.tsx` | Lists UI |

---

### Task 1: Evidence vendor + quarantine

**Files:**
- Modify: `packages/domain/src/contracts/evidence.ts`
- Modify: `packages/domain/src/contracts/claim-evidence.test.ts`
- Modify: `packages/domain/src/client.ts` (export new enums)

**Interfaces:**
- Produces: `EvidenceVendor` enum `crustdata` | `fallback` | `demo_fixture`; `evidenceVendorSchema`; Evidence fields `vendor` (required), `fieldPaths?: string[]`, `demandAdjacent` default false, `quarantine` default false. Identity refine: required unless `quarantine === true`. `retrievedAt` still always required.

- [ ] **Step 1: Write the failing test**

Add to `packages/domain/src/contracts/claim-evidence.test.ts` (keep existing tests compiling by adding `vendor: "crustdata"` to `evidenceBase` **in this same step** — those tests must keep passing after schema change; the new tests fail until implementation):

```typescript
import { EvidenceVendor } from "./evidence";

describe("evidence vendor and quarantine", () => {
  it("requires vendor", () => {
    const r = evidenceSchema.safeParse({
      ...baseEntity,
      sessionId: "00000000-0000-4000-8000-000000000002",
      summary: "x",
      externalId: "co_1",
      retrievedAt: "2026-01-02T12:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  it("accepts demo_fixture vendor with fallback identityKey", () => {
    const r = evidenceSchema.safeParse({
      ...baseEntity,
      sessionId: "00000000-0000-4000-8000-000000000002",
      summary: "Illustrative: a comparable workflow vendor lists analytics as a product capability.",
      vendor: EvidenceVendor.DemoFixture,
      identityKey: "fallback:demo:00000000-0000-4000-8000-000000000002:competitor",
      retrievedAt: "2026-01-02T12:00:00.000Z",
      demandAdjacent: true,
    });
    expect(r.success).toBe(true);
  });

  it("quarantines rows that lack identity instead of rejecting them", () => {
    const r = evidenceSchema.safeParse({
      ...baseEntity,
      sessionId: "00000000-0000-4000-8000-000000000002",
      summary: "dropped",
      vendor: EvidenceVendor.Fallback,
      retrievedAt: "2026-01-02T12:00:00.000Z",
      quarantine: true,
    });
    expect(r.success).toBe(true);
  });

  it("rejects missing identity when not quarantined", () => {
    const r = evidenceSchema.safeParse({
      ...baseEntity,
      sessionId: "00000000-0000-4000-8000-000000000002",
      summary: "dropped",
      vendor: EvidenceVendor.Fallback,
      retrievedAt: "2026-01-02T12:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });
});
```

Update existing `evidenceBase` in that file to include `vendor: "crustdata"` so current retrievedAt tests still express the old rules.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/contracts/claim-evidence.test.ts`

Expected: FAIL — `EvidenceVendor` / `vendor` not defined (or existing tests fail if you added `vendor` to fixtures before schema).

- [ ] **Step 3: Write minimal implementation**

In `packages/domain/src/contracts/evidence.ts`:

```typescript
export enum EvidenceVendor {
  Crustdata = "crustdata",
  Fallback = "fallback",
  DemoFixture = "demo_fixture",
}

export const evidenceVendorSchema = z.nativeEnum(EvidenceVendor);
```

Extend the object with `vendor: evidenceVendorSchema`, `fieldPaths: z.array(z.string().min(1)).optional()`, `demandAdjacent: z.boolean().optional()`, `quarantine: z.boolean().optional()`.

Change `hasExternalIdentity` refine to: if `data.quarantine === true`, pass; else existing identity rule.

Export `EvidenceVendor` from `packages/domain/src/client.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/contracts/claim-evidence.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/contracts/evidence.ts packages/domain/src/contracts/claim-evidence.test.ts packages/domain/src/client.ts
git commit -m "$(cat <<'EOF'
feat(domain): add Evidence vendor and quarantine identity rule

EOF
)"
```

---

### Task 2: Claim owner, status, mapsTo

**Files:**
- Modify: `packages/domain/src/contracts/claim.ts`
- Modify: `packages/domain/src/contracts/claim-evidence.test.ts`
- Modify: `packages/domain/fixtures/v1/minimal-session.json`
- Modify: `packages/domain/src/client.ts`

**Interfaces:**
- Consumes: existing `claimSchema`, `ClaimRationaleTag`.
- Produces: `ClaimOwner` (`user` | `agent` | `system` | `demo_fixture`), `ClaimStatus` (`active` | `contradicted` | `superseded`), required `owner` + `status` on all claim kinds; optional `contradictingEvidenceId`; assumption optional `mapsTo`, optional `numericRange: { min, max, unit }` (unit must match `numeric.unit` when both present). `mayAgentMutate(claim)`, `claimsConflict(a, b)`, `contradictionPredicate(claim, evidence)` — `{ suggest: boolean; operatorMustConfirm: true }` when new Observed summary is non-empty and claim is `active`; **does not** change `status`.

- [ ] **Step 1: Write the failing test**

Add to `claim-evidence.test.ts`. Also add `owner: "user", status: "active"` to the existing assumption accept test so it remains a valid fixture after the schema change.

```typescript
import {
  ClaimOwner,
  ClaimStatus,
  mayAgentMutate,
  claimsConflict,
  contradictionPredicate,
} from "./claim";

describe("claim owner and status", () => {
  const assumption = {
    ...baseEntity,
    sessionId: "00000000-0000-4000-8000-000000000002",
    kind: ClaimKind.Assumption,
    statement: "Pilot adoption rate",
    numeric: { unit: "percent" as const, value: 18 },
    owner: ClaimOwner.DemoFixture,
    status: ClaimStatus.Active,
    locked: true,
    mapsTo: "adoption_rate",
    rationaleTag: "demo_fixture" as const,
  };

  it("requires owner and status", () => {
    const { owner, status, ...rest } = assumption;
    expect(claimSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects contradicted without contradictingEvidenceId", () => {
    expect(
      claimSchema.safeParse({
        ...assumption,
        status: ClaimStatus.Contradicted,
      }).success,
    ).toBe(false);
  });

  it("mayAgentMutate is false for demo_fixture, user, and locked", () => {
    expect(mayAgentMutate(assumption)).toBe(false);
    expect(mayAgentMutate({ ...assumption, owner: ClaimOwner.User, locked: false })).toBe(false);
    expect(mayAgentMutate({ ...assumption, owner: ClaimOwner.Agent, locked: true })).toBe(false);
    expect(mayAgentMutate({ ...assumption, owner: ClaimOwner.Agent, locked: false })).toBe(true);
  });

  it("claimsConflict when same mapsTo and different numeric values", () => {
    const b = { ...assumption, id: "00000000-0000-4000-8000-000000000099", numeric: { unit: "percent" as const, value: 40 } };
    expect(claimsConflict(assumption, b)).toBe(true);
    expect(claimsConflict(assumption, { ...b, numeric: assumption.numeric })).toBe(false);
  });

  it("contradictionPredicate suggests but does not flip status", () => {
    const evidence = {
      id: "00000000-0000-4000-8000-000000000010",
      summary: "Observed competitor pricing changed",
    };
    const result = contradictionPredicate(assumption, evidence);
    expect(result.suggest).toBe(true);
    expect(result.operatorMustConfirm).toBe(true);
    expect(assumption.status).toBe(ClaimStatus.Active);
  });
});
```

In `minimal-session.json` claim object add `"owner": "demo_fixture", "status": "active", "mapsTo": "adoption_rate"` (do this in Step 3 with schema, or in Step 1 if validate-fixtures starts failing — either is fine as long as the fixture matches the new schema before Task 2 commit).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/contracts/claim-evidence.test.ts src/contracts/validate-fixtures.test.ts`

Expected: FAIL — `ClaimOwner` not exported / fixture missing owner.

- [ ] **Step 3: Write minimal implementation**

In `claim.ts` add enums and fields on `claimCommonFields`. For contradicted, `.superRefine` on `claimSchema` **or** on each branch: if `status === contradicted` then `contradictingEvidenceId` uuid required.

`numericRange` optional object `{ min: z.number(), max: z.number(), unit: z.enum(["percent", "money"]) }` with refine that `min <= max` and if `numeric` present, `unit` matches `numeric.unit`.

```typescript
export function mayAgentMutate(claim: {
  owner: ClaimOwner;
  locked?: boolean;
}): boolean {
  if (claim.locked) return false;
  if (claim.owner === ClaimOwner.User) return false;
  if (claim.owner === ClaimOwner.DemoFixture) return false;
  return claim.owner === ClaimOwner.Agent;
}

export function claimsConflict(
  a: { kind: string; mapsTo?: string; numeric?: { unit: string; value: number } },
  b: { kind: string; mapsTo?: string; numeric?: { unit: string; value: number } },
): boolean {
  if (a.kind !== "assumption" || b.kind !== "assumption") return false;
  if (!a.mapsTo || a.mapsTo !== b.mapsTo) return false;
  if (!a.numeric || !b.numeric) return false;
  return a.numeric.unit === b.numeric.unit && a.numeric.value !== b.numeric.value;
}

export function contradictionPredicate(
  _claim: { status: ClaimStatus },
  evidence: { summary: string },
): { suggest: boolean; operatorMustConfirm: true } {
  return {
    suggest: evidence.summary.trim().length > 0,
    operatorMustConfirm: true,
  };
}
```

Export new enums/functions from `client.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ceo-sandbox/domain test`

Expected: PASS (whole domain package; fixture included).

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/contracts/claim.ts packages/domain/src/contracts/claim-evidence.test.ts packages/domain/fixtures/v1/minimal-session.json packages/domain/src/client.ts
git commit -m "$(cat <<'EOF'
feat(domain): require claim owner and status

EOF
)"
```

---

### Task 3: Forbidden phrases (Q23)

**Files:**
- Modify: `packages/domain/src/forbidden-phrases.ts`
- Modify: `packages/domain/src/forbidden-phrases.test.ts`

**Interfaces:**
- Produces: `FORBIDDEN_PHRASES` keeps the six SP-02 entries **first**, then appends: `definitely`, `customers will buy`, `guaranteed revenue`, `will hit $`, `1000 real`, `1,000 real`, `proves demand`, `proves customer demand`, `real interviews`.

- [ ] **Step 1: Write the failing test**

Replace the equality assertion in `forbidden-phrases.test.ts` with the full ordered list above. Add:

```typescript
  it("flags competitor-proves-demand wording", () => {
    expect(findForbiddenPhrases("This proves customer demand for our add-on.")).toContain(
      "proves customer demand",
    );
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/forbidden-phrases.test.ts`

Expected: FAIL — list mismatch.

- [ ] **Step 3: Write minimal implementation**

Append the new strings to the `FORBIDDEN_PHRASES` array in the order listed in Interfaces.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/forbidden-phrases.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/forbidden-phrases.ts packages/domain/src/forbidden-phrases.test.ts
git commit -m "$(cat <<'EOF'
feat(domain): extend forbidden claim-safety phrases

EOF
)"
```

---

### Task 4: Epistemic snapshot schema and validator

**Files:**
- Create: `packages/domain/src/contracts/epistemic-snapshot.ts`
- Create: `packages/domain/src/contracts/epistemic-snapshot.test.ts`
- Modify: `packages/domain/src/client.ts`

**Interfaces:**
- Consumes: `evidenceSchema`, `claimSchema`, `inferenceSchema` from `./recommendation`.
- Produces: `epistemicSnapshotSchema`, type `EpistemicSnapshot`, `emptyEpistemicSnapshot()`, `validateEpistemicSnapshot(snapshot: unknown): { ok: boolean; errors: Record<string, string>; quarantinedIds: string[] }`, `epistemicWarnings(snapshot: EpistemicSnapshot): { path: string; message: string }[]`.

- [ ] **Step 1: Write the failing test**

Create `packages/domain/src/contracts/epistemic-snapshot.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { CLAIM_SAFETY_COPY } from "../epistemic";
import {
  emptyEpistemicSnapshot,
  epistemicSnapshotSchema,
  epistemicWarnings,
  validateEpistemicSnapshot,
} from "./epistemic-snapshot";

describe("emptyEpistemicSnapshot", () => {
  it("is a valid empty snapshot", () => {
    const empty = emptyEpistemicSnapshot();
    expect(epistemicSnapshotSchema.safeParse(empty).success).toBe(true);
    expect(empty.contractVersion).toBe(1);
    expect(empty.evidence).toEqual([]);
    expect(empty.claims).toEqual([]);
    expect(empty.inferences).toEqual([]);
  });
});

describe("validateEpistemicSnapshot", () => {
  it("fails when inference refIds do not resolve", () => {
    const snapshot = emptyEpistemicSnapshot();
    snapshot.inferences = [
      {
        statement: CLAIM_SAFETY_COPY.competitorNotDemand,
        refIds: ["00000000-0000-4000-8000-000000000001"],
      },
    ];
    const result = validateEpistemicSnapshot(snapshot);
    expect(result.ok).toBe(false);
    expect(result.errors["inferences.0.refIds"]).toBeDefined();
  });

  it("lists quarantined ids", () => {
    const snapshot = emptyEpistemicSnapshot();
    snapshot.evidence = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        contractVersion: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        source: "system",
        sessionId: "00000000-0000-4000-8000-000000000002",
        summary: "hidden",
        vendor: "fallback",
        retrievedAt: "2026-01-01T00:00:00.000Z",
        quarantine: true,
      },
    ];
    const result = validateEpistemicSnapshot(snapshot);
    expect(result.ok).toBe(true);
    expect(result.quarantinedIds).toEqual(["00000000-0000-4000-8000-000000000001"]);
  });
});

describe("epistemicWarnings", () => {
  it("warns when quarantined count > 0", () => {
    const snapshot = emptyEpistemicSnapshot();
    snapshot.evidence.push({
      id: "00000000-0000-4000-8000-000000000001",
      contractVersion: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      source: "system",
      sessionId: "00000000-0000-4000-8000-000000000002",
      summary: "hidden",
      vendor: "fallback",
      retrievedAt: "2026-01-01T00:00:00.000Z",
      quarantine: true,
    });
    expect(epistemicWarnings(snapshot).some((w) => /hidden/i.test(w.message))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/contracts/epistemic-snapshot.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`epistemicSnapshotSchema` = `z.object({ contractVersion: z.literal(1), evidence: z.array(evidenceSchema), claims: z.array(claimSchema), inferences: z.array(inferenceSchema) }).strict()`.

`emptyEpistemicSnapshot()` returns `{ contractVersion: 1, evidence: [], claims: [], inferences: [] }`.

`validateEpistemicSnapshot`: `safeParse`; if fail, flatten zod paths into `errors`. Collect `quarantinedIds` from parsed evidence. For each inference index, if any `refId` is not in `evidence.id` ∪ `claims.id`, set `errors["inferences.{i}.refIds"]`. `ok` is parse success AND no unresolved refs. Quarantine alone does **not** fail `ok`.

`epistemicWarnings`: if quarantined length > 0, `{ path: "evidence", message: "N evidence item(s) hidden (missing identity)." }`; if an evidence row has identity but no `canonicalUrl` and no `vendorTimestamp`, `{ path: `evidence.{id}`, message: "Incomplete optional provenance." }`.

Export from `client.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/contracts/epistemic-snapshot.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/contracts/epistemic-snapshot.ts packages/domain/src/contracts/epistemic-snapshot.test.ts packages/domain/src/client.ts
git commit -m "$(cat <<'EOF'
feat(domain): add epistemic snapshot schema and validator

EOF
)"
```

---

### Task 5: `projectIntakeToEpistemic`

**Files:**
- Create: `packages/domain/src/project-intake-to-epistemic.ts`
- Create: `packages/domain/src/project-intake-to-epistemic.test.ts`
- Modify: `packages/domain/src/client.ts`
- Modify: `packages/domain/src/server.ts` (re-export if you keep projection server-only; prefer client.ts — uses `newId()` from `contracts/base.ts` which is Web-crypto)

**Interfaces:**
- Consumes: `IntakeDraftPartial`, `RunMode`, `emptyEpistemicSnapshot`, `validateEpistemicSnapshot`, `CLAIM_SAFETY_COPY`, `EntitySource`, `EvidenceVendor`, `ClaimOwner`, `ClaimStatus`, `ClaimKind`, `ClaimResolution`, `FieldSource`.
- Produces: `DEMO_OBSERVED_SUMMARY` = `"Illustrative: a comparable workflow vendor lists analytics as a product capability."`; `DEMO_HYPOTHESIS_STATEMENT` = `"Analytics may be strategically important for this product."`; `WTP_UNKNOWN_STATEMENT` = `"Willingness to pay for this feature is unknown."`; `DEMO_OBSERVED_KEY_SUFFIX` = `"competitor"`; `demoObservedIdentityKey(sessionId: string): string` → `` `fallback:demo:${sessionId}:competitor` ``; `projectIntakeToEpistemic(intake: IntakeDraftPartial, ctx: { mode: RunMode; sessionId: string; now: string }): EpistemicSnapshot`.

- [ ] **Step 1: Write the failing test**

Create `packages/domain/src/project-intake-to-epistemic.test.ts`. Build a complete Full intake like `packages/db/src/sessions.test.ts` `completeDemoLike` (inline the object; do not import db). Include `assumptions: [{ id: "00000000-0000-4000-8000-000000000050", statement: "Pilot adoption", numeric: { unit: "percent", value: 18 }, rationaleTag: "user_provided", mapsTo: "adoption_rate" }]`, `financials: { provideLater: true }`, `constraints: { budgetUsd: 1000, executionMonths: 3 }`.

```typescript
import { describe, it, expect } from "vitest";
import { CLAIM_SAFETY_COPY } from "./epistemic";
import { findForbiddenPhrases } from "./forbidden-phrases";
import { RunMode } from "./run-mode";
import { ClaimKind } from "./contracts/enums";
import { emptyIntakeDraft } from "./contracts/intake";
import {
  DEMO_HYPOTHESIS_STATEMENT,
  DEMO_OBSERVED_SUMMARY,
  WTP_UNKNOWN_STATEMENT,
  demoObservedIdentityKey,
  projectIntakeToEpistemic,
} from "./project-intake-to-epistemic";
import { validateEpistemicSnapshot } from "./contracts/epistemic-snapshot";

const SESSION = "00000000-0000-4000-8000-000000000002";
const NOW = "2026-10-12T00:00:00.000Z";
const ASSUMPTION_ID = "00000000-0000-4000-8000-000000000050";

function completeIntake(mode: RunMode) {
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
  d.feature = { description: "AI add-on", changeType: "feature" };
  d.decision = { questionText: "Should we launch it?" };
  d.financials = { provideLater: true };
  d.assumptions = [
    {
      id: ASSUMPTION_ID,
      statement: "Pilot adoption",
      numeric: { unit: "percent", value: 18 },
      rationaleTag: "user_provided",
      mapsTo: "adoption_rate",
    },
  ];
  return d;
}

describe("projectIntakeToEpistemic", () => {
  it("Full: no Observed, preserves assumption ids, provideLater → Unknown, always WTP Unknown", () => {
    const snap = projectIntakeToEpistemic(completeIntake(RunMode.Full), {
      mode: RunMode.Full,
      sessionId: SESSION,
      now: NOW,
    });
    expect(validateEpistemicSnapshot(snap).ok).toBe(true);
    expect(snap.evidence).toEqual([]);
    expect(snap.inferences).toEqual([]);
    expect(snap.claims.some((c) => c.id === ASSUMPTION_ID && c.kind === ClaimKind.Assumption)).toBe(true);
    const unknowns = snap.claims.filter((c) => c.kind === ClaimKind.Unknown);
    expect(unknowns.some((c) => c.statement === WTP_UNKNOWN_STATEMENT)).toBe(true);
    expect(unknowns.some((c) => /cash/i.test(c.statement))).toBe(true);
    expect(snap.claims.some((c) => c.kind === ClaimKind.Assumption && /budget/i.test(c.statement))).toBe(true);
  });

  it("Demo: illustrative Observed, hypothesis, demand disclaimer; vendor is not crustdata", () => {
    const snap = projectIntakeToEpistemic(completeIntake(RunMode.Demo), {
      mode: RunMode.Demo,
      sessionId: SESSION,
      now: NOW,
    });
    expect(validateEpistemicSnapshot(snap).ok).toBe(true);
    expect(snap.evidence).toHaveLength(1);
    const ev = snap.evidence[0];
    expect(ev.vendor).toBe("demo_fixture");
    expect(ev.vendor).not.toBe("crustdata");
    expect(ev.identityKey).toBe(demoObservedIdentityKey(SESSION));
    expect(ev.demandAdjacent).toBe(true);
    expect(ev.summary).toBe(DEMO_OBSERVED_SUMMARY);
    expect(ev.retrievedAt).toBe(NOW);
    expect(snap.claims.some((c) => c.kind === ClaimKind.Hypothesis && c.statement === DEMO_HYPOTHESIS_STATEMENT)).toBe(true);
    expect(snap.inferences).toEqual([
      { statement: CLAIM_SAFETY_COPY.competitorNotDemand, refIds: [ev.id] },
    ]);
    expect(findForbiddenPhrases(ev.summary)).toEqual([]);
    expect(findForbiddenPhrases(DEMO_HYPOTHESIS_STATEMENT)).toEqual([]);
  });

  it("does not emit WTP Unknown when proposedPriceUsd is set", () => {
    const intake = completeIntake(RunMode.Full);
    intake.feature = { ...intake.feature!, proposedPriceUsd: 20, proposedPricePeriod: "monthly" };
    const snap = projectIntakeToEpistemic(intake, {
      mode: RunMode.Full,
      sessionId: SESSION,
      now: NOW,
    });
    expect(snap.claims.some((c) => c.statement === WTP_UNKNOWN_STATEMENT)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/project-intake-to-epistemic.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`project-intake-to-epistemic.ts` algorithm (must match spec §6.5):

1. `const snap = emptyEpistemicSnapshot()`.
2. For each `intake.assumptions ?? []`, push a Claim `kind: assumption` with **same `id`**, `sessionId`, `contractVersion: 1`, `createdAt: ctx.now`, `source: EntitySource.System`, `statement`, `numeric`, `rationaleTag`, `mapsTo`, `status: active`, `locked: owner === demo_fixture`, `owner` from rationaleTag: `demo_fixture` → `demo_fixture`, `user_provided` → `user`, else `system`.
3. If no claim has `mapsTo === "budget"` and `constraints.budgetUsd` is a number, add assumption `mapsTo: "budget"`, statement `Budget cap is ${n} USD (one-time).`, `numeric: { unit: "money", value: n, currency: "USD", period: "one_time" }`, owner from `fieldSources["constraints.budgetUsd"]` (`demo_fixture` / `user` / `system_default` → system), else `user`.
4. If `constraints.executionMonths` is a number, add assumption statement `Execution window: ${n} months.` (no numeric), `mapsTo: "execution_months"` unless already present.
5. If `financials.provideLater === true`, for each missing metric among `cashUsd`, `customerCount`, `mrrUsd`, `runwayMonths` (value `undefined`), add Unknown with statements: `"Cash on hand not provided (provide later)."`, `"Customer count not provided (provide later)."`, `"MRR not provided (provide later)."`, `"Runway not provided (provide later)."` — skip a metric if its value is present. `rationaleTag: missing_evidence`, `owner: user`.
6. If `financials.provideLater !== true`, for each present financial metric add an assumption (money/count as statement + numeric where applicable) unless a claim already covers that `mapsTo` (`cash`, `customer_count`, `mrr`, `runway`).
7. If `feature.proposedPriceUsd` is **not** a number, add Unknown `WTP_UNKNOWN_STATEMENT`.
8. If `ctx.mode === RunMode.Demo`: create Observed evidence with `newId()`, `vendor: demo_fixture`, `identityKey: demoObservedIdentityKey(sessionId)`, `summary: DEMO_OBSERVED_SUMMARY`, `demandAdjacent: true`, `retrievedAt: ctx.now`, `source: EntitySource.System`, `sessionId`. Push Hypothesis with `DEMO_HYPOTHESIS_STATEMENT`, `resolution: open`, `owner: demo_fixture`, `locked: true`. Push inference `{ statement: CLAIM_SAFETY_COPY.competitorNotDemand, refIds: [evidence.id] }`.
9. Return snap (caller validates).

Use `newId()` from `./contracts/base`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/project-intake-to-epistemic.test.ts`

Expected: PASS.

Then: `pnpm --filter @ceo-sandbox/domain test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/project-intake-to-epistemic.ts packages/domain/src/project-intake-to-epistemic.test.ts packages/domain/src/client.ts packages/domain/src/server.ts
git commit -m "$(cat <<'EOF'
feat(domain): project intake into an epistemic snapshot at freeze

EOF
)"
```

---

### Task 6: SQLite `epistemic_json` on start

**Files:**
- Modify: `packages/db/src/sessions.ts`
- Modify: `packages/db/src/sessions.test.ts`
- Create: `packages/db/src/epistemic-projection-error.ts`
- Modify: `packages/db/src/index.ts`

**Interfaces:**
- Consumes: `projectIntakeToEpistemic`, `validateEpistemicSnapshot`, `epistemicSnapshotSchema`.
- Produces: `SessionRecord.epistemic: EpistemicSnapshot | null`; `EpistemicProjectionError` (`name: "EpistemicProjectionError"`, `code: "epistemic_projection_failed"`); `startSession` writes JSON and freezes only if validate `ok`. Existing DBs: `ALTER TABLE sessions ADD COLUMN epistemic_json TEXT` ignoring duplicate-column errors.

- [ ] **Step 1: Write the failing test**

Add to `sessions.test.ts`:

```typescript
it("start writes epistemic snapshot; draft epistemic is null; freeze still blocks patch", () => {
  const db = store();
  const created = db.createSession({
    mode: RunMode.Demo,
    intake: completeDemoLike(RunMode.Demo),
  });
  expect(created.epistemic).toBeNull();
  db.approveSession(created.id);
  const started = db.startSession(created.id);
  expect(started.status).toBe("frozen");
  expect(started.epistemic).not.toBeNull();
  expect(started.epistemic?.evidence.length).toBe(1);
  expect(started.epistemic?.evidence[0]?.vendor).toBe("demo_fixture");

  const reopened = openSessionStore(join(dirs[0], "sandbox.sqlite"));
  expect(reopened.getSession(created.id)?.epistemic?.evidence[0]?.vendor).toBe("demo_fixture");
});

it("Full start has empty evidence", () => {
  const db = store();
  const created = db.createSession({
    mode: RunMode.Full,
    intake: completeDemoLike(RunMode.Full),
  });
  db.approveSession(created.id);
  const started = db.startSession(created.id);
  expect(started.epistemic?.evidence).toEqual([]);
});
```

Existing start/approve test must still pass; `completeDemoLike` already used for Full — Demo create needs `mode: RunMode.Demo` **and** intake.mode demo (`completeDemoLike(RunMode.Demo)`).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ceo-sandbox/db test`

Expected: FAIL — `epistemic` undefined.

- [ ] **Step 3: Write minimal implementation**

`CREATE TABLE` add `epistemic_json TEXT`. After `db.exec(CREATE_TABLE)`:

```typescript
try {
  db.exec(`ALTER TABLE sessions ADD COLUMN epistemic_json TEXT`);
} catch {
  // column already exists
}
```

Add `epistemic_json` to `SELECT_COLUMNS`, `SessionRow`, `SessionRecord`.

`rowToRecord`: `epistemic: row.epistemic_json ? epistemicSnapshotSchema.parse(JSON.parse(row.epistemic_json)) : null`.

`startSession`: after `not_approved` check, parse intake, `projectIntakeToEpistemic(intake, { mode: row.mode as RunMode, sessionId: id, now })`, `validateEpistemicSnapshot`. If `!ok`, throw `new EpistemicProjectionError()`. Else UPDATE `status, frozen_at, updated_at, epistemic_json`.

`updateIntake` already throws frozen; no extra epistemic write.

Export `EpistemicProjectionError` from `index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ceo-sandbox/db test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/sessions.ts packages/db/src/sessions.test.ts packages/db/src/epistemic-projection-error.ts packages/db/src/index.ts
git commit -m "$(cat <<'EOF'
feat(db): persist epistemic_json when a session is frozen

EOF
)"
```

---

### Task 7: HTTP GET/Start include epistemic

**Files:**
- Modify: `apps/web/lib/session-response.ts`
- Modify: `apps/web/app/api/sessions/[id]/start/route.ts`
- Create: `apps/web/app/api/sessions/[id]/start/route.test.ts`
- Modify: `apps/web/app/api/sessions/[id]/approve/route.test.ts` (assert `epistemic` on start 200)
- Modify: `apps/web/lib/api-errors.ts` only if you add a helper; otherwise inline 500 JSON in start route

**Interfaces:**
- Consumes: `sessionToJson`, `EpistemicProjectionError`.
- Produces: JSON `{ id, status, intake, epistemic }` where `epistemic` is the snapshot or `null`. Start: `EpistemicProjectionError` → **500** `{ error: "epistemic_projection_failed", code: "epistemic_projection_failed" }` and session remains `approved`. `not_approved` still 400.

- [ ] **Step 1: Write the failing test**

Create `apps/web/app/api/sessions/[id]/start/route.test.ts` using the same temp sqlite + `SANDBOX_SQLITE_PATH` pattern as `approve/route.test.ts`:

```typescript
it("GET epistemic is null before start and a demo snapshot after", async () => {
  // POST create mode demo, PATCH complete demo intake, GET → epistemic null
  // approve, start → 200, body.epistemic.evidence[0].vendor === "demo_fixture"
  // GET same id → epistemic present
});
```

Also assert existing approve test's started body can include `epistemic` (Full → `evidence: []`).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ceo-sandbox/web exec vitest run app/api/sessions/[id]/start/route.test.ts`

Expected: FAIL — `epistemic` missing on JSON.

- [ ] **Step 3: Write minimal implementation**

```typescript
// session-response.ts
export function sessionToJson(record: SessionRecord) {
  return {
    id: record.id,
    status: record.status,
    intake: record.intake,
    epistemic: record.epistemic,
  };
}
```

Start route: `import { EpistemicProjectionError } from "@ceo-sandbox/db"` and catch → `NextResponse.json({ error: "epistemic_projection_failed", code: "epistemic_projection_failed" }, { status: 500 })`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ceo-sandbox/web test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/session-response.ts apps/web/app/api/sessions/[id]/start/route.ts apps/web/app/api/sessions/[id]/start/route.test.ts apps/web/app/api/sessions/[id]/approve/route.test.ts
git commit -m "$(cat <<'EOF'
feat(web): return epistemic snapshot from session GET and Start

EOF
)"
```

---

### Task 8: Frozen page lists

**Files:**
- Create: `packages/domain/src/epistemic-view.ts`
- Create: `packages/domain/src/epistemic-view.test.ts`
- Modify: `packages/domain/src/client.ts`
- Create: `apps/web/components/session/EpistemicLists.tsx`
- Modify: `apps/web/app/session/[sessionId]/page.tsx`

**Interfaces:**
- Produces: `buildEpistemicViewModel(snapshot: EpistemicSnapshot | null): { observed, assumptions, unknowns, hypotheses, inferences, emptyObserved: boolean, quarantineWarning: string | null }`. Observed = evidence where `quarantine !== true`. Vendor chip: `demo_fixture` → `"Illustrative example"`; `crustdata` → `"Observed via Crustdata"`; `fallback` → `"Fallback market context (not Crustdata)"`. `emptyObserved` true when snapshot non-null and observed length 0. `quarantineWarning` = `"N evidence item(s) hidden (missing identity)."` when N>0 else null. Frozen page copy includes **No observed market evidence yet.** when `emptyObserved`. Demand-adjacent rows also show `CLAIM_SAFETY_COPY.competitorNotDemand`. Keep existing freeze sentence and recap link.

- [ ] **Step 1: Write the failing test**

`epistemic-view.test.ts`: demo-like snapshot with one `demo_fixture` demandAdjacent evidence + one quarantined row + one assumption + one unknown + one hypothesis + one inference. Assert observed length 1, chip Illustrative example, quarantineWarning matches `/1 evidence/`, emptyObserved false. Full empty snapshot → emptyObserved true, observed [].

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/epistemic-view.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Implement `buildEpistemicViewModel`. Export from `client.ts`.

`EpistemicLists.tsx` (client component) takes the view model and renders headings **Observed**, **Assumptions**, **Unknowns**, **Hypothesis**, **Inferred** (omit Hypothesis heading if array empty). Empty Observed: `<p>No observed market evidence yet.</p>`. Each Observed row: summary, label **Observed**, `retrievedAt`, vendor chip, disclaimer if `demandAdjacent`. Assumptions: **Assumed** label, owner, rationaleTag, numeric. No inputs.

`page.tsx`: extend payload type with `epistemic`; pass `buildEpistemicViewModel(body.epistemic)` into `EpistemicLists`. Keep freeze copy: `Intake is frozen. The investigation pipeline lands in SP-10.`

Static strings used in the component must not trip `findForbiddenPhrases` (cover this in the domain view-model test using `DEMO_OBSERVED_SUMMARY` and `CLAIM_SAFETY_COPY`).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/epistemic-view.test.ts`

Expected: PASS.

`pnpm --filter @ceo-sandbox/web test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/epistemic-view.ts packages/domain/src/epistemic-view.test.ts packages/domain/src/client.ts apps/web/components/session/EpistemicLists.tsx apps/web/app/session/[sessionId]/page.tsx
git commit -m "$(cat <<'EOF'
feat(web): show view-only epistemic lists on the frozen session page

EOF
)"
```

---

### Task 9: Docs index and README

**Files:**
- Modify: `.docs/subproblems/00-index.md` (SP-04 spec + plan cells)
- Modify: `README.md` (two links, same style as SP-03)

**Interfaces:**
- Produces: index plan cell `docs/superpowers/plans/2026-10-12-sp04-evidence-assumptions-uncertainty.md`; spec cell `.docs/specs/SP-04-evidence-assumptions-uncertainty.md`.

- [ ] **Step 1: Update the index table**

Insert a **new** SP-04 row (the table currently ends at SP-03). Spec: `.docs/specs/SP-04-evidence-assumptions-uncertainty.md`. Plan: `docs/superpowers/plans/2026-10-12-sp04-evidence-assumptions-uncertainty.md`. Do not invent other SP rows.

- [ ] **Step 2: Update README documentation list**

Add SP-04 spec and plan links immediately after the SP-03 plan link.

- [ ] **Step 3: Commit**

```bash
git add .docs/subproblems/00-index.md README.md
git commit -m "$(cat <<'EOF'
docs: link SP-04 epistemic spec and plan

EOF
)"
```

---

### Task 10: Manual browser verification (no Playwright)

**Files:** none required.

- [ ] **Step 1:** `pnpm test` at repo root → all packages PASS.

- [ ] **Step 2:** `pnpm --filter @ceo-sandbox/web dev`. In the browser:

  1. Demo → Use illustrative scenario → recap → Approve → Start investigation → frozen page shows Observed (Illustrative example, not “via Crustdata”), Assumptions, Unknowns, Hypothesis, demand disclaimer. Refresh; still frozen. PATCH `/api/sessions/:id` → 409.
  2. Home Full → New decision → complete required fields (`provideLater` ok) → Approve → Start → Observed empty line **No observed market evidence yet.** Assumptions/Unknowns present.
  3. GET `/api/sessions/:id` before Start has `"epistemic": null`.

If any step fails, fix in the matching task and re-run that task's tests before continuing.

- [ ] **Step 3:** Commit only if verification required code fixes: `fix(web): epistemic verification follow-ups`

---

## Self-review

| Spec section | Task |
|--------------|------|
| §1 clarifications | Global constraints + Tasks 5–8 |
| §3 architecture | 5, 6, 7, 8 |
| §4 HTTP | 7 |
| §5 SQLite | 6 |
| §6 schemas / projection / validate | 1, 2, 4, 5 |
| §7 frozen UI | 8 |
| §8 forbidden phrases | 3, 5, 8 |
| §9 contradiction predicates | 2 |
| §10 downstream | not implemented (documented) |
| §11 errors | 6, 7 |
| §12 tests | 1–7, 10 |
| §13 out of scope | not implemented |

**Placeholder scan:** no TBD. `vendor: crustdata` chip exists in the view-model for SP-05 but is not produced by SP-04 projection.

**Type consistency:** `projectIntakeToEpistemic`, `validateEpistemicSnapshot`, `epistemicSnapshotSchema`, `EpistemicProjectionError`, `sessionToJson` `epistemic`, `buildEpistemicViewModel` names are stable across tasks.

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-10-12-sp04-evidence-assumptions-uncertainty.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks

**2. Inline Execution** — run tasks in this session with executing-plans and checkpoints

Which approach?
