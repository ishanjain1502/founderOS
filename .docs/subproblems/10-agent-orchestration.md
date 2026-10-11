# SP-10 — Autonomous CEO agent orchestration

## Why this is a subproblem

The architecture says the **agent orchestrates** the workflow. The product must perform a sequence of actions, not emit one polished answer. Section 6 also says deterministic code should handle schemas, arithmetic, budget constraints, duplicate removal, validation, and scenario comparisons wherever possible; LLM calls are for language understanding or judgment.

That split is a real implementation problem: what is a model, what is a tool, what is a fixed pipeline, what is allowed to retry, and what must never be left to free-form generation.

No model vendor, tool framework, or autonomy level is specified.

## Discussion

“Autonomous” in the title can mean several incompatible things:

- The operator clicks **Run** and the agent walks the whole pipeline unattended.
- The agent proposes the next step and waits for approval each time.
- The pipeline is a fixed script; an LLM only fills judgment-shaped holes (hypotheses, respondent evaluations, explanation).
- A general agent may choose extra tools and loops until it stops.

The spec’s numbered workflow (receive → research → hypotheses → panel → evaluate → finance → compare → record → decide → observe/revise) looks like a **directed path**. It does not say whether the agent may skip, reorder, or loop steps except for revision when new evidence arrives.

Section 7 lists capabilities the product must actually perform. A single LLM call that *claims* it did them fails the Neatlogs story: the demo must prove investigation, evaluation, and change.

Budget constraints (section 6) are listed next to schemas and arithmetic as deterministic. That likely means **our** runtime budget (calls, time, money), not the SaaS company’s budget — but it could mean both. Ask.

Retries, validation failures, and revisions must be real because Neatlogs is supposed to show them. Inventing a fake retry in the UI would be theater. So the orchestrator needs actual invalid-output paths.

Tool boundaries:

- Crustdata research (SP-05)
- Panel run (SP-06)
- cfo.ai (SP-07)
- Maybe state load/save (SP-09)
- Maybe “ingest new evidence” (SP-09)

The LLM-shaped holes might be:

- interpreting Crustdata into hypotheses (without promoting them to evidence)
- producing respondent evaluations if you chose LLM-for-panel
- writing the recommendation explanation
- deciding that new evidence contradicts an assumption

Every hole needs I/O schemas so deterministic validation can wrap it.

Model choice, temperature, prompt storage, PII, and logging of prompts into Neatlogs are unspecified. Prompt logging may duplicate or conflict with Neatlogs (SP-11).

Human-in-the-loop vs autonomy also changes the 3–5 minute demo: an approval at every step may not fit; a fully silent run may look like a black box unless the UI streams stages.

Align with **SP-01** (boilerplate workflow; vendor-down LLM-shaped fallback for formatted gaps except Neatlogs; live recommendation), **SP-03** (wizard intake; approve recap before first Run), **SP-06/07** (deterministic aggregation; `run_finance` wrapper; panel batching), **SP-08** (deterministic scorecard + LLM explain), **SP-09** (Revision entry; SQLite state), **SP-12** (`code_impact` / Track B), **SP-14** (caps — orchestrator enforces).

**v1 orchestrator:** **fixed state machine** with **bounded** tool calls; **one primary LLM** for judgment prose + panel batch evaluation; **no free-form reorder**; **stage streaming** to UI + Neatlogs.

**`code_impact` gate:** env **`SKIP_CODE_IMPACT`** (default **`true`** until implementation). When true, orchestrator **does not** clone/analyze repos; emits stage **`code_impact`** with status **`skipped`** and `missingData.codeImpact: true`. When false and intake has `repoUrl`, run SP-12 Track B tools.

## What “implemented to the end” would require

1. A stated autonomy policy (what the agent may do without asking).
2. A stated control flow (fixed pipeline vs planned agent vs hybrid).
3. A tool list with schemas, timeouts, budgets, retry rules.
4. A split table: deterministic module vs LLM task, covering every workflow step.
5. Input packet construction for each LLM task (no silent extra context).
6. Output validation and retry/fail behavior.
7. Stage events the UI and Neatlogs can both consume.
8. Stop conditions: success, budget exhausted, validation failed, operator abort.
9. Revision entry point that reuses the same orchestrator.
10. Secrets handling for vendor keys (where stored, who injects).
11. Model provider, identity, and what happens if the model is down (SP-14).
12. Deterministic budget enforcement (max calls, max tokens, max seconds, max dollars — whichever you require).

## Locked decisions (spec only)

- Agent orchestrates; deterministic code for schemas, arithmetic checks, budget constraints, duplicate removal, validation, scenario comparisons wherever possible; LLM for language understanding or judgment (section 6).
- Product must actually perform the action sequence in section 7, not only generate a recommendation.
- Strongest demo loop: Investigate → simulate → model → compare → decide → receive new evidence → revise.
- Neatlogs makes tool use, steps, failures, retries, and revisions inspectable (section 2.10, 4).
- Too many agent calls: use batching, bounded samples, structured outputs, deterministic aggregation (section 10).

## Dependencies

- Consumes all of SP-01–SP-09 and SP-14.
- Emits events for SP-11 and stages for SP-13.
- Does not own Entire semantics (SP-12).

## Questions

### Autonomy and control flow

**SP-10-Q01.** After intake is complete, does the operator press one Run, approve each stage, or something else?
**Staged approvals + one Run:** (1) **Approve intake recap** → (2) **Start investigation** (single button) runs pipeline with **streaming stages** → (3) **Approve assumption pack** gate **before finance** (pipeline pauses if not pre-approved at recap) → (4) publish recommendation. **Revision:** separate **“Re-evaluate”** after new evidence (SP-09). **Not** per-stage approve for Crustdata/panel.

**SP-10-Q02.** May the agent skip a stage (example: skip Crustdata if user pasted competitors)?
**Only with logged gap:** operator may check **“skip market research”** at start (Full mode) or Crustdata failure → continue with `missingData: crustdata`. **`code_impact`:** skipped when **`SKIP_CODE_IMPACT=true`** (v1 default) or no `repoUrl` — logged, not silent. **Cannot skip** panel or comparison; **finance** skippable only on failure/fixture with labels (SP-07). Agent **may not** silently skip other stages.

**SP-10-Q03.** May the agent reorder stages?
**No** in v1. Order: **research → hypotheses → `code_impact` → panel → (assumption gate) → finance → compare → recommend** (`code_impact` omitted from tool work when skipped; stage event still emitted). Revision may **subset** re-run (SP-09-Q21), not arbitrary reorder.

**SP-10-Q04.** May the agent loop a stage (example: extra Crustdata searches) without a revision trigger?
**Bounded:** max **1** extra Crustdata query per Run if first query empty (deterministic trigger). Max **1** panel re-run per Run (SP-06). No unbounded agent loops.

**SP-10-Q05.** Is the workflow a hard-coded state machine with LLM nodes, a free-form tool-calling agent, or a hybrid you will define?
**Hard-coded state machine** with **fixed tool invocations** at each stage; LLM invoked only at defined nodes (hypotheses, panel batch eval, recommendation prose, optional contradiction narrative). **Not** open-ended tool-calling agent in v1.

**SP-10-Q06.** What does “autonomous” mean in the product copy, in one sentence you will stand behind?
*“After you confirm the decision and constraints, the agent runs the full investigate → simulate → model → compare workflow and produces a cited recommendation—you can inspect every step in Neatlogs.”*

**SP-10-Q07.** Can the operator pause, abort, or resume a run?
**Abort yes** (marks Run `aborted`, keeps partial artifacts). **Pause no** in v1. **Resume no** — retry starts **new Run** linked to same Decision (prior runs retained).

**SP-10-Q08.** Can the operator inject a message mid-run (“ignore SMB”)? In or out of v1?
**Out of v1** mid-run. Operator waits for Run end, then **edit intake/constraints** or add evidence → **Revision** run.

### Deterministic vs LLM split

**SP-10-Q09.** For each workflow step below, mark it: deterministic only / LLM / either / both (LLM then deterministic check). Steps: intake parsing; Crustdata query construction; Crustdata payload mapping; hypothesis formation; archetype/profile generation; respondent evaluation; panel aggregation; finance input mapping; finance output mapping; arithmetic checks; scenario listing; scenario comparison; recommendation choice; recommendation prose; contradiction detection; revision prose.
| Step | v1 |
|------|-----|
| Intake parsing | **Deterministic** (wizard); optional LLM **README → summary** with operator approve (SP-03-Q37) |
| Crustdata query construction | **Both** — template + optional LLM refine → **deterministic** validate |
| Crustdata payload mapping | **Deterministic** |
| Hypothesis formation | **LLM** → **deterministic** Claim validate |
| Archetype/profile generation | **Both** — template/jitter **deterministic**; LLM `workflow_summary` → schema validate |
| Respondent evaluation | **LLM** (batched) → **deterministic** schema + guardrails |
| Panel aggregation | **Deterministic only** |
| Finance input/output mapping | **Deterministic** |
| Arithmetic checks | **Deterministic only** |
| Scenario listing | **Deterministic** (SP-08 catalog) |
| Scenario comparison scorecard | **Deterministic** |
| Recommendation choice | **Both** — scorecard hint + **LLM** choice must cite scorecard |
| Recommendation prose | **LLM** → validator |
| Contradiction detection | **Both** — rules suggest, operator confirms; LLM drafts reason |
| Revision prose | **LLM** on Revision packet |
| Repo connect / git sandbox | **Deterministic** (when `SKIP_CODE_IMPACT=false`) |
| Feature → path mapping | **Both** — intake + optional LLM → **deterministic** path validate |
| Code impact analysis (rg, git log, deps) | **Deterministic** OSS tools → optional LLM **narrate** `CodeImpactArtifact` |

**SP-10-Q10.** Are there LLM uses you forbid even if convenient (example: adding numbers, choosing prices, inventing competitors)?
**Forbidden:** invent **numbers** without Assumption/Evidence id; invent **Observed** market facts; **panel aggregation** in LLM; **raw cfo MCP** from recommendation model; **Simulated → Observed** laundering; silent **price/adoption**.

**SP-10-Q11.** Must every LLM output pass a JSON/schema validator before it can affect state?
**Yes** for state-changing outputs. Fail → **retry ≤2** then stage `failed`.

**SP-10-Q12.** Who writes and versions prompts? Are prompts product artifacts in the repo?
**Repo:** `prompts/<task>/v1.md`; `promptVersion` on Run.

**SP-10-Q13.** May prompts include the illustrative spec percentages as few-shot examples? (That could bias the panel toward the demo story.)
**No** spec outcome few-shots. Schema-shaped placeholders only.

### Tools

**SP-10-Q14.** What is the complete tool list for v1?
`load_decision_state`, `save_artifact`, `crustdata_search`, `form_hypotheses`, `connect_repository`, `map_feature_paths`, `run_code_impact_analysis`, `run_panel`, `validate_assumption_pack`, `run_finance`, `build_comparison_scorecard`, `draft_recommendation`, `publish_recommendation`, `ingest_evidence`, `run_revision`. Facades only — no raw vendor SDKs to the LLM. **`connect_repository` / `map_feature_paths` / `run_code_impact_analysis`** not invoked when **`SKIP_CODE_IMPACT=true`**.

**SP-10-Q15.** For each tool: timeout, max retries, retry on which errors, idempotency expectation?
`crustdata_search` 60s, 2× on 5xx/timeout, idempotent. `connect_repository` 120s, 1× on clone fail, idempotent per `repoUrl`+ref. `run_code_impact_analysis` 90s, 1×, new `codeImpactRunId`. `run_panel` 180s, 1 batch retry, new `panelRunId`. `run_finance` 90s, 1 retry, ≤20 MCP inside; returns `skipped` if no tenant mapping. LLM tasks 120s, 2× on 429/5xx. `publish_recommendation` 10s, no retry, single publish.

**SP-10-Q16.** What is the max number of LLM calls per Run (panel included or excluded)?
**≤ 25** HTTP LLM requests/Run (panel batches included); orchestration ≤ 8.

**SP-10-Q17.** What is the max number of external vendor calls per Run, per vendor?
Crustdata **≤5**; cfo **≤20** MCP/phase, **≤2** phases; panel **1+1** re-run max.

**SP-10-Q18.** What is the max wall-clock time per Run?
**12 min** hard cap; demo happy path **≤5 min**. Revision **6 min**.

**SP-10-Q19.** What is the max dollar cost per Run?
**~$3 soft log**; **hard** = Q16 + Q17 caps.

**SP-10-Q20.** Who enforces those budgets — deterministic wrapper around the agent?
**Orchestrator service** — agent cannot bypass.

**SP-10-Q21.** What happens when a budget is hit: partial recommendation with gaps, operator choice?
Stage **fails**; Run may be `completed_with_gaps` only if publish still valid (e.g. missing Crustdata). Panel/finance hard-fail blocks publish unless **fixture** accepted. All gaps in `missingData`.

### Models and runtime

**SP-10-Q22.** Which model provider(s) and model id(s) are allowed?
**Env:** `LLM_PROVIDER` + `LLM_MODEL` (OpenAI or Anthropic defaults in README).

**SP-10-Q23.** Is more than one model allowed (cheap for panel, stronger for recommendation)?
**Optional:** `LLM_MODEL_PANEL` + `LLM_MODEL_REASONING`; else single model.

**SP-10-Q24.** What happens if the model API is down?
Retry → alternate provider if configured → stage fail. Vendors use **fixtures** (SP-01-Q08); LLM does not impersonate Crustdata/cfo.

**SP-10-Q25.** Are local models in scope?
**Out of v1.**

**SP-10-Q26.** What temperature / sampling requirements exist, if any? (Spec says temperature alone must not create the market.)
Panel/profile **≤0.3**; recommendation **≤0.5**; diversity from templates/seed (SP-06).

**SP-10-Q27.** Where do API keys live, and who supplies them at demo time?
Server **`.env` / AWS secrets**; cfo **OAuth** per session; never client-side.

**SP-10-Q28.** Is network egress other than the four required products plus the LLM provider forbidden?
**Allowed:** required products + LLM + git/hosting + Neatlogs. **No** general web browse tools.

### Structured packets

**SP-10-Q29.** What may the hypothesis-formation step see (raw Crustdata only, mapped evidence only, intake, all)?
**Mapped Evidence** + intake recap; max **20** items; no raw blobs (ids + summaries).

**SP-10-Q30.** What may the recommendation step see (aggregates vs raw panel rows, truncated evidence, finance mapped vs raw)?
Scorecard, segment aggregates, ≤**5** sample evals/segment, finance **mapped** + sensitivity summary, assumptions, unknowns. Illustrative data tagged `demo_fixture`.

**SP-10-Q31.** Must those packets be logged as the actual tool/LLM inputs?
**Yes** — redacted hashes to Neatlogs; `packetRef` per stage in DB.

**SP-10-Q32.** How do we prevent the recommendation model from seeing unlabeled illustrative numbers and restating them as facts?
**`epistemicLabel` + id** on every packet number; prompt rules; publish validator rejects orphan numbers and forbidden claims.

### Failures and retries

**SP-10-Q33.** Which failures are retried vs fatal vs skipped-with-gap?
**Retry:** transient vendor/LLM. **Skip-gap:** empty Crustdata. **Fatal:** schema fail after retries; unresolved conflicts; publish validator fail.

**SP-10-Q34.** Must we *intentionally* have a visible validation failure in the demo so Neatlogs can show it, or only if it happens naturally?
**Natural only**; CI tests may inject invalid JSON.

**SP-10-Q35.** If intake is free text, does a parser LLM fail closed when it cannot extract required fields?
**Wizard required fields** block Run; LLM parse cannot bypass deterministic completeness check.

### Observability hooks

**SP-10-Q36.** What stage names must be emitted, in order, for UI and Neatlogs?
`run_started` → `research` → `hypotheses` → `code_impact` → `panel` → `assumption_gate` → `finance` → `compare` → `recommend` → `run_completed` \| `run_failed` \| `run_aborted`. **`code_impact`:** status `completed` \| `skipped` (reason `SKIP_CODE_IMPACT` \| `no_repo` \| `error`). Revision: `revision_started` → … → `revision_completed` (revision **does not** re-run `code_impact` unless operator starts new investigation).

**SP-10-Q37.** Do we emit one trace per Run, per stage, per tool call, or all of these?
**One Neatlogs trace/Run** with nested spans per stage + tool/LLM.

**SP-10-Q38.** How is a Revision represented as a continuation vs a new trace (see also SP-11)?
**New Run** `runKind: revision`, `parentRunId`; new Neatlogs trace with `revisionOf` link.

### Testing the orchestrator

**SP-10-Q39.** What is a passing “agent that works” test beyond “it returned markdown”?
CI: stage order; SP-02 Recommendation shape; numeric refs; forbidden-claim scan; scorecard ids present.

**SP-10-Q40.** Do we need a recorded end-to-end run with all vendors stubbed for CI?
**Yes** — `fixtures/e2e/golden_run_v1.json` (stub all vendors).

**SP-10-Q41.** Who owns the definition of a golden path for the demo vs a golden path for tests?
**Demo:** `fixtures/demo/decision-card-ai-analytics.json` + SP-13 script. **Tests:** `fixtures/e2e/golden_run_v1.json`. Tests do not assert pilot wins.

### Code impact (SP-12 Track B)

**SP-10-Q42.** How is `code_impact` enabled or disabled at runtime?
**Env `SKIP_CODE_IMPACT`:** treated as true when value is **`true`**, **`1`**, or **`yes`** (case-insensitive). **v1 default in repo `.env`: `SKIP_CODE_IMPACT=true`** — stage emitted as **`skipped`**, no git clone, no OSS tools, comparison row **`engineering_risk`** = `missing` with label **“Code impact skipped (not implemented).”** Set **`SKIP_CODE_IMPACT=false`** on server when Track B is implemented and `REPO_CLONE_TOKEN` (or equivalent) is configured. Orchestrator reads env at **Run start** only (no mid-run toggle).
