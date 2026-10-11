# SP-11 — Neatlogs observability

## Why this is a subproblem

Must-have: Neatlogs instrumentation for the main agent run. Purpose: make the multi-step run inspectable — tool use, steps, failures, retries, revisions.

The spec is explicit: Neatlogs is the **observability layer, not the decision engine**. Verify current SDK and integration surface before committing to specific trace features.

Without this, judges (or we) cannot tell an investigated decision from a single generated memo.

## Discussion

Observability here has a product job, not only an engineering job. The demo beat is: open Neatlogs to inspect the multi-step run and any revision. So Neatlogs must be **visible in the demo**, not only useful to developers.

Align with **SP-02** (`Run.neatlogsTraceId`; observability separate from domain DB), **SP-06** (batched panel LLM; Simulated labels), **SP-07** (MCP finance calls; latency logged), **SP-09** (export includes Neatlogs link/id; revision = new Run), **SP-10** (stage event names; one trace per Run; `revisionOf` link; redacted packet hashes + `packetRef` in DB), **SP-13** (in-app “Open in Neatlogs”), **SP-14** (smoke test + fallback label when ingest fails — details cross-ref, not re-litigated here). **SP-01-Q08:** Neatlogs is the **exception** — no LLM pretending to be Neatlogs; use a **labeled local audit log** + stage timeline if ingest is down.

**Verified surface (2026-03):** project has `NEATLOGS_API_KEY` in `.env`; official docs at [docs.neatlogs.com](https://docs.neatlogs.com/sdk) — **TypeScript** (`npm install neatlogs`) and **Python** SDKs; HTTP `POST https://ingest.neatlogs.com/v1/trace` fallback; dashboard **US** [app.neatlogs.com](https://app.neatlogs.com) (EU: `eu.app.neatlogs.com` / `eu.ingest.neatlogs.com`). Primitives: **trace** = one run; **spans** with kinds `WORKFLOW`, `CHAIN`, `AGENT`, `LLM`, `TOOL`, `MCP_TOOL`, `GUARDRAIL`, `RETRIEVER`, etc.; optional **tags**, **workflow name**, custom attributes, **sessions**, client-side **`mask`** PII scrubbing.

**v1 mapping:** orchestrator opens one **`WORKFLOW`** root per Run (`workflowName`: `ceo-decision-sandbox`); **`CHAIN`** child per SP-10 stage; **`TOOL`** / **`MCP_TOOL`** per facade vendor call; wrapped **`LLM`** for panel batches and recommendation prose; **`GUARDRAIL`** for schema/forbidden-claim validation. UI shows **stage progress only** (not a fake Neatlogs clone); Neatlogs holds the inspectable tree.

## What “implemented to the end” would require

1. Verified Neatlogs product surface, auth, project, SDK.
2. A mapping from orchestrator events (SP-10) to Neatlogs primitives that actually exist.
3. Instrumentation of the main Run: start, each tool, each LLM call if required, validation fail, retry, end, revision.
4. Payload policy: what is attached, truncated, redacted.
5. A demo path to open the trace in time.
6. Labeled fallback if Neatlogs is down (local log file? screenshot? still must be labeled).
7. Proof that the recommendation can be tied to the trace id in application state.
8. Smoke test at the beginning (section 10).

## Locked decisions (spec only)

- Purpose: inspectable multi-step agent run (section 4).
- Planned use: trace steps and tool calls; record structured I/O and failures where supported; show retries, validation failures, revisions; prove investigation rather than one polished answer.
- Not the decision engine; verify SDK/integration before committing to features.
- Must-have: instrumentation for the main agent run.
- Demo beat: open Neatlogs to inspect the run and any revision.
- Smoke-test; labeled fallbacks.

## Dependencies

- Consumes: SP-10 event model, SP-01 (revision in or out), SP-14 (fallback).
- Should be able to show SP-05/06/07/08/09 work as real calls, not summaries.
- Must not be asked to store business-state branching (that is SP-09).

## Questions

### Product verification

**SP-11-Q01.** Do we already have Neatlogs access (account, project, keys, docs)?
**Yes** — Neatlogs account/project with **`NEATLOGS_API_KEY`** in local `.env` (not committed); dashboard access for presenters. Re-verify key in **Settings → Project → API keys** before demo.

**SP-11-Q02.** What official SDK/docs are the source of truth for this hackathon?
**Primary:** [SDK overview](https://docs.neatlogs.com/sdk) + **[TypeScript SDK](https://docs.neatlogs.com/sdk/typescript)** (Node backend on AWS). **Secondary:** [Python SDK](https://docs.neatlogs.com/sdk/python) if a Python worker is added. **HTTP fallback:** [HTTP trace injection](https://docs.neatlogs.com/sdk/http-injection). **Features:** [Traces](https://docs.neatlogs.com/docs/features/traces). If docs and live SDK diverge, **live SDK + dashboard behavior wins**; note drift in repo changelog.

**SP-11-Q03.** What primitives actually exist (trace, span, event, log, artifact, session, something else)?
**Trace** (one agent run, span tree). **Spans** with semantic **kinds** (`WORKFLOW`, `CHAIN`, `AGENT`, `LLM`, `TOOL`, `MCP_TOOL`, `GUARDRAIL`, `RETRIEVER`, …). **`log()`** steps inside a span when `captureLogs: true`. **Workflow** grouping via `init({ workflowName })` and/or `neatlogs.workflow.name` on root. **Tags** and **custom attributes** on spans. **Sessions** (optional) to group traces. **No separate “artifact” object** in v1 — attach summaries as span I/O or attributes; full blobs stay in app `data/blobs/` with `blobId` on span.

**SP-11-Q04.** What languages/runtimes does the SDK support, and does that constrain SP-01 platform choice?
**Official SDKs:** TypeScript/Node **≥18**, Python, Go, Browser. **Does not change SP-01** (AWS webapp): use **TypeScript `neatlogs` on the orchestrator service**. Other languages may POST JSON to `/v1/trace` only if needed.

**SP-11-Q05.** Is there a hosted UI we can open in the demo? URL pattern?
**Yes** — **Traces** in dashboard: **https://app.neatlogs.com** (US) or **https://eu.app.neatlogs.com** (EU). Filter workflow **`ceo-decision-sandbox`**; open trace by row click. **Deep link:** persist **trace id** from export/SDK; UI opens `https://app.neatlogs.com/traces/{traceId}` when the dashboard resolves it (if link 404s, fall back to workflow filter + **run id** in trace title/metadata — SP-13).

**SP-11-Q06.** Auth for the hosted UI during judging (public link, login, invite)?
**Presenter login** (team account) during live demo; **optional read-only invite** for judges if available. **No** embedding Neatlogs in our app iframe v1. For offline judging: **export JSON** includes `neatlogsTraceId` + screenshot path (Q28).

**SP-11-Q07.** Retention, PII policy, and whether prompts/tool payloads are allowed to be stored.
**Follow Neatlogs project/team retention** (dashboard settings). **We allow** prompts and structured tool I/O in Neatlogs for hackathon debugging **after client-side redaction** (`mask` + rules below). **Never send:** API keys, `Authorization` headers, raw `.env`, end-user passwords. **Crustdata/cfo payloads:** truncated summaries in spans; full raw only in app blobs. Enable SDK **`mask`** for emails/phones if present in intake text.

**SP-11-Q08.** Cost, rate limits, max payload size.
**Billing/limits:** Neatlogs plan quotas (monitor in dashboard); no hardcoded vendor caps in repo. **Our policy:** ≤ **32 KiB** per span input/output string (truncate with `…[truncated, blobId=…]`); ≤ **200 spans** exported per Run (panel = **per-batch** spans, not per respondent). **`sampleRate: 1.0`** for demo Runs; may lower in load tests only with label.

**SP-11-Q09.** Required attribution?
**Yes** — README + demo script **one line**: observability via **Neatlogs**; link to [neatlogs.com](https://neatlogs.com). No logo requirement unless hackathon rules add one.

**SP-11-Q10.** Who verifies the SDK *before* instrumentation design is treated as decided?
**Implementer** before merge: `npm exec --offline --no -- neatlogs doctor --local --json` then **`doctor --probe --json`** with project key; manual smoke trace (Q35). This design pass treats **docs + doctor probe** as verification gate.

### What to instrument

**SP-11-Q11.** Is “main agent run” one trace covering research+panel+finance+decide?
**Yes** — **one Neatlogs trace per app `Run`**, root `WORKFLOW` named `run:{runId}`, children for all stages through `recommend` (SP-10-Q36–Q37), including **`code_impact`** (`skipped` span with reason when `SKIP_CODE_IMPACT=true`).

**SP-11-Q12.** Is the panel’s N respondent evaluations each a span, batched spans, or hidden behind one “run_panel” span?
**Batched spans** — one **`LLM`** (or `CHAIN`) span per **panel batch** (8–12 profiles, SP-06-Q29) under parent **`panel`** `CHAIN`; plus one **`TOOL`** `aggregate_panel` for deterministic aggregation. **Not** N=60 leaf spans in demo.

**SP-11-Q13.** Must LLM prompts and completions be recorded, or only tool I/O?
**Both where SDK captures automatically** — wrapped LLM client records full prompt/completion on **`LLM`** spans. **Facade `TOOL`** spans record **structured** request/response summaries (mapped evidence ids, counts), not duplicate full LLM text. **Hypothesis/recommendation prose** LLM calls: full capture on `LLM` spans.

**SP-11-Q14.** Must validation failures be recorded even if retried successfully?
**Yes** — failed attempt as **`GUARDRAIL`** or child span with `error` / `passed: false` before successful retry span (SP-10-Q34: natural failures only in demo; CI may inject).

**SP-11-Q15.** Must retries be explicit events vs just duplicate spans?
**Explicit** — retry attempt spans named `tool:{name}:attempt:{n}` or `guardrail:schema:attempt:{n}` with attribute `neatlogs.retry.attempt`; final success sibling `attempt:final`. Avoid silent overwrites.

**SP-11-Q16.** How is a revision represented (new trace linked to old, same trace, tagged run group)?
**New trace** for revision Run (SP-10-Q38): root attributes **`revisionOfTraceId`** + **`parentRunId`**; optional shared **`sessionId`** in Neatlogs session API. **Do not** append revision stages onto the original trace.

**SP-11-Q17.** Do we record operator actions (click Run, paste contradictory signal)?
**Yes, coarse events** — `TOOL` or `log()` spans: `operator:start_investigation`, `operator:approve_assumptions`, `operator:submit_revision_evidence` with **action type + ids** only (no full pasted essay in Neatlogs if >2 KiB — store in DB, span gets `evidenceId`).

**SP-11-Q18.** Do we record deterministic modules (aggregation, arithmetic checks) or only LLM/vendor calls?
**Record material deterministic steps** — `aggregate_panel`, `build_scorecard`, `forbidden_claim_scan` as short **`CHAIN`** or **`GUARDRAIL`** spans (inputs/outputs summarized). Skip per-row arithmetic micro-ops.

**SP-11-Q19.** Must each span include the Decision id and Recommendation id?
**Root WORKFLOW:** `decisionId`, `runId`, `sessionId`, `runKind`. **Stage spans:** `decisionId`, `runId`, `stage` (enum). **`recommend` stage and publish:** add `recommendationId` when allocated. Propagate via `init({ metadata })` + per-span `setAttribute`.

### Payload policy

**SP-11-Q20.** What is redacted (API keys, full Crustdata payloads, full panel rows, financial raw output)?
**Redact/remove:** all secrets and auth headers; **full** Crustdata JSON; **full** panel respondent rows; **full** cfo workspace exports; operator PII unrelated to demo narrative. **Include:** tool names, durations, credit counters, mapped id lists, aggregate panel stats, finance **mapped** metric snapshot, `epistemicLabel`, `fallback` flags.

**SP-11-Q21.** What is truncated and to what size?
**32 KiB** max per string field on spans; arrays **max 50 elements** in Neatlogs (rest via `blobId`). Token counts and latencies always full. Hash of full payload (`sha256`) always when truncated.

**SP-11-Q22.** Do we attach our mapped objects, vendor raw, or both?
**Mapped summaries in Neatlogs**; **vendor raw** only in app blobs. Span carries `blobId` + `packetRef` (SP-10-Q31) for drill-down in our UI/export, not full raw in Neatlogs.

**SP-11-Q23.** Are simulated-panel labels included in traces so a Neatlogs viewer cannot mistake them for real interviews?
**Yes** — every panel-related span: attributes `epistemicLabel=Simulated`, `panelMode=synthetic`, `panelRunId`; batch LLM system prompt must state **synthetic personas** (also in span metadata `stimulusKind=synthetic_panel`).

### Demo

**SP-11-Q24.** How does the presenter open Neatlogs in the 3–5 minute flow (button in our UI, bookmark, separate monitor)?
**Primary:** in-app **“Open in Neatlogs”** on Run complete + Recommendation screen (new tab). **Backup:** bookmark to workflow Traces list. **Presenter habit:** second monitor optional, not required.

**SP-11-Q25.** What three things must a judge see in Neatlogs to count as success (example: Crustdata call, panel call, finance call)?
1. **`research`** stage with **Crustdata** `TOOL`/`MCP` span(s) showing real call metadata (or labeled `fallback_fixture`).  
2. **`panel`** stage with **batched `LLM`** + **`aggregate_panel`**, `epistemicLabel=Simulated`.  
3. **`finance`** stage with **`MCP_TOOL`** span(s) **or** explicit `skipped`/`gap` guardrail when mapping deferred — still proves orchestration, not a one-shot memo.

**SP-11-Q26.** Must they see a retry or failure, or is a clean success trace enough?
**Clean success is enough** for live demo (SP-10-Q34). Retries/failures recorded when they occur; CI golden path may include one schema retry.

**SP-11-Q27.** If revision is in scope, must both recommendation versions be visible in Neatlogs?
**Yes** — **two traces** (initial Run + revision Run) linked via `revisionOfTraceId`; demo shows both from Revision history links (SP-09).

**SP-11-Q28.** Is a screenshot of Neatlogs an acceptable fallback if live UI login fails, if labeled?
**Yes** — committed under `fixtures/demo/neatlogs-trace-screenshot.png` (or per-run export) with banner **“Neatlogs screenshot — live trace id {id}”**; export JSON still carries trace id.

### Fallback and failure

**SP-11-Q29.** If Neatlogs ingest fails, does the agent run continue?
**Yes** — investigation **must not block** on observability; Run marked `observabilityFallback: local_audit` (SP-02).

**SP-11-Q30.** If it continues, how do we still show observability (local log, in-app trace labeled “not Neatlogs”)?
**Append-only `data/audit/{runId}.jsonl`** mirroring stage/tool events (same schema as orchestrator events); UI shows **stage timeline** with badge **“Local audit only — Neatlogs unavailable”**. **No LLM-generated fake trace.**

**SP-11-Q31.** Is a fake in-app trace allowed in addition to Neatlogs, or does that steal the product’s role?
**Stage progress list only** (name, status, duration) — **not** a span tree impersonating Neatlogs. When Neatlogs healthy, **Neatlogs is the inspectable tree**; in-app links out. Local JSONL only when ingest fails.

### Correlation

**SP-11-Q32.** Do we store neatlogs_trace_id on the Decision state?
**On each `Run` record** as `neatlogsTraceId` (required when ingest succeeds); Decision carries **latest** run’s id for convenience. Export lists **all** run trace ids in revision history (SP-02-Q04, SP-09).

**SP-11-Q33.** Deep link from our recommendation screen to the trace?
**Yes** — button uses stored `neatlogsTraceId` + US/EU base from env `NEATLOGS_REGION` (`us`|`eu`, default `us`).

**SP-11-Q34.** Correlation with Entire checkpoints (SP-12) — wanted in v1 or not?
**No v1 link** — Entire is dev/git history only; optional future attribute `gitCommitSha` on WORKFLOW root for debugging, not shown in demo.

### Testing

**SP-11-Q35.** Smoke test: create a trace, open it, confirm fields X, Y, Z. What are X, Y, Z?
**X:** `doctor --probe` passes. **Y:** one manual `WORKFLOW` smoke trace appears under workflow **`ceo-decision-sandbox`** within 30s. **Z:** opened trace shows **≥1 `LLM` or `TOOL` child**, root attributes include `runId` (test uuid). Run on **startup** + **pre-demo** checklist (SP-14 aligns).

**SP-11-Q36.** Do CI tests run against a Neatlogs sandbox, a mock, or not at all?
**Mock/no network** — CI asserts orchestrator emits event schema and **would** call exporter behind interface; **no** live Neatlogs in CI. Optional nightly/manual job with key runs probe only.
