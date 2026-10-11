# SP-05 — Implementation spec (Crustdata market research)

**Status:** Locked from `05-crustdata-market-research.md` Q01–Q44 plus the clarifications in §1 (this design pass).  
**Depends on:** SP-01 (live vs fixture), SP-02 (`Evidence`), SP-03 (intake query inputs, `crustdataSearchHint` on the demo card), SP-04 (`epistemic_json`, `vendor`, demand-adjacent disclaimer).  
**Produces:** One frozen-session research path (REST or fixture), mapped Evidence appended to the snapshot, labeled fallback, health smoke.  
**Does not produce:** CEO agent loop, LLM-callable tools, Neatlogs, people/news/web-search endpoints, recommendation body, Playwright.

---

## 1. Clarifications (this pass — not silent defaults)

| Topic | Decision |
|--------|----------|
| **Build boundary** | Must-have research path **without** an agent. `runCrustdataResearchPath` is the function SP-10 will wrap. No Neatlogs. |
| **Trigger** | Frozen-page button **Retrieve competitor signals**. One completion per session (live **or** fallback). Later POST is idempotent 200 (no second live spend). Start stays fast. |
| **Fallback producer** | Checked-in sanitized fixtures. **No LLM** fallback this pass. |
| **Storage** | Extend `epistemic_json` with `marketResearch.crustdata`. Mapped rows in `evidence[]`. Raw files `data/crustdata-raw/{sessionId}/{crustdataId}.json` (`rawPayloadRef`). Query is metadata, not Observed. |
| **Demo Observed** | Do **not** delete or replace SP-04 `vendor: demo_fixture` rows. Crustdata/fallback rows **append**. |
| **Auth header** | Verified from [API introduction](https://docs.crustdata.com/openapi-specs/2025-11-01/introduction): `authorization: Bearer ${CRUSTDATA_API_KEY}`, `x-api-version: 2025-11-01`, `content-type: application/json`, base `https://api.crustdata.com`. |
| **Live switch** | Fixture unless **both** `CRUSTDATA_API_KEY` and `CRUSTDATA_LIVE=1`. Never send the key to the browser. |
| **Terms pending** | Do not block. Defaults: per-session in-memory cache TTL 24h, not shared across users; retain raw for session life; UI “Observed via Crustdata” + footer “Data from Crustdata.” |

---

## 2. Product behavior

Workflow step 2: after intake is frozen, the operator retrieves **external** company/competitor signals. Those signals are **Observed** only when a Crustdata field path backs them. They **do not prove demand**.

**Demo:** frozen page still shows the illustrative Observed row from SP-04. Click retrieve → live (if env) or fixture → additional cards labeled **Observed via Crustdata** or **Fallback market context (not Crustdata)**. Expandable **query submitted** (demo card `crustdataSearchHint`).

**Full:** same button; query from intake templates. Empty intake competitors is allowed (search-only path).

**Must-have visible:** company name, Observed label, `retrievedAt`, crustdata id, 2–3 fact bullets, optional website, footer **Data from Crustdata.** Demand-adjacent rows show `CLAIM_SAFETY_COPY.competitorNotDemand`.

---

## 3. Architecture

```text
Frozen /session/[id]
  → POST /api/sessions/:id/research/crustdata
       → 409 if status !== frozen
       → if marketResearch.crustdata.status in {ran, fallback}: return snapshot
       → runCrustdataResearchPath({ intake, sessionId, now, clock })
            adapter.live | adapter.fixture
            identify? → search → enrich×≤5
            map → Evidence[] + optional Inferred disclaimers + Assumptions for unidentified names
            write raw files
            validateEpistemicSnapshot
            UPDATE epistemic_json
  → GET /api/health/crustdata  (startup log; does not block listen)
```

| Piece | Responsibility |
|-------|----------------|
| `@ceo-sandbox/domain` | Query templates, Evidence mapping from a **normalized company DTO**, `marketResearch` schema, demandAdjacent helper. No `fetch`. |
| `apps/web/lib/crustdata/` | REST adapter, fixture adapter, stop-condition loop, raw file writer, `runCrustdataResearchPath`. Node runtime. |
| `@ceo-sandbox/db` | Persist updated `epistemic_json` on frozen sessions via a dedicated `applyEpistemicSnapshot(id, snapshot)` that **does not** unfreeze and **does not** allow intake PATCH. |
| `apps/web` | POST route, health route, frozen-page button + cards. |

Frozen intake PATCH remains 409. Epistemic **append** after freeze is an explicit store method used only by this research route (and later SP-10).

---

## 4. HTTP

| Method | Path | Effect |
|--------|------|--------|
| `POST` | `/api/sessions/:id/research/crustdata` | Run or replay path. Body empty. 404 unknown id; 409 not frozen; 200 snapshot (`sessionToJson`). `failed` (bad template / 4xx that is our bug) → 200 with `status: failed` and `error` message, **no** fallback rows. Transport/auth failures → fallback rows, `status: fallback`. |
| `GET` | `/api/health/crustdata` | `{ ok: boolean, live: boolean, detail: string }`. Fixture mode: `ok: true, live: false`. Live: Q42 smoke (`/company/search` limit 1, fields `basic_info.name` + `crustdata_company_id`, query `"Crustdata"`). Does not require a session. |

Cookie unchanged. No client-side calls to `api.crustdata.com`.

---

## 5. Env

| Name | Meaning |
|------|---------|
| `CRUSTDATA_API_KEY` | Server-only Bearer token. Gitignored `.env`. |
| `CRUSTDATA_LIVE` | `"1"` to use REST. Any other value or unset → fixtures. |

CI has no key → fixture. Do not commit keys.

---

## 6. Research path (concrete)

**Stop:** whichever first — 5 companies mapped, 8 HTTP calls, 30s wall clock, or empty `companies[]` after the allowed refine.

**HTTP calls in one run (max 8):** optional 1 identify + 1 search + up to 5 enrich + **at most 1** refined search if the first search returns empty or validator flags off-topic (zero companies with a `crustdata_company_id`). No pagination cursors.

### 6.1 Identify (optional)

If `intake.company.domain` is a non-empty string:

`POST /company/identify` body `{ "domains": ["<domain>"], "exact_match": true }`.

Accept the match only when returned `primary_domain` (or equivalent primary website host) equals the intake domain **case-insensitive, ignore leading `www.`**. Otherwise record Unknown/Inferred gap; do not treat unrelated Notion-hosted pages as the company (Appendix B caveat).

### 6.2 Search

`POST /company/search` with ranked `search.query` and `limit` ≤ 20.

**Demo query:** exact string from demo card `crustdataSearchHint` (already on `fixtures/demo/decision-card-ai-analytics.json`). Persist that string on `marketResearch.crustdata.query`.

**Full query:** only via templates (Q28). Slots:

```text
{product_category}   ← company.category
{feature_keywords}   ← feature.title + first 80 chars of feature.description
{geography}          ← company.geography or omitted
{user_competitors}   ← company.competitors joined with ", " or omitted
```

Template (exact):

```text
{product_category} companies{? related to {feature_keywords}}{? in {geography}}{? including {user_competitors}}
```

Implement as deterministic concatenation, not an LLM. **Reject** (status `failed`, no HTTP, no fallback) if the assembled query is empty or if a caller passes a `query` field that is not this expansion.

**Search `fields` (validated Q06):** `basic_info.name`, `basic_info.website`, `basic_info.description`, `taxonomy.professional_network_industry`, `metadata.updated_at`, `metadata.indexed_at`, `crustdata_company_id`. Do not request `taxonomy.industry` or top-level `updated_at`.

Optional filters (`taxonomy` / geography) **only** when intake provides geography or segment; otherwise global ranked search.

### 6.3 Enrich

If health/account (or fixture flag) says enrich enabled: `POST /company/enrich` for each of the top **K=5** ids. If enrich is disabled on the key, skip enrich (0 of the 8-call budget) and map from search fields only.

### 6.4 User-named competitors

For each `intake.company.competitors[]` name, `identify` with name **only if** an HTTP slot remains **and** we have not already hit K=5. Fail identify → Assumption Claim `owner: user`, `rationaleTag: user_provided`, `status: active`, statement `User-named competitor {name} not found in Crustdata.` Not Observed.

---

## 7. Mapping

Normalized DTO (adapter output, not vendor-shaped):

```text
CrustdataCompany
  crustdataCompanyId: string
  name: string
  website?: string
  description?: string
  industry?: string
  updatedAt?: string
  indexedAt?: string
  fieldPaths: string[]
  raw: unknown
```

Each company → one Evidence:

| Field | Value |
|-------|--------|
| `vendor` | `crustdata` if live or **recorded live-shaped** fixture used as success; `fallback` if fallback fixture after failure |
| `externalId` | `crustdataCompanyId` |
| `canonicalUrl` | `website` if it parses as URL; else omit |
| `identityKey` | omit when `externalId` present; fallback rows `fallback:crustdata:{sessionId}:fallback` (one row) or per-company `fallback:crustdata:{sessionId}:{id}` |
| `retrievedAt` | `now` |
| `vendorTimestamp` | `updatedAt` or `indexedAt` |
| `fieldPaths` | paths actually present |
| `demandAdjacent` | true if description / product / reviews-like paths present |
| `source` | `EntitySource.Import` |
| `sessionId` | session |
| `summary` | deterministic bullets: name; industry if present; one-line description if present; “website not provided by Crustdata” **only** when we requested website and value is missing. Max 2000 chars. |
| `rawPayloadRef` | relative `data/crustdata-raw/{sessionId}/{crustdataCompanyId}.json` |
| `quarantine` | true only if identity missing (must not happen for mapped companies) |

**Recorded success fixtures** (happy-path local replay): `vendor: crustdata` but UI must still be honest when `CRUSTDATA_LIVE` is off — show chip **Observed via Crustdata** **and** a session-level note **Recorded Crustdata response (dev/demo)** from `marketResearch.crustdata.usedFallback === false` && `live === false` (store `sourceMode: live | recorded | fallback` on metadata).

Use `sourceMode`:

- `live` — real HTTP 200 mapped
- `recorded` — fixture replay of a successful search (not a failure fallback)
- `fallback` — failure path fixture

UI: `live`/`recorded` company cards use **Observed via Crustdata**; `recorded` adds the recorded banner; `fallback` uses **Fallback market context (not Crustdata)** and `vendor: fallback`. Fallback rows are **not** Observed competitor facts (Q37): they are labeled ungrounded; recommendation later must list missing Observed market evidence. In this SP, still persist them so the button has a visible outcome, with `vendor: fallback` so they never look like Crustdata.

**Inferred disclaimer:** for each new `demandAdjacent` Evidence, append `inferenceSchema` `{ statement: CLAIM_SAFETY_COPY.competitorNotDemand, refIds: [id] }` if that evidence id is not already in an inference `refIds`.

**Market pattern:** optional one Hypothesis `Several searched companies list analytics-related product language.` with `owner: system`, `rationaleTag: missing_evidence`, `resolution: open`, **only** if ≥2 crustdata Evidence summaries match `/analytic|intelligence|dashboard/i`. Never Observed.

---

## 8. Snapshot metadata

Additive on `epistemicSnapshotSchema` (optional with default):

```text
marketResearch?: {
  crustdata: {
    status: idle | ran | fallback | failed
    query: string
    ranAt?: ISO-8601
    httpCallCount: number
    usedFallback: boolean
    sourceMode: live | recorded | fallback | none
    error?: string   // failed/fallback reason, ≤200 chars
  }
}
```

Default when missing: treat as `idle`, `sourceMode: none`, `query: ""`, `httpCallCount: 0`.

SP-04 projection may omit `marketResearch` (idle). Research path sets it.

---

## 9. Adapters and fixtures

**Live adapter:** `fetch` POST with headers in §1. Timeouts: 8s per call. Retries: 2 on 5xx/timeout, exponential backoff 200ms then 800ms. No retry on 401/403. 429: wait once (~1s) then fallback if still blocked. Count each HTTP attempt against the 8-call cap **after** retries for that logical call? **Count logical calls** (identify/search/enrich), not retry attempts, so retries cannot burn the whole budget. Wall clock still 30s.

**Fixture adapter:** read `fixtures/crustdata/`:

| File | Role |
|------|------|
| `search-demo.json` | Recorded search for the demo hint (happy path) |
| `enrich-sample.json` | Optional enrich payloads keyed by id |
| `identify-crustdata.json` | Health/identify sample |
| `fallback-evidence.json` | Mapped fallback companies (no pretence of live ids required) |

Sanitize: no emails, no unused PII. Commit these (unlike raw session dumps).

**Raw dumps** under `data/crustdata-raw/` gitignored (add `data/` already gitignored from SP-03).

**In-memory cache:** Map keyed by `endpoint + canonical JSON body`, TTL 24h, **per Node process**, not shared across users/sessions in a store. Skip cache in tests (inject clock / empty cache).

---

## 10. UI

On `/session/[sessionId]` (frozen):

- Button **Retrieve competitor signals** enabled iff `status === frozen` and crustdata `status` is `idle` or missing. Disabled with “Already retrieved” when `ran`/`fallback`. On `failed`, allow **one retry** (status stays failed until success/fallback).
- Expandable **Search query used** showing `query` + label **query submitted**.
- Banner when `sourceMode === recorded`: **Recorded Crustdata response (dev/demo)**.
- Banner when `sourceMode === fallback`: **Fallback market context (not Crustdata)**.
- Cards from `buildEpistemicViewModel` (SP-04) — already chips by vendor. Add crustdata id + 2–3 bullets from `summary` split on newlines.
- Footer under Crustdata cards: **Data from Crustdata.**
- Keep illustrative demo row.

---

## 11. Errors

| Case | Behavior |
|------|----------|
| Not frozen | 409 |
| Unknown id | 404 |
| Already `ran` or `fallback` | 200 current snapshot, no HTTP |
| Missing key but `CRUSTDATA_LIVE=1` | Treat as auth failure → fallback |
| 401/403 | fallback |
| 5xx/timeout after retries | fallback |
| 4xx bad request from our template | `failed`, no fallback, message |
| Empty companies | optional one refine search; then Unknown “No companies returned by Crustdata.” continue; `status: ran` with 0 crustdata Evidence |
| Malformed JSON | fallback if unrecoverable |
| Snapshot validate fail | 500, **do not** write; previous snapshot remains |
| DB down | 500 |

---

## 12. Testing (SP-05)

Vitest. No Playwright. After implementation, browser-check: freeze Demo → retrieve (fixture) → cards + recorded banner + query + disclaimer; second click does not duplicate rows; Full freeze → retrieve; health fixture `{ live: false }`.

- **Domain:** template expansion; mapper missing fields; demandAdjacent; fallback vendor ≠ crustdata; pattern hypothesis only when ≥2 matches.
- **Adapter:** fixture search returns DTO; live adapter unit-tested with mocked `fetch` (headers include Bearer + `x-api-version: 2025-11-01`); retry/backoff; 401 → fallback path.
- **Stop:** 5 company cap; 8 logical-call cap.
- **API:** 409 unfrozen; idempotent second POST; Start still has `epistemic` without crustdata until retrieve.
- **Health:** fixture ok.

---

## 13. Out of scope

- Agent tools `crustdata_identify_company` as LLM tools (SP-10 wraps `runCrustdataResearchPath`)
- Neatlogs (SP-11)
- People, jobs, social, live web search, batch_*, technographics
- Pagination `next_cursor`
- LLM-generated fallback
- Replacing demo_fixture Evidence
- Recommendation “does not prove demand” paragraph beyond Evidence-level inference
- Shared cross-user cache / Redis
- Exact legal attribution beyond §1 copy

---

## 14. Traceability

| Source | Role |
|--------|------|
| `.docs/subproblems/05-crustdata-market-research.md` | Q01–Q44, Appendix B |
| This spec §1 | Design-pass clarifications |
| [Crustdata API introduction](https://docs.crustdata.com/openapi-specs/2025-11-01/introduction) | Base URL, Bearer, version header |
| `.docs/specs/SP-04-evidence-assumptions-uncertainty.md` | Snapshot, vendor, disclaimer |
| `fixtures/demo/decision-card-ai-analytics.json` | `crustdataSearchHint` |
