# SP-02 — Shared domain contracts

## Why this is a subproblem

The architecture diagram names objects that move between parts: user decision, market evidence, synthetic panel results, financial model inputs/outputs, scenarios, decision, revisions, assumptions, Entire history, Neatlogs traces.

The spec does not define schemas, identifiers, versions, timestamps, or which fields are required. If each integration invents its own shape, the CEO agent cannot compare, persist, revise, or explain a single decision state.

This subproblem is the **shared meaning** of those objects. It is not a database choice and not an API choice.

## Discussion

A contract here means: a named object, what it represents, what it must contain to be usable downstream, and what it must not pretend to be.

Examples of meaning the spec already implies but does not schema:

- **Decision** — the question under evaluation (“Should we launch AI-powered analytics as a premium add-on?”) plus context. Not the recommendation.
- **Company profile** — the existing SaaS company. Illustrative fields exist (cash, customers, MRR, runway, product). Completeness of a real profile is unspecified.
- **Feature proposal** — the thing being evaluated. “Premium add-on” is an example packaging, not a taxonomy.
- **Evidence item** — something retrieved (Crustdata) or otherwise observed, with source and timestamp “where available.”
- **Hypothesis** — a statement the agent formed. Must be distinguishable from evidence.
- **Assumption** — an explicit input used because evidence is missing or insufficient. The spec wants these visible, especially for finance.
- **Unknown** — a gap that is not filled by an assumption yet, or that should be validated in the real world.
- **Customer archetype / respondent profile** — structured fields, not “personality.”
- **Respondent evaluation** — a simulated answer to fixed choice questions plus optional reason/objection/price/what-would-change-mind.
- **Segment aggregate** — counts or rates by segment, plus disagreement, labeled simulated.
- **Scenario** — a strategic option (broad launch, enterprise-only, pilot, delay, do not build). Spec examples, not a closed enum unless you close it.
- **Financial inputs / outputs** — passed to and from cfo.ai, subject to what that product actually supports.
- **Recommendation** — a chosen path plus evidence, assumptions, uncertainty, trade-offs, next validation step.
- **Revision** — a later recommendation after new evidence, with an explanation of why it changed.
- **Run** — one agent execution over a decision state, inspectable in Neatlogs.

Without answers, implementers will have to guess:

- Is a respondent an archetype instance, or is an archetype a segment with many sampled respondents?
- Is “18% would pay extra” a count of respondents, a weighted segment rate, or an unweighted average the spec says not to blindly trust?
- Does a scenario include its own financial assumptions, or do all scenarios share one assumption set?
- When a revision happens, do we keep both recommendations as versions of one Decision, or start a new Decision?

Identifiers, time, and provenance matter at the end of implementation: the UI, Neatlogs, Entire (if linking to a run), and the revision loop all need to point at the same objects.

The spec also requires **deterministic** handling of schemas, validation, duplicate removal. That implies contracts are machine-checkable, not free text only. How strict, and who authors the schemas, is open.

## What “implemented to the end” would require

1. A closed list of object types that exist in application-owned state.
2. For each type: purpose, required meaning, optional meaning, what it is forbidden to imply.
3. Identity rules: what makes two evidence items duplicates; what makes two respondents distinct.
4. Provenance rules: source, time, producer (user, Crustdata, panel, cfo.ai, agent, human override).
5. Epistemic label on objects that can be mistaken for facts (see SP-04).
6. Validation rules that deterministic code can enforce (SP-10).
7. Versioning rules for revision (SP-09).
8. Serialization rules only after storage/transport are chosen (not chosen here).
9. Mapping notes from external product payloads into these objects, after those payloads are verified (SP-05, SP-07, SP-11, SP-12).
10. A glossary used by UI copy so labels stay consistent (SP-13).

## Locked decisions (spec only)

- Application-owned state includes: assumptions, scenarios, panel results, evidence, financial inputs/outputs, decision and revisions (architecture section).
- Panel results are simulated and must be labeled as such.
- Evidence from Crustdata should attach sources and timestamps where available.
- The agent must distinguish evidence from assumptions.
- Competitor signals must not be stored or presented as proof of demand.
- Deterministic code should handle schemas, validation, duplicate removal wherever possible.
- Illustrative panel percentages and company numbers are **not** real data and **not** a required schema.

## Dependencies

- Consumes: SP-01 (which objects exist in the first delivery).
- Produces: the shared vocabulary every other SP must use.
- Tightly coupled to SP-04 (epistemic labels on those objects).

## Questions

### Object inventory

**SP-02-Q01.** Which object types from the discussion list exist in v1? Which are forbidden?
(a) All discussion-list types in v1; none forbidden.

**SP-02-Q02.** Are there object types not in the spec that you want anyway? If yes, name them and why they are in scope despite the spec’s YAGNI-like hackathon bound.
(c) UX helpers only (e.g. **Demo scenario cards** that auto-fill stages); not first-class persisted domain objects.

**SP-02-Q03.** Is “Decision” the question, or the question plus the current recommendation, or a folder for the whole sandbox session?
(d) **Decision** = the question under evaluation only; parent **Session** holds company, feature, constraints, runs, evidence, panel, finance, recommendations, revisions.

**SP-02-Q04.** Is a “Run” a first-class object (one agent execution), or only a Neatlogs concern?
(d) First-class in app state (id, status, timestamps, links to outputs); **required** `neatlogsTraceId` on main agent runs (fallback runs labeled per SP-01-Q08).

**SP-02-Q05.** Is “User” a first-class object, or is there a single implicit operator?
**v1 (now):** implicit operator — no User type; anyone with the link can run (demo / open access). **Later (full product):** full User with auth and session ownership — explicitly out of scope for this effort.

### Identity and lifecycle

**SP-02-Q06.** What uniquely identifies a Decision across revisions?
(d) Stable **`decisionId`**; optional **`questionRevision`** (or equivalent) when the user materially edits the question or feature context.

**SP-02-Q07.** What uniquely identifies an evidence item (URL, Crustdata id, hash of payload, something else)?
(a) **Provider id when present** (e.g. Crustdata record id); otherwise **canonical URL** (or equivalent stable external key).

**SP-02-Q08.** What makes two evidence items duplicates that deterministic code must remove?
(d) **v1:** duplicate ⇔ same Q07 identity (provider id or canonical URL). Add content-hash dedup only if integration testing shows noisy duplicates; fallback evidence uses explicit stable keys (e.g. `fallback:…`).

**SP-02-Q09.** Does a respondent have a stable id across re-runs of the panel, or is each panel execution a new set?
(d) **Full mode:** stable archetype id; new **RespondentEvaluation** per panel run `(archetypeId, panelRunId)`. **Demo mode:** fixed seed / reproducible personas for a coherent story.

**SP-02-Q10.** When the panel is re-run after new evidence, do old respondent evaluations remain in state, get archived, or get replaced?
(b) Keep all evaluations in state; **UI and report default to the latest panel run**; older runs available for before/after comparison.

**SP-02-Q11.** When finance is re-run, do old cfo.ai outputs remain, get archived, or get replaced?
(b) Keep all finance outputs in state; **UI and report default to the latest finance run**; older runs available for comparison.

**SP-02-Q12.** What is the lifecycle of a Recommendation: draft, final, superseded, retracted, or another set you will define?
(a) **`draft`** while the agent run is in progress → **`current`** when published; prior **`current`** → **`superseded`** when a newer Recommendation is published (immutable snapshots; Revision records why it changed).

### Evidence, hypothesis, assumption, unknown

**SP-02-Q13.** Are these four different object types, four labels on one “Claim” type, or another structure you will define?
(c) **Evidence** is its own type (provenance, source, timestamps). **Hypothesis**, **Assumption**, and **Unknown** share a **Claim** (or equivalent) shape with `kind` discriminator.

**SP-02-Q14.** Must every numeric input to cfo.ai point at an Assumption or Evidence object?
(b) **Yes for reported inputs** — any number shown in UI/report/export must link to Evidence or Assumption; internal/system defaults allowed if explicitly labeled (e.g. system assumption).

**SP-02-Q15.** Can a Hypothesis be promoted to Evidence inside this system, or only by ingesting a new external source?
(d) **No promotion to Evidence** — only external ingest creates Evidence. Hypothesis gets resolution **`open` | `supported` | `refuted`** from linked Evidence (and revision narrative).

**SP-02-Q16.** Who is allowed to create an Assumption: the agent, the user, both, or another rule?
(d) **Both with rules:** user — budget, time, company facts they provide; agent — modeling gaps when evidence is insufficient (always visible); system — labeled defaults (SP-02-Q14).

**SP-02-Q17.** Who is allowed to edit or lock an Assumption after the first recommendation?
(d) **User may edit anytime** (triggers re-evaluation as needed); agent must not silently overwrite user assumptions — add new Claim versions or new assumptions instead. **Optional per-assumption `locked`** (user-set) blocks agent replacement without explicit override.

**SP-02-Q18.** Must every Unknown map to a “next validation step,” or can unknowns remain unaddressed?
Unknowns may **remain open** in Session state. **Material** = would materially change recommendation, scenario choice, or finance/panel conclusions (agent judgment, must cite linked Claims/Evidence in report). **`current` Recommendation** includes **at most 3** `nextValidationStep` items; additional open unknowns go in an **“Open unknowns”** appendix (no invented steps). Non-material gaps may stay unmapped.

### Panel objects

**SP-02-Q19.** Is an Archetype a template, and a Respondent an instance of that template?
Yes. **Archetype** = structured profile template (spec fields). **Respondent** = archetype instance in a panel run; **RespondentEvaluation** = that instance’s answers for a given `panelRunId` (SP-02-Q09).

**SP-02-Q20.** Can one respondent belong to multiple segments at once (example: enterprise AND power user)?
**v1 (S1):** **One primary segment** per respondent for **headline** aggregates (no double-counting on summary charts). **Optional segment tags** (e.g. enterprise + power user) for drill-down only; report footnotes when tags overlap. Dynamic multi-segment rules deferred (see Q21).

**SP-02-Q21.** What is a “segment” as an object — a named filter over profile fields, a predefined enum, or something else?
**v1 (S1):** **Fixed segment catalog** aligned with spec archetypes (enum / predefined labels). Archetypes/respondents get **primarySegment** + optional **tags** from that catalog. **No `SegmentDefinition` rules engine** in v1 (no auto-segments from free-text market behavior); user market input informs archetype generation, not runtime segment DSL.

**SP-02-Q22.** What is the unit of aggregation: respondent, segment, question, or another unit?
**Primary: segment** (rates, counts, disagreement). **Retain respondent-level** rows for drill-down and revision. Cross-question rollups are derived, not the primary stored aggregate.

**SP-02-Q23.** Are panel questions a first-class object (versioned questionnaire), or hardcoded for the demo?
**First-class, versioned `PanelQuestionnaire`** (id + version). **Demo mode** may pin a known questionnaire version; **Full mode** may extend questions but **choice enums** stay aligned with SP-02-Q41 for comparability.

**SP-02-Q24.** Must each evaluation store the exact prompt/profile the simulated respondent saw?
Yes. Store a **snapshot** (profile fields + question text/options version + model/settings hash) on each RespondentEvaluation for reproducibility, report citations, and demo fixed-seed replay.

### Scenario and finance objects

**SP-02-Q25.** What fields make a Scenario complete enough to send to cfo.ai?
Minimum: **`scenarioId`**, **strategy kind** (launch broad / segment / pilot / delay / do-not-build — extensible enum), **scope** (who gets the change), **references to Assumptions** (adoption, pricing, timing, cost-to-build where relevant), **links to latest panel/finance run ids** used for this scenario, **human label** for report. Incomplete scenarios are not sent to cfo.ai until required assumption refs exist (SP-02-Q14).

**SP-02-Q26.** Do scenarios share one global assumption set, have per-scenario overrides, both, or something else?
**Both:** Session **base assumptions** (company, budget, time, feature context) + **per-scenario overrides** (adoption, pricing, rollout scope). Overrides must reference Assumption objects, not orphan numbers.

**SP-02-Q27.** Is “next validation experiment” part of a Recommendation, its own object, or part of a Scenario?
**Part of the Recommendation** (required field). May **reference** a Scenario (e.g. recommended pilot) by `scenarioId` but is not a separate persisted type in v1.

**SP-02-Q28.** Are financial outputs stored raw (vendor payload) plus a mapped subset, raw only, mapped only, or something else?
**Raw vendor payload + mapped canonical subset** per finance run (`financeRunId`). Report and UI use mapped subset; raw retained for audit and re-mapping if cfo.ai schema differs.

**SP-02-Q29.** Which financial concepts must exist in *our* objects even if cfo.ai names them differently: cost, pricing, revenue, margin, burn, runway, adoption?
**All listed** must appear in the **mapped** financial output model (nullable if vendor omits): **cost**, **pricing**, **revenue**, **margin**, **burn**, **runway**, **adoption** — with explicit “not provided by vendor” flags, never invented numbers (SP-01-Q11).

### Recommendation and explanation

**SP-02-Q30.** What minimum structure must a Recommendation have to satisfy “evidence, assumptions, uncertainty, trade-offs, and next validation step”?
Structured report core: **`headline`**, **`chosenScenarioId`** (or explicit “custom path”), **`evidenceRefs[]`** (with per-source “what it represented”), **`assumptionRefs[]`**, **`inferences[]`** (agent conclusions tied to evidence/assumptions/panel/finance ids), **`uncertainty`** (SP-02-Q32), **`tradeoffs[]`**, **`rejectedAlternatives[]`** (SP-02-Q33), **`nextValidationStep`**, **`runId`**, links to latest panel/finance aggregates. Narrative prose optional but must not replace structured refs.

**SP-02-Q31.** Is disagreement (panel) a required field on the Recommendation, only on panel aggregates, or both?
**Both.** **Segment aggregates** hold full disagreement; **Recommendation** must **summarize** material segment disagreement that drove the choice (not only averages).

**SP-02-Q32.** Is uncertainty a structured object (ranges, missing data, conflicting evidence) or free text?
**Structured primary:** `missingData[]`, `conflicts[]` (refs to Evidence/Claims), optional **ranges** where cfo/panel provide them; **short narrative** allowed as supplement, not substitute.

**SP-02-Q33.** Must the Recommendation name the rejected alternatives explicitly?
Yes. **`rejectedAlternatives[]`** names other Scenarios/strategies considered and **why** they were not chosen (ties to SP-01 comparison / pilot vs broad).

### Time, source, version

**SP-02-Q34.** What clock is “now” for timestamps (operator machine, server, vendor, something else)?
**Server clock (UTC)** for all persisted timestamps. Vendor timestamps stored as-provided in Evidence; **`retrievedAt`** always set by our server on ingest.

**SP-02-Q35.** What timezone and precision are required?
Persist **ISO 8601 UTC** with **millisecond** precision. UI/report display may use **browser/local** timezone for humans; export includes UTC.

**SP-02-Q36.** If Crustdata has no timestamp, is the evidence allowed, forbidden, or allowed with an explicit “time unknown” mark?
**Allowed** with **`sourceTimeUnknown: true`** (or equivalent) and mandatory **`retrievedAt`** from our ingest. Report must not imply freshness beyond what is known.

**SP-02-Q37.** Do we version schemas in v1, or freeze one shape for the hackathon?
**Freeze one contract for hackathon:** every object carries **`contractVersion: 1`**. Breaking changes bump version later; v1 validators reject unknown required-shape violations.

### Validation

**SP-02-Q38.** Which fields are required vs optional on each object you keep in v1?
**v2 sketch:** required vs optional per type in **Appendix A** below; canonical enforcement in **JSON Schema** under `contractVersion: 1` when code lands. Every object: **`id`**, **`contractVersion`**, **`createdAt`**, **`source`** (provenance); Session-scoped types also **`sessionId`**, **`decisionId`** where applicable.

**SP-02-Q39.** What happens when an object fails validation: block the run, skip the item, mark invalid and continue, or another rule?
**Tiered:** **Block run** for Session/Decision/Run/Recommendation publish and **cfo.ai send** if finance inputs invalid. **Skip or quarantine** duplicate Evidence (SP-02-Q08). **Mark invalid + continue** for non-critical ingest (single bad Crustdata row) with Neatlogs visibility. **No silent drops** of user-entered assumptions.

**SP-02-Q40.** Are units mandatory on money and percentages (USD, monthly, etc.)?
Yes. All money fields: **currency + period** (e.g. USD, monthly). Percentages: **0–1 or 0–100 with explicit convention** on the field. Validation fails on unitless reported numbers.

**SP-02-Q41.** Are enumerated choice answers for the panel a closed set matching the spec examples, or an open set?
**Closed set** for primary Likert/choice answers (spec examples: would pay extra / use if included / try not pay / ignore / consider switching). **Optional open-text** fields for reason, objection, price range, what would change mind.

### Language and copy

**SP-02-Q42.** What exact human-readable labels must be used for simulated vs observed vs assumed vs inferred?
Glossary (UI + export): **Observed** — external evidence (Crustdata, etc.); **Simulated** — synthetic panel; **Assumed** — user/agent/system assumption; **Inferred** — agent conclusion from linked sources (not evidence). **Placement (L2, SP-01-Q29):** mandatory on **export/report** and on **any UI number, chart, or statistic**; other screens should use the same terms when showing data. These four terms are **stable** wherever epistemic type is shown.

**SP-02-Q43.** Is there a forbidden vocabulary list (example: “customers said,” “forecast,” “will generate $X”)?
Yes, for user-facing copy and export: avoid **“customers said,” “survey,” “forecast,” “will generate,” “proven demand,” “real market proof.”** Use SP-02-Q42 labels. Competitor activity ≠ demand (spec). LLM fallback outputs must be labeled **fallback / illustrative** when not from Crustdata/cfo. Enforce in **report generation** (agent + post-check), not UI copy alone.

## Appendix A — v1 required-field sketch (`contractVersion: 1`)

Illustrative minimums for alignment before JSON Schema exists. Optional fields omitted unless critical.

| Type | Required (meaning) |
|------|---------------------|
| **Session** | `id`, `createdAt`, `mode` (demo \| full) |
| **Decision** | `id`, `sessionId`, `questionText`, `questionRevision` |
| **Company profile** | `sessionId`, product summary, numeric facts with units where applicable |
| **Feature proposal** | `sessionId`, description, change type (feature \| pricing \| ui \| other) |
| **Evidence** | `id`, `sessionId`, `source`, `summary`, external identity (Q07), `retrievedAt` |
| **Claim** (H/A/U) | `id`, `sessionId`, `kind`, `statement`; Assumption adds `value` + unit when numeric |
| **Run** | `id`, `sessionId`, `status`, `startedAt`; `neatlogsTraceId` unless `fallback` run; optional `codeImpactRunId`; `missingData.codeImpact` when skipped |
| **CodeImpactArtifact** | `id` (`codeImpactRunId`), `runId`, `repoRef`, `commitSha`, `candidatePaths[]`, summarized tool outputs, `epistemicLabel` (Inferred), optional `skippedReason` |
| **Archetype** | `id`, `sessionId`, structured profile fields, `primarySegment`, optional `tags[]` |
| **RespondentEvaluation** | `id`, `panelRunId`, `archetypeId`, `primaryChoice` (Q41 enum), `snapshot` |
| **Segment aggregate** | `panelRunId`, `primarySegment`, counts/rates, `simulatedLabel`, disagreement summary |
| **Scenario** | `id`, `sessionId`, `strategyKind`, `scope`, `assumptionRefs[]`, label |
| **Financial I/O** | `financeRunId`, `scenarioId`, mapped fields (Q29) + `rawPayload` ref |
| **Recommendation** | SP-02-Q30 core fields, `status` (Q12), ≤3 validation steps (Q18) |
| **Revision** | `id`, `priorRecommendationId`, `newRecommendationId`, `reason`, triggering evidence refs |
