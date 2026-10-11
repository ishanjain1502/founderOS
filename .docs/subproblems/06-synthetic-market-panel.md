# SP-06 — Synthetic market panel

## Why this is a subproblem

This is the component the spec says **we build ourselves**. It is not Crustdata and not real interviews. It is a simulation layer so the agent can explore how different buyer types might react and which assumptions deserve real-world validation.

Must-have: a small, diverse synthetic market panel; segment-level aggregation and disagreement.

This is the largest custom behavior in the spec. Almost every operational detail is still open.

## Discussion

The spec is careful about what this panel **is not**:

- Not a claim that we surveyed real customers.
- Not “1,000 simulated respondents = 1,000 interviews.”
- Not diversity-by-temperature.
- Not a market forecast.

What it **is**: structured archetypes, bounded evaluations, aggregation by segment, disagreement, visible assumptions, labels that say simulated.

That creates several independent design problems that the spec does not solve:

**1. What is a respondent?**  
Ten named example archetypes exist (price-sensitive SMB, enterprise buyer, power user, …). Unspecified: whether we implement exactly those ten, whether each archetype is one respondent or a population, whether “around 100–1,000” means 100 instances sampled from those templates, and how diversity is measured.

**2. What is a profile?**  
Example fields: company size and segment, budget sensitivity, current pain level, existing workflow, AI adoption comfort, switching costs, buying authority, primary purchase priority. Unspecified: types, units, allowed values, who fills them, whether they are independent, whether they must be consistent with the company in SP-03.

**3. How does a respondent evaluate?**  
The spec shows multiple-choice reactions (pay extra, use if included, try but not pay more, ignore, consider switching) plus optional reason, objection, plausible price range, and what evidence would change their mind. Unspecified: whether those questions are fixed, whether evaluation is an LLM-with-profile, a rubric, a lookup table, or something else. Choosing any of those without you would be an assumption.

**4. How do we aggregate without trusting the average?**  
The CEO must notice segment disagreement (enterprise power users vs price-sensitive SMBs in the example). Unspecified: weights (equal respondent vs equal segment vs population weights), what to do with small n, how to show disagreement, whether the illustrative 18%/47%/29%/6% are a target story or an outcome the live panel may not match.

**5. Boundedness.**  
“Bounded evaluations,” “batching, bounded samples, structured outputs, and deterministic aggregation,” “start with around 100–1,000 if cost and latency permit,” “not 100,000 expensive LLM calls.” Unspecified: actual N for the demo, parallelism, timeout, cost ceiling, what “bounded” means if an LLM is used (token limits, schema, one question vs many).

**6. Relationship to intake and evidence.**  
Respondents need “the same proposed feature and product context.” They should not be told Crustdata findings as if those were customer facts unless you decide they should. Whether the panel is allowed to see pricing, roadmap, or financial distress of the seller is open.

**7. Quality bar.**  
The spec wants diversity and decision quality, not max N. “Quality” for a simulation is undefined: internal consistency with profile? Distinct objections by segment? Stable under re-run? Human-judged plausibility?

Until those are answered, “implement the panel” is not a task; it is a pile of unmade products.

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
- Demo beat: enterprise positive vs SMB price-sensitive disagreement (section 9) — this is a desired *story*, not a proof that live sampling must always produce it.

## Dependencies

- Consumes: SP-01 (N, quality bar, whether demo results must match the story), SP-02, SP-03 (feature/product context), SP-04 (labels), SP-14 (cost/latency).
- Produces: respondent evaluations and segment aggregates for SP-08, SP-09, SP-13.
- May be invoked by SP-10.

## Questions

### Role and honesty

**SP-06-Q01.** What sentence must appear on every panel view as the legal/honest description of this layer?

**SP-06-Q02.** Are we allowed to show overall percentages at all, if we also show segments?

**SP-06-Q03.** Must the UI refuse the word “survey,” “respondents said,” and “market research” for this layer?

**SP-06-Q04.** Is the panel allowed to influence the recommendation if Crustdata is empty? If finance is empty?

### Archetypes and N

**SP-06-Q05.** Which archetypes are in v1: the ten examples, a subset, a different set you will list?

**SP-06-Q06.** Must all listed archetypes appear in the demo, or is a subset enough to show diversity?

**SP-06-Q07.** What is N for the demo (a number, a range, a cap, or “as many as time/cost allow up to X”)?

**SP-06-Q08.** Is N the number of LLM calls, the number of profiles, or the number of completed evaluations?

**SP-06-Q09.** If each archetype is a template, how many respondents per archetype? Equal or unequal?

**SP-06-Q10.** How should we demonstrate diversity if N is small (example: N=10, one per example archetype)?

**SP-06-Q11.** What is the minimum N that still counts as a “panel” for must-have?

**SP-06-Q12.** Are archetypes weighted by any real-world population, or unweighted, or user-weighted?

### Profile schema

**SP-06-Q13.** Which profile fields are required in v1 (from the example list and any you add)?

**SP-06-Q14.** For each required field, what is the type and allowed values (enum, number scale, free text)?

**SP-06-Q15.** Who authors profiles: humans before the demo, deterministic generation from templates, an LLM constrained by schema, or a mix?

**SP-06-Q16.** If an LLM authors profiles, what validation makes them “structured” rather than theater?

**SP-06-Q17.** Must profiles be internally consistent (example: no budget authority + “cannot buy”)? Who enforces that?

**SP-06-Q18.** Must profiles be consistent with the seller’s existing customer base from SP-03, or are they a hypothetical market?

**SP-06-Q19.** Are profiles reused across runs or regenerated?

**SP-06-Q20.** Do we store names/personas, or only structured fields? If names, are they labeled fictional?

### Questionnaire

**SP-06-Q21.** Is the multiple-choice reaction set a closed enum matching the spec’s five options?

**SP-06-Q22.** Must we also always ask: strongest reason, main objection, plausible price range, evidence that would change their mind?

**SP-06-Q23.** Are additional questions allowed in v1? If yes, who writes them?

**SP-06-Q24.** Is the questionnaire the same for every respondent?

**SP-06-Q25.** Is price shown to respondents? If yes, where does that price come from (intake, assumption, multiple prices for sensitivity)?

**SP-06-Q26.** What product context text is shown to every respondent, and who writes it?

**SP-06-Q27.** Are answers required to be structured only, or is free text stored too?

**SP-06-Q28.** If free text exists, who reads it — the agent, the UI, both, neither until later?

### Evaluation mechanism

**SP-06-Q29.** What mechanism produces a respondent’s answers? State the mechanism you want; do not leave this as “the model.” Options only you can choose (examples of categories, not recommended): human-written answer keys per archetype; rules over profile fields; one LLM call per respondent; batched LLM calls; mixed. If another mechanism, name it.

**SP-06-Q30.** If an LLM is used, what is the exact input it may see (profile fields, feature text, forbidden evidence)?

**SP-06-Q31.** If an LLM is used, what structured output schema is required, and what happens when it violates the schema?

**SP-06-Q32.** How many retries per respondent on invalid output?

**SP-06-Q33.** Must evaluation be reproducible given the same profile and feature text? If yes, what would make it so (not asking for a library — asking for your requirement)?

**SP-06-Q34.** May evaluation be parallel? What is the max concurrency?

**SP-06-Q35.** What is the wall-clock budget for the whole panel in the demo?

**SP-06-Q36.** What is the money budget for the whole panel in the demo?

### Aggregation and disagreement

**SP-06-Q37.** How is a segment defined for aggregation (see also SP-02-Q21)?

**SP-06-Q38.** Must we aggregate every question by every segment, or only the primary reaction by a chosen segment cut?

**SP-06-Q39.** What is the primary segment cut for the demo (example: SMB vs enterprise, or power user vs not)?

**SP-06-Q40.** How is “strongest segment” computed? The spec’s example names “enterprise power users” — is that a defined intersection or a narrative?

**SP-06-Q41.** How is “main objection” computed across respondents (mode of enum, clustered free text, something else)?

**SP-06-Q42.** What disagreement displays are mandatory (side-by-side segment bars, min/max, qualitative quotes labeled simulated, vote split)?

**SP-06-Q43.** Are overall percentages mandatory, optional, or forbidden?

**SP-06-Q44.** If overall percentages are shown, must we also show that they can mislead?

**SP-06-Q45.** Do we weight by segment size, respondent count, or user-supplied market mix?

**SP-06-Q46.** What happens if a segment has n=0 or n=1?

**SP-06-Q47.** Are aggregation functions allowed to live in an LLM, or must they be deterministic code only (spec leans deterministic)?

### Matching the demo story

**SP-06-Q48.** Must live panel results show enterprise enthusiasm and SMB price sensitivity, or is that only an illustrative story in the spec?

**SP-06-Q49.** If live results contradict that story, do we still present them, re-run, or fall back to a labeled fixture?

**SP-06-Q50.** Are we allowed to hand-author the demo panel outputs if they are labeled simulated fixtures? Would that still count as “a synthetic market panel” for must-have?

### Assumptions the panel depends on

**SP-06-Q51.** Which assumptions must be listed next to panel results (price shown, packaging, who the buyer is, time to value, etc.)?

**SP-06-Q52.** If those assumptions change, do we automatically re-run the panel?

### Agent interface

**SP-06-Q53.** Does the agent trigger the panel once per Decision, or can it choose N, segments, or questions?

**SP-06-Q54.** What subset of panel state does the agent see (aggregates only, plus objections, plus all raw rows)?

**SP-06-Q55.** May the agent query the panel interactively (“ask enterprise buyers about security”)? In or out of v1?

### Failure

**SP-06-Q56.** What fraction of respondent failures aborts the panel vs continues with partial N?

**SP-06-Q57.** If all answers collapse to one choice, is that a valid result, a quality failure, or a retry?

**SP-06-Q58.** What do we show if the panel cannot run in time?

### Testing quality

**SP-06-Q59.** What observable checks prove “diversity” (unique profiles, unique objections, segment answer differences, something else)?

**SP-06-Q60.** What observable checks prove “decision quality” for this layer?

**SP-06-Q61.** Do we snapshot a known panel run for regression, and is that snapshot allowed in the demo?
