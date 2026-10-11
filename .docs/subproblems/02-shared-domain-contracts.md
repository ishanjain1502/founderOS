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

**SP-02-Q02.** Are there object types not in the spec that you want anyway? If yes, name them and why they are in scope despite the spec’s YAGNI-like hackathon bound.

**SP-02-Q03.** Is “Decision” the question, or the question plus the current recommendation, or a folder for the whole sandbox session?

**SP-02-Q04.** Is a “Run” a first-class object (one agent execution), or only a Neatlogs concern?

**SP-02-Q05.** Is “User” a first-class object, or is there a single implicit operator?

### Identity and lifecycle

**SP-02-Q06.** What uniquely identifies a Decision across revisions?

**SP-02-Q07.** What uniquely identifies an evidence item (URL, Crustdata id, hash of payload, something else)?

**SP-02-Q08.** What makes two evidence items duplicates that deterministic code must remove?

**SP-02-Q09.** Does a respondent have a stable id across re-runs of the panel, or is each panel execution a new set?

**SP-02-Q10.** When the panel is re-run after new evidence, do old respondent evaluations remain in state, get archived, or get replaced?

**SP-02-Q11.** When finance is re-run, do old cfo.ai outputs remain, get archived, or get replaced?

**SP-02-Q12.** What is the lifecycle of a Recommendation: draft, final, superseded, retracted, or another set you will define?

### Evidence, hypothesis, assumption, unknown

**SP-02-Q13.** Are these four different object types, four labels on one “Claim” type, or another structure you will define?

**SP-02-Q14.** Must every numeric input to cfo.ai point at an Assumption or Evidence object?

**SP-02-Q15.** Can a Hypothesis be promoted to Evidence inside this system, or only by ingesting a new external source?

**SP-02-Q16.** Who is allowed to create an Assumption: the agent, the user, both, or another rule?

**SP-02-Q17.** Who is allowed to edit or lock an Assumption after the first recommendation?

**SP-02-Q18.** Must every Unknown map to a “next validation step,” or can unknowns remain unaddressed?

### Panel objects

**SP-02-Q19.** Is an Archetype a template, and a Respondent an instance of that template?

**SP-02-Q20.** Can one respondent belong to multiple segments at once (example: enterprise AND power user)?

**SP-02-Q21.** What is a “segment” as an object — a named filter over profile fields, a predefined enum, or something else?

**SP-02-Q22.** What is the unit of aggregation: respondent, segment, question, or another unit?

**SP-02-Q23.** Are panel questions a first-class object (versioned questionnaire), or hardcoded for the demo?

**SP-02-Q24.** Must each evaluation store the exact prompt/profile the simulated respondent saw?

### Scenario and finance objects

**SP-02-Q25.** What fields make a Scenario complete enough to send to cfo.ai?

**SP-02-Q26.** Do scenarios share one global assumption set, have per-scenario overrides, both, or something else?

**SP-02-Q27.** Is “next validation experiment” part of a Recommendation, its own object, or part of a Scenario?

**SP-02-Q28.** Are financial outputs stored raw (vendor payload) plus a mapped subset, raw only, mapped only, or something else?

**SP-02-Q29.** Which financial concepts must exist in *our* objects even if cfo.ai names them differently: cost, pricing, revenue, margin, burn, runway, adoption?

### Recommendation and explanation

**SP-02-Q30.** What minimum structure must a Recommendation have to satisfy “evidence, assumptions, uncertainty, trade-offs, and next validation step”?

**SP-02-Q31.** Is disagreement (panel) a required field on the Recommendation, only on panel aggregates, or both?

**SP-02-Q32.** Is uncertainty a structured object (ranges, missing data, conflicting evidence) or free text?

**SP-02-Q33.** Must the Recommendation name the rejected alternatives explicitly?

### Time, source, version

**SP-02-Q34.** What clock is “now” for timestamps (operator machine, server, vendor, something else)?

**SP-02-Q35.** What timezone and precision are required?

**SP-02-Q36.** If Crustdata has no timestamp, is the evidence allowed, forbidden, or allowed with an explicit “time unknown” mark?

**SP-02-Q37.** Do we version schemas in v1, or freeze one shape for the hackathon?

### Validation

**SP-02-Q38.** Which fields are required vs optional on each object you keep in v1?

**SP-02-Q39.** What happens when an object fails validation: block the run, skip the item, mark invalid and continue, or another rule?

**SP-02-Q40.** Are units mandatory on money and percentages (USD, monthly, etc.)?

**SP-02-Q41.** Are enumerated choice answers for the panel a closed set matching the spec examples, or an open set?

### Language and copy

**SP-02-Q42.** What exact human-readable labels must be used for simulated vs observed vs assumed vs inferred?

**SP-02-Q43.** Is there a forbidden vocabulary list (example: “customers said,” “forecast,” “will generate $X”)?
