# SP-05 Crustdata Market Research Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After intake freeze, one button runs a bounded Crustdata search/enrich (or fixture) path, appends labeled Evidence to `epistemic_json`, and shows competitor cards without claiming demand.

**Architecture:** Domain owns query templates + company→Evidence mapping + `marketResearch` metadata. `apps/web/lib/crustdata` owns live REST (`Bearer` + `x-api-version: 2025-11-01`) and fixture adapters, stop conditions, and `runCrustdataResearchPath`. DB allows a frozen-session **epistemic-only** write. POST `/api/sessions/:id/research/crustdata` is idempotent after `ran`/`fallback`.

**Tech Stack:** TypeScript 5.x, Zod 3.x, Vitest, pnpm, Next.js 15, better-sqlite3. Native `fetch` (no extra HTTP client).

## Global Constraints

- **Prerequisite:** SP-04 plan is implemented (`epistemicSnapshotSchema`, `Evidence.vendor`, `projectIntakeToEpistemic`, `buildEpistemicViewModel`, `sessions.epistemic_json`). If those symbols are missing, stop and finish SP-04 first.
- Source of truth: `.docs/specs/SP-05-crustdata-market-research.md`.
- Base URL `https://api.crustdata.com`. Headers: `authorization: Bearer ${CRUSTDATA_API_KEY}`, `x-api-version: 2025-11-01`, `content-type: application/json`.
- Live only when `CRUSTDATA_API_KEY` **and** `CRUSTDATA_LIVE=1`. Otherwise fixtures.
- Never delete `vendor: demo_fixture` Evidence. Never call people/news/web/batch endpoints. Never send the API key to the browser.
- Caps: 5 companies, 8 **logical** HTTP calls, 30s wall clock, 1 refine search if first search empty.
- Do not add Playwright. Do not commit `.env`. `data/` is already gitignored.
- Demand copy: `CLAIM_SAFETY_COPY.competitorNotDemand`. Footer: `Data from Crustdata.`

## File map

| Path | Responsibility |
|------|----------------|
| `packages/domain/src/crustdata-query.ts` | Template expansion |
| `packages/domain/src/crustdata-map.ts` | DTO → Evidence |
| `packages/domain/src/contracts/epistemic-snapshot.ts` | `marketResearch` fields |
| `fixtures/crustdata/*.json` | Recorded + fallback payloads |
| `apps/web/lib/crustdata/adapter.ts` | Live + fixture |
| `apps/web/lib/crustdata/run-path.ts` | Orchestrator |
| `packages/db/src/sessions.ts` | `applyEpistemicSnapshot` |
| `apps/web/app/api/sessions/[id]/research/crustdata/route.ts` | POST |
| `apps/web/app/api/health/crustdata/route.ts` | Smoke |
| `apps/web/components/session/CrustdataResearch.tsx` | Button + banners |
| `apps/web/app/session/[sessionId]/page.tsx` | Wire button |

---

### Task 1: Query template + marketResearch schema

**Files:**
- Create: `packages/domain/src/crustdata-query.ts`
- Create: `packages/domain/src/crustdata-query.test.ts`
- Modify: `packages/domain/src/contracts/epistemic-snapshot.ts`
- Modify: `packages/domain/src/contracts/epistemic-snapshot.test.ts`
- Modify: `packages/domain/src/client.ts`

**Interfaces:**
- Produces: `CrustdataSourceMode` = `live` | `recorded` | `fallback` | `none`; `crustdataResearchStateSchema`; `buildCrustdataQuery(input: { mode: RunMode; category?: string; featureTitle?: string; featureDescription?: string; geography?: string; competitors?: string[]; demoHint?: string }): { ok: true; query: string } | { ok: false; error: string }`. Demo: `query = demoHint.trim()` (required non-empty). Full: concatenate spec §6.2 template; fail if category missing/empty.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { RunMode } from "./run-mode";
import { buildCrustdataQuery } from "./crustdata-query";
import { epistemicSnapshotSchema, emptyEpistemicSnapshot } from "./contracts/epistemic-snapshot";

describe("buildCrustdataQuery", () => {
  it("uses demoHint in Demo mode", () => {
    const r = buildCrustdataQuery({
      mode: RunMode.Demo,
      demoHint: "B2B SaaS workflow software companies offering analytics or business intelligence for SMB and mid-market.",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.query).toContain("workflow software");
    }
  });

  it("rejects empty demoHint", () => {
    expect(buildCrustdataQuery({ mode: RunMode.Demo, demoHint: "  " }).ok).toBe(false);
  });

  it("expands Full template from category and feature", () => {
    const r = buildCrustdataQuery({
      mode: RunMode.Full,
      category: "Workflow / project operations SaaS",
      featureTitle: "AI analytics",
      featureDescription: "Premium add-on dashboards for mid-market teams",
      geography: "US",
      competitors: ["Acme Analytics"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.query).toContain("Workflow / project operations SaaS");
      expect(r.query).toContain("AI analytics");
      expect(r.query).toContain("US");
      expect(r.query).toContain("Acme Analytics");
    }
  });
});

describe("marketResearch default", () => {
  it("accepts snapshot without marketResearch", () => {
    expect(epistemicSnapshotSchema.safeParse(emptyEpistemicSnapshot()).success).toBe(true);
  });

  it("accepts crustdata ran metadata", () => {
    const snap = emptyEpistemicSnapshot();
    snap.marketResearch = {
      crustdata: {
        status: "ran",
        query: "B2B SaaS",
        ranAt: "2026-10-12T00:00:00.000Z",
        httpCallCount: 2,
        usedFallback: false,
        sourceMode: "recorded",
      },
    };
    expect(epistemicSnapshotSchema.safeParse(snap).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/crustdata-query.test.ts src/contracts/epistemic-snapshot.test.ts`

Expected: FAIL — `buildCrustdataQuery` missing / `marketResearch` unknown key (schema is `.strict()`).

- [ ] **Step 3: Write minimal implementation**

`buildCrustdataQuery`: Demo returns trimmed `demoHint` or `{ ok: false, error: "missing_demo_hint" }`. Full: if `!category?.trim()` return `{ ok: false, error: "missing_category" }`. Feature keywords = `[featureTitle, (featureDescription ?? "").slice(0, 80)].filter(Boolean).join(" ")`. Build:

```
`${category} companies` + (keywords ? ` related to ${keywords}` : "") + (geography?.trim() ? ` in ${geography.trim()}` : "") + (competitors?.length ? ` including ${competitors.join(", ")}` : "")
```

Schema: make epistemic snapshot **not** `.strict()` on the root **or** add optional `marketResearch: z.object({ crustdata: crustdataResearchStateSchema }).optional()`. Prefer adding the optional object and keep `.strict()`.

```typescript
export const crustdataResearchStateSchema = z.object({
  status: z.enum(["idle", "ran", "fallback", "failed"]),
  query: z.string(),
  ranAt: z.string().datetime().optional(),
  httpCallCount: z.number().int().nonnegative(),
  usedFallback: z.boolean(),
  sourceMode: z.enum(["live", "recorded", "fallback", "none"]),
  error: z.string().max(200).optional(),
});
```

`emptyEpistemicSnapshot` may omit `marketResearch`.

Export new symbols from `client.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/crustdata-query.test.ts src/contracts/epistemic-snapshot.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/crustdata-query.ts packages/domain/src/crustdata-query.test.ts packages/domain/src/contracts/epistemic-snapshot.ts packages/domain/src/contracts/epistemic-snapshot.test.ts packages/domain/src/client.ts
git commit -m "$(cat <<'EOF'
feat(domain): add Crustdata query template and research metadata

EOF
)"
```

---

### Task 2: Company DTO → Evidence mapper

**Files:**
- Create: `packages/domain/src/crustdata-map.ts`
- Create: `packages/domain/src/crustdata-map.test.ts`
- Modify: `packages/domain/src/client.ts`

**Interfaces:**
- Produces: `CrustdataCompany` type as spec §7; `mapCrustdataCompanyToEvidence(company, ctx: { sessionId: string; now: string; vendor: EvidenceVendor; sourceMode: "live" | "recorded" | "fallback" }): Evidence`; `isDemandAdjacent(fieldPaths: string[]): boolean` true if any path matches `/description|review|product/i`; `shouldProposeAnalyticsHypothesis(summaries: string[]): boolean` true if ≥2 match `/analytic|intelligence|dashboard/i`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { EvidenceVendor } from "./contracts/evidence";
import {
  isDemandAdjacent,
  mapCrustdataCompanyToEvidence,
  shouldProposeAnalyticsHypothesis,
} from "./crustdata-map";
import { findForbiddenPhrases } from "./forbidden-phrases";

const company = {
  crustdataCompanyId: "3552555",
  name: "Notion",
  website: "https://notion.com",
  description: "Workspace with analytics add-ons",
  industry: "Software",
  updatedAt: "2026-01-01T00:00:00.000Z",
  fieldPaths: ["basic_info.name", "basic_info.website", "basic_info.description"],
  raw: { crustdata_company_id: 3552555 },
};

describe("mapCrustdataCompanyToEvidence", () => {
  it("maps id, url, vendorTimestamp, demandAdjacent", () => {
    const ev = mapCrustdataCompanyToEvidence(company, {
      sessionId: "00000000-0000-4000-8000-000000000002",
      now: "2026-10-12T00:00:00.000Z",
      vendor: EvidenceVendor.Crustdata,
      sourceMode: "recorded",
    });
    expect(ev.externalId).toBe("3552555");
    expect(ev.canonicalUrl).toBe("https://notion.com");
    expect(ev.vendor).toBe("crustdata");
    expect(ev.demandAdjacent).toBe(true);
    expect(ev.retrievedAt).toBe("2026-10-12T00:00:00.000Z");
    expect(ev.rawPayloadRef).toBe(
      "data/crustdata-raw/00000000-0000-4000-8000-000000000002/3552555.json",
    );
    expect(findForbiddenPhrases(ev.summary)).toEqual([]);
  });

  it("does not invent website; notes not provided", () => {
    const ev = mapCrustdataCompanyToEvidence(
      { ...company, website: undefined, fieldPaths: ["basic_info.name", "basic_info.website"] },
      {
        sessionId: "00000000-0000-4000-8000-000000000002",
        now: "2026-10-12T00:00:00.000Z",
        vendor: EvidenceVendor.Crustdata,
        sourceMode: "live",
      },
    );
    expect(ev.canonicalUrl).toBeUndefined();
    expect(ev.summary.toLowerCase()).toMatch(/not provided by crustdata/);
  });
});

describe("isDemandAdjacent / hypothesis", () => {
  it("flags description paths", () => {
    expect(isDemandAdjacent(["basic_info.description"])).toBe(true);
    expect(isDemandAdjacent(["metadata.updated_at"])).toBe(false);
  });

  it("needs two analytics-ish summaries", () => {
    expect(shouldProposeAnalyticsHypothesis(["analytics module", "business intelligence"])).toBe(true);
    expect(shouldProposeAnalyticsHypothesis(["analytics module"])).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/crustdata-map.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Use `newId()`, `EntitySource.Import`, `contractVersion: 1`. Summary lines (join with `\n`): `name`; industry if present; description sliced to 240 chars if present; website line or not-provided if `fieldPaths` includes `basic_info.website` and website missing. `vendorTimestamp` = updatedAt ?? indexedAt. Fallback vendor uses `identityKey` `fallback:crustdata:{sessionId}:{crustdataCompanyId}` and may omit `externalId` only if id missing — if id present keep `externalId`. Invalid website strings: omit `canonicalUrl` (wrap `new URL` in try/catch).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/crustdata-map.test.ts`

Expected: PASS. Then `pnpm --filter @ceo-sandbox/domain test`.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/crustdata-map.ts packages/domain/src/crustdata-map.test.ts packages/domain/src/client.ts
git commit -m "$(cat <<'EOF'
feat(domain): map Crustdata company DTOs to Evidence

EOF
)"
```

---

### Task 3: Recorded fixtures

**Files:**
- Create: `fixtures/crustdata/search-demo.json`
- Create: `fixtures/crustdata/enrich-sample.json`
- Create: `fixtures/crustdata/identify-crustdata.json`
- Create: `fixtures/crustdata/fallback-evidence.json`
- Create: `packages/domain/src/crustdata-fixtures.test.ts` (load + shape check only)

**Interfaces:**
- Produces: JSON committed, sanitized (names/ids/descriptions only). `search-demo.json` `{ "companies": [ { "crustdata_company_id", "basic_info": { "name", "website", "description" }, "taxonomy": { "professional_network_industry": "..." }, "metadata": { "updated_at", "indexed_at" } } ] }` with **3** companies, analytics-ish descriptions. `fallback-evidence.json` `{ "companies": [ { "crustdataCompanyId": "fallback-1", "name": "Example workflow vendor", "description": "Illustrative fallback profile", "fieldPaths": ["basic_info.name"] } ] }` (already DTO-shaped). `identify-crustdata.json` `{ "matches": [ { "crustdata_company_id": "crustdata", "primary_domain": "crustdata.com" } ] }`.

- [ ] **Step 1: Write the failing test**

```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

function load(name: string) {
  return JSON.parse(
    readFileSync(join(__dirname, "../../../fixtures/crustdata", name), "utf8"),
  );
}

describe("crustdata fixtures", () => {
  it("search-demo has three companies with ids", () => {
    const doc = load("search-demo.json");
    expect(doc.companies).toHaveLength(3);
    for (const c of doc.companies) {
      expect(c.crustdata_company_id).toBeTruthy();
      expect(c.basic_info.name).toBeTruthy();
    }
  });
});
```

Use a path that works from `packages/domain/src` (`../../../fixtures/crustdata`). If the test file lives in domain, that relative path is correct for this repo.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/crustdata-fixtures.test.ts`

Expected: FAIL — ENOENT.

- [ ] **Step 3: Write the fixture files**

Invent **fictional** company names (do not copy proprietary dumps). Keep descriptions short. Include `analytic` or `intelligence` in at least two descriptions so the hypothesis helper can fire.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/crustdata-fixtures.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add fixtures/crustdata packages/domain/src/crustdata-fixtures.test.ts
git commit -m "$(cat <<'EOF'
chore: add sanitized Crustdata replay fixtures

EOF
)"
```

---

### Task 4: Adapters (fixture + mocked live)

**Files:**
- Create: `apps/web/lib/crustdata/types.ts`
- Create: `apps/web/lib/crustdata/normalize.ts` (vendor search row → `CrustdataCompany`)
- Create: `apps/web/lib/crustdata/adapter.ts`
- Create: `apps/web/lib/crustdata/adapter.test.ts`

**Interfaces:**
- Produces: `CrustdataAdapter` `{ identify(domain: string): Promise<{ companyId: string; primaryDomain: string } | null>; search(query: string): Promise<CrustdataCompany[]>; enrich(id: string): Promise<CrustdataCompany | null> }`; `createFixtureAdapter(rootDir: string): CrustdataAdapter`; `createLiveAdapter(opts: { apiKey: string; fetchFn?: typeof fetch; sleep?: (ms: number) => Promise<void> }): CrustdataAdapter`. Live: POST `https://api.crustdata.com/company/{identify|search|enrich}`, headers as Global Constraints, 8s `AbortSignal.timeout(8000)` (or `AbortController` + fake timers in tests). 2 retries on 5xx/throw; no retry 401/403. Search body `{ "search": { "query": query }, "limit": 20, "fields": [ ...spec §6.2 ] }`. Identify body `{ "domains": [domain], "exact_match": true }`.

- [ ] **Step 1: Write the failing test**

Fixture: `createFixtureAdapter` with `join(process.cwd(), ...)` **or** pass absolute path to `fixtures/crustdata` resolved from repo root in the test (`join(__dirname, "../../../../../fixtures/crustdata")` — compute once; if wrong, fix to the real relative path from `apps/web/lib/crustdata`). `search("anything")` returns 3 companies with `crustdataCompanyId`.

Live: mock `fetchFn` that records `url` + `headers.get("authorization")` + `headers.get("x-api-version")`, returns `{ companies: [] }` 200. Expect URL `https://api.crustdata.com/company/search` and `Bearer test-key` and `2025-11-01`. Second test: first 500 then 200 → one retry. Third: 401 → throw or return sentinel that orchestrator maps to fallback (adapter should throw `CrustdataAuthError`).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ceo-sandbox/web exec vitest run lib/crustdata/adapter.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`normalizeSearchRow(raw: unknown): CrustdataCompany | null` — read `crustdata_company_id` (number or string), `basic_info.*`, `metadata.*`, `taxonomy.professional_network_industry`. Null if no id.

Put `CrustdataAuthError` in `apps/web/lib/crustdata/errors.ts` (`name: "CrustdataAuthError"`).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ceo-sandbox/web exec vitest run lib/crustdata/adapter.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/crustdata
git commit -m "$(cat <<'EOF'
feat(web): add Crustdata live and fixture adapters

EOF
)"
```

---

### Task 5: `runCrustdataResearchPath`

**Files:**
- Create: `apps/web/lib/crustdata/run-path.ts`
- Create: `apps/web/lib/crustdata/run-path.test.ts`
- Create: `apps/web/lib/crustdata/raw-files.ts` (`writeRawPayload(repoRoot, ref, json)` — in tests use tmpdir)

**Interfaces:**
- Consumes: adapter, `buildCrustdataQuery`, `mapCrustdataCompanyToEvidence`, `validateEpistemicSnapshot`, `CLAIM_SAFETY_COPY`, `shouldProposeAnalyticsHypothesis`.
- Produces: `runCrustdataResearchPath(input: { snapshot: EpistemicSnapshot; intake: IntakeDraftPartial; sessionId: string; now: string; mode: RunMode; demoHint?: string; adapter: CrustdataAdapter; enrichEnabled: boolean; fallbackCompanies: CrustdataCompany[]; writeRaw: (ref: string, raw: unknown) => void; nowMs: () => number; deadlineMs: number }): { snapshot: EpistemicSnapshot }`.

Rules: clone snapshot (do not mutate caller). If `marketResearch.crustdata.status` is `ran` or `fallback`, return input snapshot unchanged. Build query; if `!ok` set status `failed` and error, return. Loop with `logicalCalls` + `nowMs() > deadlineMs`. Identify if domain set (validate primary domain). Search. If empty and logicalCalls allow, one refine search using category-only query. Take 5. Enrich each if `enrichEnabled`. Map + append evidence. Append disclaimers. Maybe hypothesis. Set `sourceMode: live|recorded` from adapter tag — **pass `adapter.kind: "live" | "fixture"`**. Fixture success → `recorded`, `status: ran`, `usedFallback: false`. On `CrustdataAuthError` or unrecoverable: map `fallbackCompanies` with `vendor: fallback`, `status: fallback`, `sourceMode: fallback`, `usedFallback: true`. Never remove existing evidence. `httpCallCount` = logical calls actually issued (0 for pure fallback after identify/search never ran).

- [ ] **Step 1: Write the failing test**

Use fixture adapter + empty Full snapshot from `emptyEpistemicSnapshot()` + complete intake. Assert evidence length 3, all `vendor: crustdata`, demo_fixture row preserved if pre-seeded, `status: ran`, `sourceMode: recorded`, second invocation unchanged length. Auth-throwing adapter → fallback vendor, `status: fallback`. Fake adapter returning 10 companies → only 5 mapped.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ceo-sandbox/web exec vitest run lib/crustdata/run-path.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Implement the loop exactly as spec §6. `deadlineMs` default `nowMs() + 30_000` in the route; tests pass a large deadline.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ceo-sandbox/web exec vitest run lib/crustdata/run-path.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/crustdata/run-path.ts apps/web/lib/crustdata/run-path.test.ts apps/web/lib/crustdata/raw-files.ts
git commit -m "$(cat <<'EOF'
feat(web): run the bounded Crustdata research path

EOF
)"
```

---

### Task 6: Frozen epistemic apply + POST + health

**Files:**
- Modify: `packages/db/src/sessions.ts` (`applyEpistemicSnapshot`)
- Modify: `packages/db/src/sessions.test.ts`
- Modify: `packages/db/src/index.ts`
- Create: `apps/web/app/api/sessions/[id]/research/crustdata/route.ts`
- Create: `apps/web/app/api/sessions/[id]/research/crustdata/route.test.ts`
- Create: `apps/web/app/api/health/crustdata/route.ts`
- Create: `apps/web/app/api/health/crustdata/route.test.ts`
- Create: `apps/web/lib/crustdata/select-adapter.ts` (`live` iff key && `CRUSTDATA_LIVE === "1"`)

**Interfaces:**
- Produces: `applyEpistemicSnapshot(id, snapshot)` — throws if session missing; throws `FrozenSessionError` if **not** frozen (only frozen may apply); parses `epistemicSnapshotSchema`; UPDATE `epistemic_json` + `updated_at` only. POST research: 404/409/200 as spec. Health: fixture `{ ok: true, live: false }` when not live; live attempts search limit 1 (mock in tests).

- [ ] **Step 1: Write the failing test**

DB: create/approve/start then `applyEpistemicSnapshot` changes evidence; `updateIntake` still throws frozen; `applyEpistemicSnapshot` on draft throws.

API: unfrozen POST 409; after start, POST 200 with `epistemic.marketResearch.crustdata.status` `ran` or `fallback` depending on env (force fixture in test by deleting `CRUSTDATA_LIVE`); second POST evidence length unchanged.

Health: `GET` 200 `live: false` in test env.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @ceo-sandbox/db test` and `pnpm --filter @ceo-sandbox/web exec vitest run app/api/sessions/[id]/research/crustdata/route.test.ts app/api/health/crustdata/route.test.ts`

Expected: FAIL — method/route missing.

- [ ] **Step 3: Write minimal implementation**

`runtime = "nodejs"` on both routes. Resolve fixtures via `path.join(process.cwd(), "fixtures/crustdata")` from `apps/web` **or** repo root — pick one and use it in tests (`process.cwd()` in vitest is `apps/web`; fixtures live at repo `fixtures/crustdata`. Resolve with `join(process.cwd(), "../../fixtures/crustdata")` from `apps/web`).

Raw writes: `join(resolveSqlitePath() dirname / ../../, rawPayloadRef)` under repo `data/`. `mkdirSync` recursive.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @ceo-sandbox/db test` and `pnpm --filter @ceo-sandbox/web test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/sessions.ts packages/db/src/sessions.test.ts packages/db/src/index.ts apps/web/app/api/sessions/[id]/research/crustdata apps/web/app/api/health/crustdata apps/web/lib/crustdata/select-adapter.ts
git commit -m "$(cat <<'EOF'
feat(web): persist Crustdata research on frozen sessions

EOF
)"
```

---

### Task 7: Frozen page button and banners

**Files:**
- Create: `apps/web/components/session/CrustdataResearch.tsx`
- Modify: `apps/web/app/session/[sessionId]/page.tsx`
- Modify: `packages/domain/src/epistemic-view.ts` (if needed: surface `sourceMode` / recorded banner strings)
- Modify: `packages/domain/src/epistemic-view.test.ts`

**Interfaces:**
- Produces: Button **Retrieve competitor signals**; POST then refresh session JSON. Disabled when status `ran`/`fallback` (label **Already retrieved**). `failed` allows retry. Banners from spec §10. Expandable query. Footer **Data from Crustdata.** under crustdata vendor cards. Do not hide demo illustrative row.

- [ ] **Step 1: Write the failing test**

Extend `epistemic-view.test.ts`: snapshot with `sourceMode: recorded` → view model `recordedBanner: "Recorded Crustdata response (dev/demo)"`; `fallback` → `fallbackBanner: "Fallback market context (not Crustdata)"`; `idle` → both null.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/epistemic-view.test.ts`

Expected: FAIL — fields missing.

- [ ] **Step 3: Write minimal implementation**

Add `recordedBanner` / `fallbackBanner` / `querySubmitted` to `buildEpistemicViewModel`. Wire `CrustdataResearch` as a client component: `busy` state, `role="alert"` on errors, `fetch` POST `/api/sessions/${id}/research/crustdata`.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @ceo-sandbox/domain exec vitest run src/epistemic-view.test.ts` and `pnpm --filter @ceo-sandbox/web test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/epistemic-view.ts packages/domain/src/epistemic-view.test.ts apps/web/components/session/CrustdataResearch.tsx apps/web/app/session/[sessionId]/page.tsx
git commit -m "$(cat <<'EOF'
feat(web): retrieve competitor signals from the frozen session page

EOF
)"
```

---

### Task 8: Docs

**Files:**
- Modify: `.docs/subproblems/00-index.md`
- Modify: `README.md`
- Modify: `README.md` env section — document `CRUSTDATA_API_KEY` and `CRUSTDATA_LIVE` (never commit values)

- [ ] **Step 1:** Add SP-05 spec + plan row (table currently has SP-01–SP-03; after SP-04 docs task it also has SP-04). Insert SP-05: spec `.docs/specs/SP-05-crustdata-market-research.md`, plan `docs/superpowers/plans/2026-10-12-sp05-crustdata-market-research.md`.

- [ ] **Step 2:** README links + env bullets.

- [ ] **Step 3: Commit**

```bash
git add .docs/subproblems/00-index.md README.md
git commit -m "$(cat <<'EOF'
docs: link SP-05 Crustdata spec and plan

EOF
)"
```

---

### Task 9: Manual browser verification

**Files:** none required.

- [ ] **Step 1:** `pnpm test` at repo root → PASS.

- [ ] **Step 2:** `pnpm --filter @ceo-sandbox/web dev` (fixture mode, do not set `CRUSTDATA_LIVE`):

  1. Demo → wizard → recap → Approve → Start → frozen page shows illustrative Observed. Click **Retrieve competitor signals** → recorded banner, query expandable, Crustdata cards, demand disclaimer, demo row still present. Second click disabled / no duplicate companies.
  2. Full session freeze → retrieve still works (template query).
  3. Unfrozen PATCH still 409; research POST on a draft session 409.
  4. GET `/api/health/crustdata` → `live: false`, `ok: true`.

If live verification is needed, operator sets env locally; do not put the key in git.

- [ ] **Step 3:** Commit only if fixes: `fix(web): crustdata verification follow-ups`

---

## Self-review

| Spec section | Task |
|--------------|------|
| §1 clarifications | Global constraints |
| §3–4 HTTP | 6, 7 |
| §6 path | 4, 5 |
| §7 mapping | 2, 5 |
| §8 metadata | 1 |
| §9 fixtures | 3, 4 |
| §10 UI | 7 |
| §11 errors | 5, 6 |
| §12 tests | 1–6, 9 |

**Placeholder scan:** no TBD. Fixture directory path from `apps/web` is `../../fixtures/crustdata`.

**Type consistency:** `runCrustdataResearchPath`, `applyEpistemicSnapshot`, `buildCrustdataQuery`, `mapCrustdataCompanyToEvidence`, `CrustdataSourceMode` / `sourceMode` match the spec.

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-10-12-sp05-crustdata-market-research.md`.

**Execute SP-04 before SP-05.** Two execution options (per plan, in order):

**1. Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks

**2. Inline Execution** — run tasks in this session with executing-plans and checkpoints

Which approach?
