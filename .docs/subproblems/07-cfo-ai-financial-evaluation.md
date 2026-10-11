# SP-07 — cfo.ai financial evaluation

## Why this is a subproblem

Workflow step 6 and must-have: one financial comparison through the **confirmed** cfo.ai workflow. The spec’s economic questions (costs, pricing, revenue scenarios, margins, burn, runway) are explicitly **subject to what the product supports**.

The spec says: confirm the intended cfo.ai workflow and API/product capabilities **before implementation**. Until that confirmation exists, any formula or endpoint list would be an assumption.

## Discussion

cfo.ai is where the sandbox is most likely to look more certain than it is. The risk table says: show scenarios, ranges, and sensitivity to inputs. The cfo.ai section says: do not present speculative adoption estimates as verified forecasts. Outputs are only as reliable as inputs **and** actual product capabilities.

So there are three nested unknowns:

1. **What cfo.ai actually is, for us, today.** **Remote MCP** to a spreadsheet-like workspace model (REAM); verified 2026-10-11.
2. **What we are allowed to ask it to do.** **v1:** update a **pre-mapped input table** under scenario family **“CEO sandbox”** (`Pilot` vs `Broad`), then **`inspect_table_blocks` compare** for mapped outputs; no open-ended model authoring in the hot path.
3. **What we put in.** Explicit **Assumption**-backed inputs (intake, user, agent, optional **panel-derived adoption** only via approved Assumption + mapping rule Q20).

“One financial comparison” might mean:

- two scenarios side by side (broad launch vs pilot), or
- one scenario vs do-nothing baseline, or
- one cfo.ai call that returns a comparison, or
- two calls we compare in our app.

The spec does not say which. Nice-to-have: sensitivity for price and adoption; comparison view launch vs pilot. Must-have is weaker: one financial comparison through the confirmed workflow.

Arithmetic checks belong in deterministic code (section 6). Even if cfo.ai computes runway, our app may need to sanity-check units, signs, and that inputs match stored assumptions. How far that checker goes is open.

The illustrative company has cash $2M, MRR $80k, runway 12 months. Those can contradict a model (burn implied by cash/runway vs burn implied by costs). Reconciliation is unstated.

Adoption is the most dangerous input: it is the number people will treat as a forecast. The panel must not be laundered into “we will get 18% conversion” unless you explicitly define that mapping as an assumption.

Design choices in this doc should stay aligned with **SP-01** (sensitivity for price/adoption is **in**; comparison view for broad vs pilot is **in**; demo fails if invented numbers are shown as facts; exportable report **in**), **SP-02** (Scenario completeness, `financeRunId`, raw vendor payload + mapped subset, all canonical metrics nullable with “not from vendor” flags, assumption refs on reported inputs), **SP-03** (cash/MRR/customers/runway/budget/timeline/pricing/adoption pass through as Assumption objects; intake runway is baseline; modeled runway is separate and labeled), **SP-04** (financial numbers are **Modeled**, not Evidence; block cfo.ai send when assumption pack is invalid or conflicts are unresolved), **SP-06** (panel may inform judgment but any panel→adoption bridge must be an explicit Assumption, never silent). **SP-14** still owns caps, smoke tests, and fallback labels.

**Blocking gate:** SP-07-Q01–Q10 **locked** below. MCP: project `cfoai` → `https://api.cfo.ai/mcp`. **One-time workspace setup:** create **CEO sandbox** scenario tree (`Pilot`, `Broad`) + document table/cell mapping (implementation: `config/cfo-ai-mapping.json` or equivalent). **Writes** only to that tree, not Main, unless operator overrides.

**Confirmed workflow (v1):** (1) validate assumption pack → (2) operator approve → (3) `edit_table_blocks` write mapped inputs per scenario → (4) `inspect_table_blocks` **compare** Pilot vs Broad → (5) optional sensitivity: 3× price + 3× adoption on **Pilot** via input edits + compare reads → (6) map to `financeRunId`, run deterministic checks → (7) persist raw MCP payloads + mapped subset (SP-02-Q28).

## What “implemented to the end” would require

1. Verified cfo.ai access, docs, auth, terms, cost, latency.
2. A written “confirmed workflow”: exact steps a human or agent follows, with the operations the product supports.
3. A mapping from our Scenario + Assumption objects to that workflow’s inputs.
4. A mapping from its outputs back to our objects, including unused/unsupported requested metrics.
5. Deterministic validation of inputs (units, required fields, assumption citations).
6. Deterministic checks on outputs (arithmetic sanity you define).
7. Storage of inputs, outputs, vendor ids, timestamps.
8. Agent tool contract: when it may call finance, how many times, with which scenarios.
9. UI: scenarios, numbers, assumption list, labels that these are not verified forecasts.
10. Failure and labeled fallback (SP-14).
11. Neatlogs of the call (SP-11).
12. Optional sensitivity loop only if SP-01 includes it — still needs a definition of which inputs move.

## Locked decisions (spec only)

- Purpose: assess whether the opportunity could make economic sense (section 4).
- Planned use: explicit cost, pricing, adoption, revenue assumptions; compare launch scenarios’ possible financial implications; examine costs, margins, burn, runway **where supported**; surface assumptions with greatest effect **where that is a capability**.
- Limitations: reliability bounded by inputs and actual capabilities; no speculative adoption as verified forecasts; confirm workflow/API before implementation.
- Must-have: one financial comparison through the confirmed cfo.ai workflow.
- Nice-to-have: sensitivity analysis for price and adoption.
- Deterministic arithmetic checks where possible (section 6).
- Demo beat: cfo.ai evaluates the stated scenarios and assumptions (section 9).
- Smoke-test at the beginning; labeled fallbacks (section 10).

## Dependencies

- Consumes: SP-01, SP-02, SP-03 (starting financials), SP-04 (assumption labels), SP-06 (only if you map panel → adoption), SP-08 (which scenarios to score), SP-14.
- Produces: financial inputs/outputs for SP-08, SP-09, SP-13.
- Traced in SP-11.

## Questions

### Product verification

**SP-07-Q01.** Do we already have cfo.ai access (account, keys, docs)?
**Yes — account + MCP connected** in Cursor (project `.cursor/mcp.json`). No static API key; OAuth per session. Verified: `list_orgs` returns workspace; `inspect_scenarios` returns **Main Scenario** in workspace.

**SP-07-Q02.** What official docs or product surface are the source of truth?
**[docs.cfo.ai](https://docs.cfo.ai)** (start: [MCP server](https://docs.cfo.ai/integrations/mcp-server), [agent instructions](https://docs.cfo.ai/agent-instructions.md)). Runtime tool schemas come from the connected MCP server. Human review/edit: **[app.cfo.ai](https://app.cfo.ai)**.

**SP-07-Q03.** Is cfo.ai in this hackathon an API, a UI we drive, an MCP server, a spreadsheet, a chat agent, or something else?
**Primary integration: remote MCP** (`https://api.cfo.ai/mcp`) invoked by our CEO agent orchestrator (SP-10). **Secondary:** operator uses **Ari / app UI** to inspect or fix the model. Under the hood it is a **spreadsheet-like financial model** (REAM), not a single-purpose “forecast API.”

**SP-07-Q04.** What operations does it actually support today? List from the vendor.
**Verified MCP tools (representative):** `list_orgs`; **read** — `inspect_pages`, `inspect_table_blocks` (incl. multi-scenario compare), `inspect_scenarios`, `inspect_dimension_mappings`, `inspect_integrations`, `inspect_skills`, `inspect_documentation`, `inspect_history`, …; **write** — `edit_table_blocks`, `edit_scenarios`, `edit_pages`, `edit_dimension_mappings`, `edit_integrations`, …; **other** — `edit_history` (undo), `inspect_billing`, `call_connected_api` (connected third-party APIs). Chat-only / in-app guides are **not** on MCP. Full catalog: Cursor MCP tool list for `cfoai`.

**SP-07-Q05.** Which of these requested concepts does it actually support: costs, pricing, revenue scenarios, margins, burn, runway, sensitivity, scenario compare?
**Supported in product terms (model-dependent, not guaranteed in an empty workspace):** **scenarios** (`inspect_scenarios` / `edit_scenarios`); **scenario compare** (`inspect_table_blocks` compare across scenarios); **costs, pricing, revenue, margins, burn, runway** as **variables/tables** in the workspace model once built or synced — not as fixed REST fields. **Sensitivity** = alternate scenarios and/or table compares, not a separate “sensitivity API” unless the model defines it. **v1 rule:** after smoke, run **`inspect_pages` + `inspect_table_blocks`** on the workspace intended for the hackathon and record which canonical metrics (SP-02-Q29) map to named tables/rows; flag gaps explicitly.

**SP-07-Q06.** For each unsupported concept, do we drop it, compute it ourselves, or fail the finance step?
**Per metric:** show **nullable** in mapped output with `source: not_in_workspace_model`. **Do not invent** headline revenue/margin. **Optional derived check only:** `runway_derived = cash / monthly_burn` when both are **user Assumptions**, labeled **Derived check (not cfo.ai output)**. **Fail finance step** only if **compare read returns no mapped columns** for both Pilot and Broad after retry once.

**SP-07-Q07.** Spec section 6 says deterministic code should handle arithmetic checks. If we compute a metric ourselves, is that still “through the confirmed cfo.ai workflow,” or does that violate the must-have?
**Must-have met** when the **primary comparison table** (Pilot vs Broad) comes from **`inspect_table_blocks` compare** after assumption writes. **Supplementary** deterministic checks and optional derived checks **do not** replace compare columns and **must** be visually distinct from **Modeled** cfo.ai cells.

**SP-07-Q08.** What are rate limits, cost, latency, and retention terms?
**Vendor:** read plan/usage via `inspect_billing` when debugging; official limits per cfo.ai plan (not hardcoded in repo). **Our v1 budgets:** ≤ **20 MCP tool calls** per finance phase; ≤ **90s** wall-clock per finance stage (SP-14 to align); log latency per call in Neatlogs. **Retention:** store raw payloads in app DB for audit/replay; follow vendor terms for workspace data; no public republishing of full model export.

**SP-07-Q09.** Required attribution copy?
On every finance view/export section: **“Modeled — cfo.ai workspace (not a verified forecast).”** Include **scenario names** (`Pilot`, `Broad`) and **`financeRunId`** + timestamp. No extra vendor trademark string unless docs require later.

**SP-07-Q10.** Who confirms the workflow, in writing, before other finance work starts?
**Operator (project owner)** confirms. **Written record:** this SP-07 doc (locked answers) + **confirmed workflow** block above + mapping file committed when implementation starts; smoke test logged on first successful compare read against CEO sandbox.

### The one comparison

**SP-07-Q11.** What is the must-have comparison, exactly (which two or more states of the world)?
**Pilot launch** vs **Broad launch** (SP-01-Q15), as two cfo.ai scenarios under **CEO sandbox**.

**SP-07-Q12.** Is a do-nothing / status-quo scenario required?
**No third cfo.ai scenario in v1.** Show **status quo** via **intake baseline** (cash, MRR, runway) on the same finance view, labeled **Observed / user Assumption** — not as a modeled “do nothing” branch unless added post-hackathon.

**SP-07-Q13.** Are the spec examples (broad launch, enterprise-only, pilot, delay, no build) the scenario set, a superset, or a menu the agent may choose from?
**Menu for SP-08 reasoning** (agent may discuss delay, no-build, segment-only). **Finance v1 runs only Pilot + Broad** (SP-02 strategy kinds). Other strategies appear in recommendation **without** full cfo modeling unless time permits a later mapping.

**SP-07-Q14.** How many cfo.ai invocations is v1 allowed to make per Decision?
≤ **20 MCP tool invocations** per **finance phase** (each `CallDynamicTool`/MCP tool = 1). Default **1 finance phase per Run**; **+1 re-run** after operator-approved assumption change (max **2 phases / Run**).

**SP-07-Q15.** Does “one financial comparison” mean one vendor call, or one screen that may use several calls?
**One report/UI comparison section** (Pilot vs Broad + sensitivity summary). **Multiple MCP calls** allowed behind orchestrator wrapper `run_finance` — not a single HTTP round-trip.

### Inputs

**SP-07-Q16.** What is the required input list for a scenario to be finance-ready?
SP-02-Q25 minimum **plus** mapped finance inputs: **one-time build cost**, **build duration (months)**, **price or ARPU uplift**, **adoption/attach rate (%)**, **rollout scope label**; all via **Assumption refs**; scenario kind **pilot** or **broad**; CEO sandbox scenario name bound in mapping config.

**SP-07-Q17.** Which inputs come from SP-03 unchanged?
**Cash**, **MRR**, **customer count**, **runway (months) baseline**, **budget cap**, **execution timeline** → Assumption objects with units (SP-03-Q36); passed through to mapping as baseline / constraints, not silently rewritten.

**SP-07-Q18.** Which inputs are assumptions the user must type?
User must **confirm or enter** before first finance send: **adoption for pilot and/or broad** (unless accepting agent proposal), **build cost** if not fully implied by budget breakdown, **price/packaging** when not provided at intake. Demo card may pre-fill but still requires **recap approve**.

**SP-07-Q19.** Which inputs may the agent propose?
**Build cost breakdown**, **inference/COGS monthly**, **incremental support/sales**, **scenario rollout timing**, **adoption** (with or without panel ref) — `owner=agent`, visible, subject to Q41 approval.

**SP-07-Q20.** Are we allowed to derive adoption from the panel? If yes, write the mapping rule (it is an assumption). If no, say so.
**Yes, only via explicit Assumption.** Rule: create `adoption_rate_pilot` / `adoption_rate_broad` with `derivedFrom: { panelRunId, segmentIds[], questionId }`. **Default proposal:** conservative **minimum** segment rate among represented segments for the relevant primary choice (e.g. would adopt / pay); **never** auto-use overall unweighted share without user approval. Operator **must approve** on assumption pack; panel text alone never writes cfo cells.

**SP-07-Q21.** If panel-derived adoption is forbidden, where does adoption come from?
N/A (panel path allowed). Fallback: **user-typed %** or **agent gap-fill** Assumption with no `derivedFrom`.

**SP-07-Q22.** What time horizon does finance use (months of runway, 12 months, 3 years, user-chosen)?
**Follow workspace model calendar** for engine periods. **Report headline:** **12-month** summary row/column when mapping supports it; **runway** metric when mapped. Drill-down may show full model horizon (e.g. through `range_end` from workspace).

**SP-07-Q23.** What cost categories are in v1 (build cost, inference cost, support, sales, COGS, other)?
**Required:** **one-time build/engineering**, **monthly inference or variable COGS**. **Optional:** **support uplift**, **incremental sales/marketing** (lump or monthly). Explicit **$0** Assumption allowed if category not applicable.

**SP-07-Q24.** Who estimates build cost for “AI analytics,” and how is that estimate labeled?
**Agent proposes** from intake **budget + timeline**; **user approves**. Label: **Assumption — engineering estimate (not vendor quote)**; `owner=agent` or `user`.

**SP-07-Q25.** Currency, tax, and accounting basis?
**USD**; **no tax** in v1; simplified **cash/MRR** view; footnote on export: not GAAP audit.

**SP-07-Q26.** Must every numeric input cite an Assumption or Evidence id?
**Yes** for any number **sent to cfo.ai or shown** in finance UI/report (SP-02-Q14).

**SP-07-Q27.** What ranges vs point estimates are required?
**Point required** for base case. **Sensitivity** uses low/base/high (Q34). Assumptions may optionally store `rangeMin`/`rangeMax`; if absent, defaults apply for sensitivity only.

### Outputs

**SP-07-Q28.** What outputs must we display if the vendor returns them?
All **mapped** SP-02-Q29 fields present in compare read: **cost**, **pricing**, **revenue**, **margin**, **burn**, **runway**, **adoption** (per scenario column).

**SP-07-Q29.** What outputs must we display even if the vendor does not return them? (If any, that implies our own math — confirm that is wanted.)
**Intake baseline row** (cash, MRR, runway user input) on same view — **not** from cfo.ai. Optional **derived runway check** (Q06) when runway unmapped — **Derived**, not Modeled.

**SP-07-Q30.** How do we show that numbers are not verified forecasts?
**Modeled** badge (SP-02-Q42) + copy **“Not a verified forecast”** on finance section and export (SP-01-Q29 L2).

**SP-07-Q31.** Do we store vendor raw output plus a mapped view?
**Yes** (SP-02-Q28): raw MCP payloads + mapped canonical subset per `financeRunId`.

**SP-07-Q32.** How do we treat a vendor narrative vs a vendor number?
**Numbers** from mapped compare are authoritative **Modeled**. **Agent prose** about finance is **Inferred**, must cite `financeRunId` + metric ids; never overrides displayed vendor numbers.

### Sensitivity (if in scope)

**SP-07-Q33.** Given SP-01’s inclusion choice: which inputs are swept?
**Price (or ARPU uplift)** and **adoption/attach rate** only (SP-01-Q13, SP-04-Q19).

**SP-07-Q34.** How many points per input? Who chooses the range?
**3 points** (low / base / high) per input. **Base** = approved assumption pack. **Defaults:** ±20% on price; adoption low/high = base × 0.7 / 1.3 clamped **[0, 100]%** unless assumption carries explicit `rangeMin`/`rangeMax`.

**SP-07-Q35.** Does sensitivity run inside cfo.ai, inside our deterministic code, or not at all in v1?
**cfo.ai computes** each point (input cell writes + compare reads on **Pilot** scenario). **Our code** orchestrates grid, stores results, **ranks deltas** deterministically for display.

**SP-07-Q36.** How do we show “which assumptions have the greatest effect” if the vendor cannot?
Rank by **absolute change** in mapped **runway** (else **burn**, else **revenue**) across sensitivity grid; show **top 2 drivers** in report sensitivity snippet with **Modeled** labels.

### Checks

**SP-07-Q37.** Which arithmetic checks are mandatory (example: negative revenue forbidden, runway = cash/burn if both exist, percentages in 0–100)?
**Mandatory:** rates in **[0, 100]**; non-negative **price** and **revenue** where applicable; **costs** non-negative unless model documents credits; **sent inputs hash** matches approved assumption pack; if **cash** and **monthly burn** both from user assumptions, flag when `|runway_derived − intake_runway| / intake_runway > 0.25` (SP-03-Q18).

**SP-07-Q38.** If vendor output fails a check, do we reject, warn, or hide the number?
**Warn** and show with **warning badge**; do not silently correct. **Hide** only when value is **null / not returned** (not when invalid).

**SP-07-Q39.** If intake runway and modeled runway disagree, what happens?
**User intake baseline** remains **“Current runway (your input)”**; **modeled runway** separate **Modeled** column; show **tension** in report; **no silent overwrite** (SP-03-Q18).

### Agent interface

**SP-07-Q40.** What tool(s) does the agent get, and what may it not send (unlabeled adoption, missing costs)?
**`run_finance`** (orchestrates MCP mapping + compare + sensitivity + persist) and **`get_finance_run`** (read-only). **Block send** without assumption refs, **build cost**, **adoption** for both scenarios, and **unlabeled panel→adoption** bridge.

**SP-07-Q41.** Must the operator approve the assumption pack before any cfo.ai call?
**Yes** — recap / **finance assumption card** approve before first MCP **write** in a Run (SP-04-Q15).

**SP-07-Q42.** May the agent change assumptions and recall finance during one Run?
**Yes once:** after panel or new evidence, agent may propose assumption updates → operator approve → **one** finance re-run. **No unbounded loop**; max **2 finance phases per Run** (Q14).

### Demo, fallback, testing

**SP-07-Q43.** What on-screen proof shows cfo.ai was used?
**Pilot vs Broad** scenario names, **`financeRunId`**, **timestamp**, side-by-side **Modeled** table from compare, optional **“Open in cfo.ai”** deep link when available.

**SP-07-Q44.** Live vs labeled fixture?
**Demo prefers live MCP.** **`fixtures/finance/demo_run.json`** for CI/regression; demo uses fixture **only** on finance failure (SP-06-Q50 pattern), never silent swap in Full mode.

**SP-07-Q45.** Smoke test definition and when it runs.
**Pass:** `list_orgs` + `inspect_scenarios` includes **CEO sandbox** scenarios + `inspect_table_blocks` **read** on mapped compare targets returns expected table ids. **When:** app/process startup and immediately before **Start investigation** in demo mode.

**SP-07-Q46.** Fallback if cfo.ai is down: skip finance, use labeled toy numbers, stop recommendation, something else?
**Labeled fixture** (`fixtures/finance/demo_run.json`) **or** finance-unavailable state; **recommendation continues** with **reduced evidence** and explicit uncertainty (panel/Crustdata may still run). **Do not** abort whole demo for finance alone.

**SP-07-Q47.** If fallback numbers are used, are they allowed to look like cfo.ai output, or must they be visually distinct?
**Visually distinct:** banner **“Recorded finance fixture — not live cfo.ai”**, distinct badge/color; never identical styling to live **Modeled** rows.
