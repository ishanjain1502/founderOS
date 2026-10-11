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

## Questions

### Product verification

**SP-05-Q01.** Do we already have Crustdata access (account, keys, docs, sandbox vs production)?

**SP-05-Q02.** What official docs URL or OpenAPI/spec are we required to treat as source of truth?

**SP-05-Q03.** Which Crustdata product surface is in scope: REST API, MCP, web app export, CSV, something else?

**SP-05-Q04.** What operations does that surface actually support today for: company search, company profile, competitor discovery, news/signals, people, funding, technographics, other?

**SP-05-Q05.** Which of those operations are we **allowed** to use under hackathon and vendor terms?

**SP-05-Q06.** What fields does a company profile actually return? List from the vendor, not from memory.

**SP-05-Q07.** Does Crustdata return sources and timestamps? For which fields?

**SP-05-Q08.** What are rate limits, quotas, latency, and cost per call?

**SP-05-Q09.** Is caching of Crustdata responses allowed by terms?

**SP-05-Q10.** How long may we retain vendor data?

**SP-05-Q11.** Are we required to display attribution to Crustdata? Exact copy?

### Research path

**SP-05-Q12.** What is the single must-have research path in concrete steps (example: search competitors of X → fetch profiles → stop)?

**SP-05-Q13.** Who defines “relevant competitor”: the user (list of names), the agent, a frozen demo list, Crustdata’s own similar-company feature, or a mix?

**SP-05-Q14.** If the user must supply competitor names, is that part of intake (SP-03)?

**SP-05-Q15.** How many companies may be fetched in v1 (cap)?

**SP-05-Q16.** What is the stop condition: N companies, N calls, N seconds, first empty page, operator interrupt, or another rule?

**SP-05-Q17.** May the agent issue follow-up Crustdata calls based on first results, or is the path a fixed chain?

**SP-05-Q18.** What query is used for the AI-analytics demo, exactly, once product context is defined in SP-03?

**SP-05-Q19.** What geography, company-size, or industry filters are required or forbidden?

**SP-05-Q20.** How do we handle companies that are not in Crustdata?

### Mapping and storage

**SP-05-Q21.** Do we persist the raw vendor payload, a mapped subset, or both?

**SP-05-Q22.** Which vendor fields map to our Evidence object (after SP-02 is answered)?

**SP-05-Q23.** What do we store when a field is missing?

**SP-05-Q24.** How do we represent “possible market patterns” without storing them as evidence?

**SP-05-Q25.** Do we store a human-readable summary plus the structured evidence, or only structured evidence?

**SP-05-Q26.** If two fetches of the same company disagree, which is kept?

### Agent tool contract

**SP-05-Q27.** What tools does the agent get: `search_companies`, `get_company`, a single `research_market`, or another set?

**SP-05-Q28.** May the agent choose arbitrary query strings, or only fill approved templates?

**SP-05-Q29.** Must tool outputs be truncated before the model sees them? To what size?

**SP-05-Q30.** Is the agent allowed to retry failed calls? How many times? (Also SP-10, SP-11.)

### Demo and UI

**SP-05-Q31.** What must appear on screen as proof that Crustdata was used (company cards, raw JSON, source links, timestamps, vendor logo)?

**SP-05-Q32.** Must the audience see the query as well as the results?

**SP-05-Q33.** If results are boring or off-topic live, is that acceptable, or must we have a known-good query?

**SP-05-Q34.** Is a recorded/canned Crustdata response allowed if labeled, or must it be live?

### Failure and fallback

**SP-05-Q35.** What happens on auth failure, timeout, 4xx, 5xx, empty result, malformed JSON?

**SP-05-Q36.** What is the labeled fallback artifact (fixture file, screenshot, narrator apology, disabled research step)?

**SP-05-Q37.** If fallback is used, may the agent still produce a recommendation, or must it stop?

**SP-05-Q38.** If fallback is used, must every downstream claim that depended on Crustdata be marked as ungrounded?

### Claim safety specific to Crustdata

**SP-05-Q39.** What competitor facts are allowed to be restated as facts (example: “Company X lists an analytics product”)?

**SP-05-Q40.** What language must follow every competitor mention in the recommendation?

**SP-05-Q41.** Are news-like signals treated the same as profile fields?

### Testing

**SP-05-Q42.** What is the smoke test for Crustdata, exactly, and when is it run?

**SP-05-Q43.** Do we need a replay fixture for development so we are not paying for every local run?

**SP-05-Q44.** Who is responsible for verifying endpoints *before* other implementation work?
