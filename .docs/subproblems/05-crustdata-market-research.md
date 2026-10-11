# SP-05 — Crustdata market research

## Why this is a subproblem

Workflow step 2 and must-have: one Crustdata research path. Crustdata is the spec’s source of **external** company and competitor signals. It is also the spec’s example of a tool that is easy to misuse as proof of demand.

The spec itself says exact fields and endpoints must be verified early. Until that verification exists, any concrete API design would be an assumption.

## Discussion

Crustdata’s planned use in the spec:

- Search for relevant competitors and comparable companies.
- Retrieve available company profiles and other supported signals.
- Compare the competitive landscape and identify possible market patterns.
- Attach sources and timestamps to findings where available.

Limitations in the spec:

- Does not directly prove customer demand or willingness to pay.
- Exact fields and endpoints must be verified early.
- Agent must not infer that a competitor signal proves the feature will succeed.

So the implementation problem is not “call Crustdata.” It is:

1. **Verify** what Crustdata actually offers for this hackathon.
2. **Bound** one research path that is visible in the demo.
3. **Map** payloads into Evidence objects (SP-02) with provenance (SP-04).
4. **Stop** the agent from over-claiming.
5. **Fallback** if the product is down, rate-limited, or empty (SP-14), labeled.
6. **Show** the contribution so the product does not feel bolted on (SP-13, section 10).

“One Crustdata research path” could mean one query, one competitor list, one company lookup, or a short chain (search then fetch profiles). The spec does not choose.

“Relevant” competitors depends on intake (SP-03): industry, product category, feature category. If the existing product is only “B2B SaaS,” search quality is unspecified.

Market “patterns” are inferences, not evidence. If the agent says “the market is moving toward AI analytics,” that sentence is a hypothesis unless Crustdata returned that statement as a sourced field.

Auth, billing, rate limits, allowed environments, and data-retention rules are unnamed. Those are blocking for “to the very end,” not polish.

The demo beat is: “Show real evidence: the agent retrieves relevant competitor signals through Crustdata.” That requires a live or clearly labeled recorded retrieval. Which of those is allowed is a SP-01/SP-14 question, restated here because it changes this integration.

## What “implemented to the end” would require

1. Verified account, auth method, base URL, and terms of use.
2. Verified list of endpoints/fields actually used (not hoped).
3. A defined research path: trigger, queries, pagination, stop condition.
4. Query construction from Decision/company/feature (or a frozen query for the demo).
5. Mapping: vendor payload → Evidence items with source/time or explicit missing provenance.
6. Deduplication and validation (deterministic).
7. Storage of raw and/or mapped evidence on the Decision state.
8. Agent tool interface: what the CEO agent is allowed to request, how many times, what it receives.
9. Failure modes: auth fail, timeout, empty, partial, malformed, rate limit.
10. Labeled fallback if live Crustdata cannot be used.
11. UI: what the human sees as “real evidence.”
12. Neatlogs: tool call inputs/outputs (SP-11).
13. Claim filter: no demand-proof language (SP-04).
14. Demo timing: this path must fit the 3–5 minute budget with other beats.

## Locked decisions (spec only)

- Purpose: external evidence about companies and competitors (section 4).
- Planned use bullets above (section 4).
- Limitations above (section 4).
- Must-have: one Crustdata research path (section 8).
- Demo beat: retrieve relevant competitor signals (section 9).
- Out of scope: treating competitor activity as proof of demand.
- Smoke-test this product at the beginning; fallbacks clearly labeled (section 10).
- Attach sources and timestamps where available.

## Dependencies

- Consumes: SP-01 (live vs stub), SP-02 (Evidence shape), SP-03 (what to search for), SP-04 (claim rules), SP-14 (cost/latency/fallback).
- Produces: Evidence items for SP-08, SP-09, SP-10, SP-13.
- Must be traced in SP-11.

## Verification status (living)

| Item | Status |
|------|--------|
| Public API shape (search / identify / enrich) | Verified via **Crustdata MCP** + docs (`2025-11-01`) — 2026-03-29 |
| Key entitlements | **`/company/search` enabled** (30 rpm), **`/company/enrich` enabled** (15 rpm); ranked `search` works on this key |
| Credits (sample run) | `company_search` limit 3 ≈ **0.39 credits**; `company_enrich` ×1 match = **2 credits**; `company_identify` = **0** |
| Account balance (sample) | ~**5,200 credits** (wallet mix: recurring + topup) |
| Rate limits (account) | Search **30 rpm**, enrich **15 rpm** (from `account_endpoints`) |
| Caching, retention, attribution copy | **Pending** formal terms read |

**Runtime surfaces:** Production app → **REST** with `CRUSTDATA_API_KEY` (`.env` / AWS secrets, gitignored). **Crustdata MCP** (`plugin-crustdata-crustdata`) for smoke tests, schema discovery, and agent dev — same underlying API via `callTool` inside `execute`.

**Identify caveat (verified):** `domains: ['notion.so']` without `exact_match` returns many unrelated Notion-hosted pages. Intake/repo domain must use **`exact_match: true`** and prefer **`primary_domain`** from user (e.g. `notion.com`).

## Questions

### Product verification

**SP-05-Q01.** Do we already have Crustdata access (account, keys, docs, sandbox vs production)?
**Yes** — API key + **Crustdata MCP** enabled. Store key as `CRUSTDATA_API_KEY` in `.env` / AWS secrets (never commit). Smoke test **passed** 2026-03-29 (MCP `execute` + `account_endpoints`).

**SP-05-Q02.** What official docs URL or OpenAPI/spec are we required to treat as source of truth?
**Primary:** [https://docs.crustdata.com](https://docs.crustdata.com) with pinned **`x-api-version: 2025-11-01`**. **OpenAPI:** [API introduction / OpenAPI specs](https://docs.crustdata.com/openapi-specs/2025-11-01/introduction). Company search: [Company Search](https://docs.crustdata.com/company-docs/search/introduction) + [reference](https://docs.crustdata.com/company-docs/search/reference). If docs and live response diverge, **live response wins**; file drift in Neatlogs.

**SP-05-Q03.** Which Crustdata product surface is in scope: REST API, MCP, web app export, CSV, something else?
**Shipped app:** **REST** (`https://api.crustdata.com`). **Also in scope for engineering:** **Crustdata MCP** (Cursor plugin) — smoke tests, `get_schema`, bounded `execute` scripts; not a substitute for server-side REST in production. No CSV/manual export path.

**SP-05-Q04.** What operations does that surface actually support today for: company search, company profile, competitor discovery, news/signals, people, funding, technographics, other?
**In scope for v1 path (indexed company API):**
- `POST /company/search` — filters, ranked `search.query`, pagination (`next_cursor`)
- `POST /company/identify` — domain/URL/name → `crustdata_company_id`
- `POST /company/enrich` — fuller profile (non-indexed groups per docs; **confirm on key**)

**Out of v1 must-have path:** live web search endpoints (often enterprise), people/jobs/social unless needed later. **Competitor discovery** = ranked search + optional user-named `identify`, not a separate “competitors” endpoint.

**SP-05-Q05.** Which of those operations are we **allowed** to use under hackathon and vendor terms?
**Verified on key (2026-03-29):** `company_search`, `company_identify`, `company_enrich` **enabled**. Batch/live/person endpoints **disabled** on plan — do not call. Still respect hackathon/sponsor rules + credit budget (SP-14).

**SP-05-Q06.** What fields does a company profile actually return? List from the vendor, not from memory.
See **Appendix B**. **Search `fields` (validated):** `basic_info.name`, `basic_info.website`, `basic_info.description`, `taxonomy.professional_network_industry`, `metadata.updated_at`, `metadata.indexed_at`, `crustdata_company_id`. **Invalid paths (400):** top-level `updated_at`, `indexed_at`, `taxonomy.industry` — use `metadata.*` and `taxonomy.professional_network_industry` or whole `taxonomy`. **Enrich** adds `headcount`, `funding`, `software_reviews`, `competitors`, etc. per plan field list (`account_endpoints`).

**SP-05-Q07.** Does Crustdata return sources and timestamps? For which fields?
**Timestamps:** `metadata.updated_at`, `metadata.indexed_at` on search/enrich when `metadata` requested; always set our **`retrievedAt`**. **Source URLs:** `basic_info.website`, `basic_info.professional_network_url`; technographics evidence URLs only on enrich if plan enabled (technographics **disabled** on this key’s enrich).

**SP-05-Q08.** What are rate limits, quotas, latency, and cost per call?
**Measured/sample:** search base **0.03 cr/result** (+ premium groups if requested); ranked search 3 results ≈ **0.39 cr**; enrich **2 cr/match** returned. **RPM:** search **30**, enrich **15**. **v1 run caps unchanged:** max **8** HTTP calls, **30s** wall clock for Crustdata phase. Instrument `X-Credits-Used` / MCP `credits_remaining` in Neatlogs.

**SP-05-Q09.** Is caching of Crustdata responses allowed by terms?
**Pending terms read.** **Engineering default:** in-memory cache **per Session**, TTL **24h**, keyed by endpoint + canonical request hash; **not** shared across users until terms allow. **Dev replay fixtures** (Q43) for local runs. Document decision in Appendix B after terms check.

**SP-05-Q10.** How long may we retain vendor data?
**Pending terms.** **v1 default:** retain **raw + mapped Evidence** for life of Session + export; **no public redistribution** of raw vendor payloads; export shows **summaries + ids**, not full vendor dump unless terms allow. Purge policy tied to open-source deploy docs when known.

**SP-05-Q11.** Are we required to display attribution to Crustdata? Exact copy?
**Pending terms/marketing.** **UI/report minimum:** “**Observed** via Crustdata” on evidence blocks + logo/name in integrations footer until vendor supplies exact copy. Update when legal/terms confirmed.

### Research path

**SP-05-Q12.** What is the single must-have research path in concrete steps (example: search competitors of X → fetch profiles → stop)?
**Must-have chain (one path):**
1. **Optional `identify`** — if user provided company domain (intake/repo); **`exact_match: true`**, validate `primary_domain` matches intake.
2. **`company/search`** — ranked query built from product category + feature keywords (template, Q28).
3. Take top **K** companies (`K=5` default).
4. **`company/enrich`** for each id **if enabled on key**; else search `fields` only.
5. Map each company to **≥1 Evidence** row + agent **Hypothesis/Inferred** for “patterns” (SP-05-Q24).
6. Stop (Q16).

**SP-05-Q13.** Who defines “relevant competitor”: the user (list of names), the agent, a frozen demo list, Crustdata’s own similar-company feature, or a mix?
**Mix:** **Agent + template** ranked search from intake (SP-03-Q34). **Optional user competitor names** in intake (optional field) → `identify` first. **Demo card** may include **1–2 seed competitor names** for stable demo. Agent may not invent company names as Observed without Crustdata id.

**SP-05-Q14.** If the user must supply competitor names, is that part of intake (SP-03)?
**Optional intake field** “known competitors (comma-separated)” — not required. If empty, search-only path still satisfies must-have.

**SP-05-Q15.** How many companies may be fetched in v1 (cap)?
**Max 5 companies** enriched (or returned from search if enrich unavailable) per Run. Search `limit` ≤ 20 on first page; only top 5 processed.

**SP-05-Q16.** What is the stop condition: N companies, N calls, N seconds, first empty page, operator interrupt, or another rule?
**Whichever comes first:** **5 companies mapped**, **8 HTTP calls**, **30s** wall clock on Crustdata phase, or **empty companies[]** (record Unknown, continue with fallback policy Q35).

**SP-05-Q17.** May the agent issue follow-up Crustdata calls based on first results, or is the path a fixed chain?
**Bounded agent:** **1** ranked search + up to **5** enrich + **optional 1** refined search **only if** first search empty or off-topic (validator triggers). No unbounded pagination. Follow-ups must reuse templates (Q28).

**SP-05-Q18.** What query is used for the AI-analytics demo, exactly, once product context is defined in SP-03?
**Demo card ranked `search.query` (example):** “B2B SaaS workflow software companies offering analytics or business intelligence features for SMB and mid-market customers.” Filters optional: `taxonomy.industry` / geography if demo card specifies. **Not hardcoded in code** as only query — demo **card JSON** holds text; Full mode builds from intake templates.

**SP-05-Q19.** What geography, company-size, or industry filters are required or forbidden?
**No forbidden regions in v1.** Apply filters **only when intake provides** geography or segment; otherwise global ranked search. Do not filter to fictional demo company’s country unless user set it.

**SP-05-Q20.** How do we handle companies that are not in Crustdata?
**Record Unknown** + **Inferred** gap; no fabricated Observed rows. Report states “competitor X not found in Crustdata.” User-named companies that fail `identify` stay as **Assumption** (“user-named competitor”) without vendor id.

### Mapping and storage

**SP-05-Q21.** Do we persist the raw vendor payload, a mapped subset, or both?
**Both** per Evidence: `rawPayloadRef` (blob/json) + mapped summary fields (SP-02 Evidence). Same pattern as finance (SP-02-Q28).

**SP-05-Q22.** Which vendor fields map to our Evidence object (after SP-02 is answered)?
One Evidence per **(company id, field group snapshot)** or per **company summary** for v1 simplicity: **`externalId`** = `crustdata_company_id`, **`canonicalUrl`** = website if present, **`summary`** = human-readable bullet of returned fields, **`vendorTimestamp`** = `updated_at`/`indexed_at`, **`fieldPaths[]`** included. Demand-adjacent fields (reviews, product descriptions) trigger SP-04-Q36 disclaimer.

**SP-05-Q23.** What do we store when a field is missing?
Store `null` with **`fieldPresent: false`** in mapped view; never interpolate. Report shows “not provided by Crustdata.”

**SP-05-Q24.** How do we represent “possible market patterns” without storing them as evidence?
**Hypothesis** or **Inferred** objects with `sourceRefs[]` pointing to Evidence ids. Never store patterns as Observed. Example: “Several competitors expose analytics modules” = **Inferred** from Evidence summaries.

**SP-05-Q25.** Do we store a human-readable summary plus the structured evidence, or only structured evidence?
**Both** — structured Evidence + **`summary`** string for UI/report (generated deterministically from field paths where possible, agent polish allowed as Inferred linked to same ids).

**SP-05-Q26.** If two fetches of the same company disagree, which is kept?
**Newer `retrievedAt` wins** for active view; older kept in history (same `crustdata_company_id`, new Evidence row). Dedup identity SP-02-Q07/Q08 on id, not on changing field values.

### Agent tool contract

**SP-05-Q27.** What tools does the agent get: `search_companies`, `get_company`, a single `research_market`, or another set?
**v1 tools:** `crustdata_identify_company`, `crustdata_search_companies`, `crustdata_enrich_company`. Orchestrator may expose single **`crustdata_run_research_path`** wrapper that executes Q12 chain deterministically; agent chooses **when** to invoke, not arbitrary HTTP.

**SP-05-Q28.** May the agent choose arbitrary query strings, or only fill approved templates?
**Templates only** — slots: `{product_category}`, `{feature_keywords}`, `{geography}`, `{user_competitors}`. Agent fills slots from intake; validator rejects free-form query strings outside template expansion.

**SP-05-Q29.** Must tool outputs be truncated before the model sees them? To what size?
**Yes.** Per company **≤ 2 KB** JSON/text after mapping; total Crustdata context **≤ 12 KB** per Run before summarization. Full raw in storage, not in prompt.

**SP-05-Q30.** Is the agent allowed to retry failed calls? How many times? (Also SP-10, SP-11.)
**Retries:** **2** retries on **5xx/timeout** with exponential backoff; **no retry** on **401/403** (fail to fallback). **429** → wait once + fallback if still blocked. Logged in Neatlogs.

### Demo and UI

**SP-05-Q31.** What must appear on screen as proof that Crustdata was used (company cards, raw JSON, source links, timestamps, vendor logo)?
**Evidence panel:** company **name**, **Observed** label, **retrievedAt**, **crustdata id**, **2–3 fact bullets**, optional website link. **Not** full raw JSON in demo mode. Footer: “Data from Crustdata.”

**SP-05-Q32.** Must the audience see the query as well as the results?
**Yes in recap/report**; **demo mode** may show collapsed “search query used” expandable. Ranked query text is **not** Observed — label as **query submitted**.

**SP-05-Q33.** If results are boring or off-topic live, is that acceptable, or must we have a known-good query?
**Live off-topic is acceptable** with honest report. **Demo mode** uses **demo card query** tuned for known-good results; presenter may use demo card for judging. Full mode shows what came back.

**SP-05-Q34.** Is a recorded/canned Crustdata response allowed if labeled, or must it be live?
**Demo / CI:** **fixture replay allowed** if labeled **“Recorded Crustdata response (dev/demo)”** and not mixed with live without label. **Hackathon demo default:** **live** when network up; fixture as backup (SP-01-Q08).

### Failure and fallback

**SP-05-Q35.** What happens on auth failure, timeout, 4xx, 5xx, empty result, malformed JSON?
| Condition | Behavior |
|-----------|----------|
| 401/403 | Stop Crustdata phase → **fallback** (Q36), Neatlogs error |
| 5xx/timeout | Retries (Q30) → fallback |
| 4xx (bad request) | Fix template/validator; **no fallback** if bug; user message |
| Empty `companies` | Continue run; Unknown + optional one refine search |
| Malformed JSON | Quarantine call; fallback if unrecoverable |

**SP-05-Q36.** What is the labeled fallback artifact (fixture file, screenshot, narrator apology, disabled research step)?
**SP-01-Q08:** LLM generates **fallback Evidence** with `source=fallback`, stable keys `fallback:crustdata:{runId}:{step}`, required JSON shape. UI: **“Fallback market context (not Crustdata)”**. Optional checked-in **fixture** for demos without network.

**SP-05-Q37.** If fallback is used, may the agent still produce a recommendation, or must it stop?
**May still recommend** — report must mark market section **ungrounded in Crustdata** and downgrade competitor claims to **Assumed/Inferred**. No Observed competitor facts from fallback.

**SP-05-Q38.** If fallback is used, must every downstream claim that depended on Crustdata be marked as ungrounded?
**Yes** for competitor/market **Observed** claims. Panel/finance/code paths may continue; recommendation **uncertainty** must list **missing Observed market evidence**.

### Claim safety specific to Crustdata

**SP-05-Q39.** What competitor facts are allowed to be restated as facts (example: “Company X lists an analytics product”)?
**Allowed as Observed** only when tied to Crustdata field paths in Evidence (description, software_reviews, taxonomy, public product text returned by API). **Not allowed:** demand, WTP, “customers love,” market share guesses.

**SP-05-Q40.** What language must follow every competitor mention in the recommendation?
**Demand-adjacent mentions:** SP-04-Q36 disclaimer (“does not prove demand for our feature”). All competitor facts: **Observed via Crustdata** + id. Patterns: **Inferred** with refs.

**SP-05-Q41.** Are news-like signals treated the same as profile fields?
**Same epistemic rules** if returned in API payload (Observed + timestamp/provenance). **v1 path** does not call separate news endpoints unless enabled and added post-verification. If absent, do not simulate news as Observed.

### Testing

**SP-05-Q42.** What is the smoke test for Crustdata, exactly, and when is it run?
**On app startup** and **before demo** (section 10): `account_credits` + `account_endpoints` path `/company/search` + `company_search` with `limit: 1`, `fields: ['basic_info.name','crustdata_company_id']`, ranked query `"Crustdata"` OR `company_identify` `domains: ['crustdata.com']`. **Pass:** search ok or identify match. **Dev:** same via Crustdata MCP `execute`. Record in Neatlogs + health UI. **CI:** fixture without key.

**SP-05-Q43.** Do we need a replay fixture for development so we are not paying for every local run?
**Yes.** `fixtures/crustdata/` recorded responses (gitignored if terms require; otherwise sanitized sample). Local dev defaults to **fixture** unless `CRUSTDATA_LIVE=1`.

**SP-05-Q44.** Who is responsible for verifying endpoints *before* other implementation work?
**Operator + implementing engineer** run smoke test and fill **Appendix B** before merging Crustdata-dependent agent logic. Agent work can proceed against fixtures in parallel.

## Appendix B — Post-smoke field & entitlement log (fill after key test)

```
Date: 2026-03-29
Method: Crustdata MCP execute (same API as REST)
/account/endpoints: /company/search enabled (30 rpm); /company/enrich enabled (15 rpm)
Ranked company_search (hybrid): OK — sample ids 4233970 Chanlogic, 62882632 P.P. Company, 64345064 Brief Insights
company_identify notion.com exact_match: OK — crustdata_company_id 3552555 Notion
company_enrich Notion: OK — headcount.total 7591 (2 credits)
Search field paths validated: metadata.updated_at, metadata.indexed_at, taxonomy.professional_network_industry (not taxonomy.industry)
Plan disabled on key: technographics, maps (enrich), batch_* endpoints, live search endpoints
Credits (after sample run): ~5197.61 remaining from ~5200 start
Attribution required copy: pending terms
Caching/retention terms note: pending
Demo query smoke: SP-03-Q18 ranked query returned 3 relevant B2B/analytics-ish companies (0.39 cr)
```
