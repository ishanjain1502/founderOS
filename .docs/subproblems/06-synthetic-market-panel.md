# SP-06 — Synthetic market panel

## Why this is a subproblem

This is the component the spec says **we build ourselves**. It is not Crustdata and not real interviews. It is a simulation layer so the agent can explore how different buyer types might react and which assumptions deserve real-world validation.

Must-have: a small, diverse synthetic market panel; segment-level aggregation and disagreement.

This is the largest custom behavior in the spec. Almost every operational detail are resolved below per SP-01–SP-05.

## Discussion

The spec is careful about what this panel **is not**:

- Not a claim that we surveyed real customers.
- Not “1,000 simulated respondents = 1,000 interviews.”
- Not diversity-by-temperature.
- Not a market forecast.

What it **is**: structured archetypes, bounded evaluations, aggregation by segment, disagreement, visible assumptions, labels that say simulated.

Design choices locked in this doc align with **SP-02** (segments, questionnaire, evaluations), **SP-03** (intake context), **SP-04** (Simulated / forbidden copy), **SP-01** (demo vs full, export report, manual quality judgment).

## What “implemented to the end” would require

1. A defined archetype set and how diversity is demonstrated.
2. A profile schema with types, ranges, and validation.
3. A respondent generation procedure (manual list, sampled from templates, LLM-generated profiles checked by schema, something else — unspecified).
4. A questionnaire: items, allowed answers, required vs optional.
5. An evaluation procedure that takes (feature context, profile) → structured answers.
6. Deterministic aggregation: by segment, overall (if shown), disagreement metrics you define.
7. Labeling: simulated, assumptions used, N, method.
8. Caps: N, time, money, retries.
9. Persistence of profiles, raw evaluations, aggregates, and the questionnaire version.
10. Interface for the CEO agent: when it may run the panel, what it receives, whether it may re-run.
11. UI for disagreement (SP-13) that does not privilege the average.
12. Trace of panel execution in Neatlogs (SP-11) at whatever granularity you choose.
13. Failure: partial panel, invalid JSON, timeout, all respondents collapsing to one answer.
14. Guardrail checks: no “customers said,” no survey claim.

## Locked decisions (spec only)

- We build this component ourselves (section 4).
- Complementary to Crustdata, not a replacement for real market data.
- Structured profiles, not personality/temperature as the diversity mechanism.
- Example archetypes and example profile fields are examples.
- Example questions and aggregated output are examples / illustrative, not a real forecast.
- Guardrails in section 3 (labels, no 1,000=1,000 interviews, structured archetypes, disagreement and sensitivity, validate important findings in the real world, N around 100–1,000 if cost/latency permit, diversity and decision quality over raw count).
- Must-have: small, diverse panel; segment-level aggregation and disagreement.
- Deterministic aggregation should be used wherever possible (section 6).
- Out of scope: claiming synthetic agents predict the real market; 100,000 expensive LLM calls in the demo.
- Demo beat: enterprise positive vs SMB price-sensitive disagreement (section 9) — desired *story* for demo narration, not a required live outcome.

## Dependencies

- Consumes: SP-01 (N, quality bar, whether demo results must match the story), SP-02, SP-03 (feature/product context), SP-04 (labels), SP-14 (cost/latency).
- Produces: respondent evaluations and segment aggregates for SP-08, SP-09, SP-13.
- May be invoked by SP-10.

## Questions

### Role and honesty

**SP-06-Q01.** What sentence must appear on every panel view as the legal/honest description of this layer?
**“Simulated panel — not real customer interviews or survey data.”** (Plus SP-02-Q42 **Simulated** label on every metric.)

**SP-06-Q02.** Are we allowed to show overall percentages at all, if we also show segments?
**Yes**, if **primary segment breakdown** is shown on the same view/report section and copy notes overall can hide disagreement (SP-04-Q18 pattern).

**SP-06-Q03.** Must the UI refuse the word “survey,” “respondents said,” and “market research” for this layer?
**Yes** — blocked in UI/export copy and report validator (SP-02-Q43, SP-04-Q23). Use **“simulated archetype”** / **“simulated choice distribution.”**

**SP-06-Q04.** Is the panel allowed to influence the recommendation if Crustdata is empty? If finance is empty?
**Yes**, with **Simulated** labeling and explicit assumptions (packaging, price shown). Recommendation must state reduced evidence base when Crustdata/finance missing; panel alone cannot justify “launch broadly” without finance when runway constraints exist (SP-04-Q29).

### Archetypes and N

**SP-06-Q05.** Which archetypes are in v1: the ten examples, a subset, a different set you will list?
**All ten spec archetypes** as **primary segment catalog** (SP-02-Q21): price-sensitive SMB, enterprise buyer, power user, existing loyal customer, low-engagement customer, technical evaluator, procurement-heavy enterprise, early adopter, conservative buyer, competitor-loyal customer.

**SP-06-Q06.** Must all listed archetypes appear in the demo, or is a subset enough to show diversity?
**Demo mode:** at least **6 distinct primary segments** represented (demo card ensures coverage). **Full mode:** aim for all 10 over time; minimum **4 segments** with n≥2 each for must-have.

**SP-06-Q07.** What is N for the demo (a number, a range, a cap, or “as many as time/cost allow up to X”)?
**Demo mode:** **N = 60** (fixed seed, fast). **Full mode:** default **N = 200**, user slider **50–1000**, hard cap **1000** (SP-01-Q06 aspiration within spec bound). Abort raise if user requests >1000.

**SP-06-Q08.** Is N the number of LLM calls, the number of profiles, or the number of completed evaluations?
**N = completed evaluations** (one `RespondentEvaluation` per archetype instance). LLM calls are **batched** (many evaluations per call) — not 1:1 with N.

**SP-06-Q09.** If each archetype is a template, how many respondents per archetype? Equal or unequal?
**Demo:** **equal** (6 per archetype × 10 = 60). **Full:** **equal by default**; optional **user market mix weights** from intake (SP-06-Q12) adjusts counts, rounded with min 1 per represented segment.

**SP-06-Q10.** How should we demonstrate diversity if N is small (example: N=10, one per example archetype)?
Show **side-by-side segment bars** on primary choice, **distinct primary segments**, sample **simulated objection snippets** (labeled), and checklist: ≥4 segments, ≥2 unique primary choices across segments, profile field variance (schema enums).

**SP-06-Q11.** What is the minimum N that still counts as a “panel” for must-have?
**Minimum 20 evaluations** with **≥4 primary segments** each n≥2. Below that: block “panel complete” and prompt user to increase N or use demo card.

**SP-06-Q12.** Are archetypes weighted by any real-world population, or unweighted, or user-weighted?
**Default unweighted** (equal per archetype). **Optional:** user “target market behavior” intake sets **segment weights** (Assumption, visible); aggregation for headline can show **unweighted** segment bars + footnote if weights applied to weighted overall.

### Profile schema

**SP-06-Q13.** Which profile fields are required in v1 (from the example list and any you add)?
Required: **company_size_band**, **segment** (primary archetype id), **budget_sensitivity** (1–5), **pain_level** (1–5), **workflow_summary** (short text), **ai_adoption_comfort** (1–5), **switching_cost** (low/med/high), **buying_authority** (none/influencer/decider), **primary_purchase_priority** (enum: price/features/security/ease/support). Optional: **industry**, **region**.

**SP-06-Q14.** For each required field, what is the type and allowed values (enum, number scale, free text)?
Enums/scales as in Q13; **workflow_summary** ≤280 chars; all scales **integers 1–5** with labels in UI; validation in JSON Schema (`contractVersion: 1` panel profile).

**SP-06-Q15.** Who authors profiles: humans before the demo, deterministic generation from templates, an LLM constrained by schema, or a mix?
**Mix:** **Deterministic template** per archetype (defaults) + **LLM fill** for `workflow_summary` and jitter within allowed enums seeded by `panelSeed`; user intake **biases** weights only, not silent overrides.

**SP-06-Q16.** If an LLM authors profiles, what validation makes them “structured” rather than theater?
**Schema validation** post-LLM; reject batch and retry; **no temperature diversity** — diversity from **archetype template + seeded jitter** on enums; invalid rows dropped and regenerated (cap retries).

**SP-06-Q17.** Must profiles be internally consistent (example: no budget authority + “cannot buy”)? Who enforces that?
**Yes.** **Deterministic rules:** e.g. `buying_authority=none` ⇒ cannot select “would pay extra” as primary without also marking **influencer override** Assumption. Enforced in validator + post-process fix or drop row.

**SP-06-Q18.** Must profiles be consistent with the seller’s existing customer base from SP-03, or are they a hypothetical market?
**Hypothetical market** informed by intake — not a statistical sample of seller’s customers. Copy: **“Simulated buyers; not your actual user base unless you imported segments.”**

**SP-06-Q19.** Are profiles reused across runs or regenerated?
Per **SP-02-Q09:** stable archetype ids; **new evaluations per panel run**. **Demo mode:** fixed `panelSeed` ⇒ reproducible profiles. **Full mode:** new seed per run unless user locks seed (advanced).

**SP-06-Q20.** Do we store names/personas, or only structured fields? If names, are they labeled fictional?
**Optional fictional first name** for UI drill-down only; **labeled fictional**; report aggregates use segment + id, not names as evidence.

### Questionnaire

**SP-06-Q21.** Is the multiple-choice reaction set a closed enum matching the spec’s five options?
**Yes** (SP-02-Q41): `pay_extra` | `use_if_included` | `try_not_pay` | `ignore` | `consider_switching`.

**SP-06-Q22.** Must we also always ask: strongest reason, main objection, plausible price range, evidence that would change their mind?
**Required:** **primary_choice** + **main_objection** (enum + optional 120 char text). **Optional but default on:** **strongest_reason** (text), **price_range_usd** (min/max Assumption-linked), **evidence_that_would_change_mind** (text). Demo questionnaire v1 includes all for report richness.

**SP-06-Q23.** Are additional questions allowed in v1? If yes, who writes them?
**No ad-hoc questions in v1** beyond versioned `PanelQuestionnaire`. Changes = new questionnaire version; agent cannot invent questions (SP-10).

**SP-06-Q24.** Is the questionnaire the same for every respondent?
**Yes** — same version per panel run; only **price shown** may vary by scenario slice (SP-06-Q25) as separate **panel run** or labeled assumption block.

**SP-06-Q25.** Is price shown to respondents? If yes, where does that price come from (intake, assumption, multiple prices for sensitivity)?
**Yes** when feature involves pricing. Source: **intake proposed price** or **Assumption** from agent with user visibility. **Sensitivity (SP-01-Q13):** optional **3 price points** = 3 panel runs or 1 run with explicit “evaluate at price X” instruction — default **single base price** per run for cost.

**SP-06-Q26.** What product context text is shown to every respondent, and who writes it?
**Canonical bundle:** feature proposal + short product summary from **SP-03 intake** (user), normalized by agent into **PanelStimulus** text shown in evaluation snapshot; user approves on intake recap (SP-03-Q37). **Exclude Crustdata** from stimulus (SP-06-Q30).

**SP-06-Q27.** Are answers required to be structured only, or is free text stored too?
**Structured required** for choice + objection enum; **bounded free text** optional fields stored and shown as **Simulated quotes**.

**SP-06-Q28.** If free text exists, who reads it — the agent, the UI, both, neither until later?
**Both** — agent for report objection clustering; UI shows **sample quotes** (max 3 per segment) labeled Simulated.

### Evaluation mechanism

**SP-06-Q29.** What mechanism produces a respondent’s answers? State the mechanism you want; do not leave this as “the model.” Options only you can choose (examples of categories, not recommended): human-written answer keys per archetype; rules over profile fields; one LLM call per respondent; batched LLM calls; mixed. If another mechanism, name it.
**Batched LLM evaluation:** **1 call per batch of 8–12 profiles** with shared `PanelStimulus`, output **JSON array** of answers per profile id. **No** per-respondent temperature. **Fallback:** rule-based **prior** from archetype template only if LLM fails after retries (labeled `fallback_panel`).

**SP-06-Q30.** If an LLM is used, what is the exact input it may see (profile fields, feature text, forbidden evidence)?
**Allowed:** profile fields, PanelStimulus (feature + product), **price scenario** Assumption text, segment label. **Forbidden:** Crustdata Evidence, finance outputs, “market proved”, competitor facts as customer truth.

**SP-06-Q31.** If an LLM is used, what structured output schema is required, and what happens when it violates the schema?
**JSON Schema** per evaluation row (choice enum, objection enum, optional text max lengths). **Violations:** retry batch once; drop bad rows and **regenerate** those profiles (max 2 cycles); log in Neatlogs.

**SP-06-Q32.** How many retries per respondent on invalid output?
**2 retries per batch**; per-row regen up to **2**; then row marked failed and excluded from n (continue partial panel per Q56).

**SP-06-Q33.** Must evaluation be reproducible given the same profile and feature text? If yes, what would make it so (not asking for a library — asking for your requirement)?
**Demo mode:** **required** reproducibility via fixed `panelSeed` + pinned model version in snapshot. **Full mode:** best-effort; snapshot stores model + seed; re-run may differ — show **panelRunId** in report.

**SP-06-Q34.** May evaluation be parallel? What is the max concurrency?
**Yes** — max **5 concurrent batch jobs** (cap LLM spend); deterministic merge by profile id.

**SP-06-Q35.** What is the wall-clock budget for the whole panel in the demo?
**Demo mode: 90s** wall clock for panel phase. **Full mode: 8 minutes** default (user notified); hard stop at 12m with partial results.

**SP-06-Q36.** What is the money budget for the whole panel in the demo?
Track **token spend** per Run; **demo cap ~$2 USD** equivalent at default N=60; **full cap ~$15** at N=1000 unless user raises (Assumption). Surface cost in Neatlogs (SP-14 aligns).

### Aggregation and disagreement

**SP-06-Q37.** How is a segment defined for aggregation (see also SP-02-Q21)?
**Primary segment** = archetype catalog id (SP-02-Q21 S1). Aggregates computed **per primarySegment**; tags optional for drill-down only.

**SP-06-Q38.** Must we aggregate every question by every segment, or only the primary reaction by a chosen segment cut?
**Mandatory:** **primary_choice** by **primarySegment**. **Optional:** objection enum distribution, price range stats. Not every optional text field aggregated automatically.

**SP-06-Q39.** What is the primary segment cut for the demo (example: SMB vs enterprise, or power user vs not)?
**Demo narrative cut:** **enterprise buyer + power user** vs **price-sensitive SMB** (rollup of two archetypes each side for compare bar). Underlying data still per-archetype; UI may show rollup card.

**SP-06-Q40.** How is “strongest segment” computed? The spec’s example names “enterprise power users” — is that a defined intersection or a narrative?
**Defined rule:** highest **% pay_extra OR use_if_included** among segments with **n≥5**; **“enterprise power users”** = tag intersection enterprise + power user **if** n≥5 else highest single archetype. Stored as **Inferred** summary with segment ids + counts.

**SP-06-Q41.** How is “main objection” computed across respondents (mode of enum, clustered free text, something else)?
**Primary:** **mode of `main_objection` enum** per segment. **Secondary:** top **3** short text objections by frequency (deterministic stem, no LLM cluster in v1).

**SP-06-Q42.** What disagreement displays are mandatory (side-by-side segment bars, min/max, qualitative quotes labeled simulated, vote split)?
**Mandatory:** side-by-side **segment bars** for primary choice, **table of segment × choice %**, **top objection per segment**, ≥1 **simulated quote** per polarized segment pair when text exists.

**SP-06-Q43.** Are overall percentages mandatory, optional, or forbidden?
**Optional** — show below segment grid with **“unweighted overall”** label; not the headline alone.

**SP-06-Q44.** If overall percentages are shown, must we also show that they can mislead?
**Yes** — one-line **“Overall share can hide segment disagreement”** when ≥2 segments differ by ≥20pp on primary choice.

**SP-06-Q45.** Do we weight by segment size, respondent count, or user-supplied market mix?
**Default:** equal respondent weight within segment; segments **not** population-weighted unless user enabled **market mix weights** (Q12) — then show both unweighted and weighted.

**SP-06-Q46.** What happens if a segment has n=0 or n=1?
**n=0:** omit segment from bars, list in **“no simulated respondents.”** **n=1:** show with **“low n”** badge; exclude from “strongest segment” rule unless only option.

**SP-06-Q47.** Are aggregation functions allowed to live in an LLM, or must they be deterministic code only (spec leans deterministic)?
**Deterministic code only** for counts, percentages, modes, strongest segment. LLM may **narrate** aggregates in report as **Inferred** linked to aggregate ids.

### Matching the demo story

**SP-06-Q48.** Must live panel results show enterprise enthusiasm and SMB price sensitivity, or is that only an illustrative story in the spec?
**Illustrative story only** (SP-01-Q21). Live results stand; demo **fixed seed** may produce a **coherent** story but is not guaranteed to match spec percentages.

**SP-06-Q49.** If live results contradict that story, do we still present them, re-run, or fall back to a labeled fixture?
**Present live results.** Operator may **re-run** with new seed once; **no** silent swap to fixture in Full mode. Demo mode uses **fixture replay** only when LLM panel fails (SP-06-Q58).

**SP-06-Q50.** Are we allowed to hand-author the demo panel outputs if they are labeled simulated fixtures? Would that still count as “a synthetic market panel” for must-have?
**Yes for CI / emergency demo** — `fixtures/panel/demo_run.json` labeled **Recorded simulated panel (fixture)**. Must-have demo prefers **live batched panel** at N=60; fixture is fallback.

### Assumptions the panel depends on

**SP-06-Q51.** Which assumptions must be listed next to panel results (price shown, packaging, who the buyer is, time to value, etc.)?
**Required assumption refs:** **price shown**, **packaging**, **panelSeed** (or “stochastic full mode”), **questionnaire version**, **N**, **model id**, **market mix weights** if any.

**SP-06-Q52.** If those assumptions change, do we automatically re-run the panel?
**Auto-suggest re-run** on material change (price, packaging, feature stimulus); user confirms (SP-03-Q04). Cosmetic text tweak → no auto re-run.

### Agent interface

**SP-06-Q53.** Does the agent trigger the panel once per Decision, or can it choose N, segments, or questions?
**Orchestrator runs standard panel** once per Run after stimulus locked; agent may request **one re-run** after material assumption change. Agent **cannot** change questionnaire or N without user UI (Full mode slider).

**SP-06-Q54.** What subset of panel state does the agent see (aggregates only, plus objections, plus all raw rows)?
**Aggregates + per-segment objection summaries + up to **5 sample evaluation rows** per segment** (ids for citation). Not full N raw dump in prompt (truncate per SP-05-Q29 pattern).

**SP-06-Q55.** May the agent query the panel interactively (“ask enterprise buyers about security”)? In or out of v1?
**Out of v1** — no interactive follow-up questions. Future: new panel run with amended questionnaire version.

### Failure

**SP-06-Q56.** What fraction of respondent failures aborts the panel vs continues with partial N?
Continue if **≥70%** evaluations succeed; else **panel failed**. Partial n shown with warning.

**SP-06-Q57.** If all answers collapse to one choice, is that a valid result, a quality failure, or a retry?
**Valid but flagged** `low_disagreement: true` — report must say simulated panel showed unanimity; **one optional re-run** with new seed in Full mode only.

**SP-06-Q58.** What do we show if the panel cannot run in time?
**Partial aggregates** if ≥ minimum N; else labeled **fixture fallback** or “panel unavailable” with recommendation caveats (SP-05-Q37 analog).

### Testing quality

**SP-06-Q59.** What observable checks prove “diversity” (unique profiles, unique objections, segment answer differences, something else)?
Automated: ≥4 segments n≥2; ≥2 distinct primary choices globally; ≥1 pair of segments with ≥15pp difference OR `low_disagreement` flagged; profile enum variance score > threshold.

**SP-06-Q60.** What observable checks prove “decision quality” for this layer?
**Manual judgment** primary (SP-01-Q09) + automated gates in Q59; report includes segment/objection narrative tied to aggregate ids.

**SP-06-Q61.** Do we snapshot a known panel run for regression, and is that snapshot allowed in the demo?
**Yes** — `fixtures/panel/regression_v1.json` for CI; **demo live preferred**; regression snapshot not shown to audience without **fixture** label.
