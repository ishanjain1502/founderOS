# SP-04 — Evidence, assumptions, and uncertainty

## Why this is a subproblem

The spec’s guiding principle is to make uncertainty explicit, gather relevant evidence, test assumptions, compare options, and choose the next best action.

This is not a feature screen. It is the rule layer that stops the sandbox from becoming a confident story generator. Crustdata, the panel, cfo.ai, the recommendation, the UI, and the revision loop all fail the spec if they collapse facts, inferences, assumptions, and unknowns into one blob.

## Discussion

The spec repeatedly draws distinctions that software will not draw unless we force it:

| Kind | Spec intent | Common failure if mixed |
|---|---|---|
| Observed evidence | Crustdata signals, timestamps, sources | “Competitors have analytics, so customers want ours.” |
| Inference / hypothesis | Agent interpretation of evidence | Stored as if it were retrieved. |
| Assumption | Explicit stand-in used to model or simulate | Hidden inside a financial output or an LLM paragraph. |
| Simulated result | Panel aggregates | Spoken as “customers said.” |
| Financial output | cfo.ai given those assumptions | Shown as a forecast the company will hit. |
| Unknown | Gap that needs real-world validation | Filled silently by model priors. |

Section 3 says the CEO should not blindly trust the average. Segment disagreement is a first-class signal. Uncertainty is therefore not a single 0–100 confidence score. The spec says: “Show disagreement and sensitivity to assumptions, not just one confidence score.”

Sensitivity is listed as nice-to-have for price and adoption. Disagreement is a must-have for the panel. Those are different uncertainty displays. Whether financial uncertainty (ranges) is must-have is implied by the risk table (“Show scenarios, ranges, and sensitivity to inputs”) even though sensitivity analysis is nice-to-have in section 8. That tension is unresolved until you decide which sentence wins for v1.

Revision (section 2.10, 5, 7, 9) only means something if assumptions are addressable objects. “New evidence contradicts an assumption” requires: named assumption, named new evidence, a comparison, a new recommendation, an explanation of the change.

There is also a **human** uncertainty problem: the operator may believe illustrative numbers. Labeling rules belong here and in SP-13. Enforcement (copy-only vs blocked phrases vs schema enums) is open.

This layer must be usable by deterministic validation: an evidence item without a source should be handled by a rule, not by hoping the LLM mentions the source.

## What “implemented to the end” would require

1. A taxonomy of claim kinds (names you choose in SP-02-Q13) used everywhere.
2. Rules for creating, editing, locking, and contradicting assumptions.
3. Rules for attaching sources/timestamps and for missing provenance.
4. Rules that forbid treating competitor activity as demand (enforced where?).
5. A representation of disagreement (panel) and of input sensitivity (finance), at whatever scope SP-01 selects.
6. A representation of unknowns and their link to “next validation step.”
7. UI/report copy rules so a viewer can see the taxonomy without reading this doc.
8. Agent instructions or deterministic filters so the model cannot emit forbidden claims as facts.
9. Revision predicate: what counts as “contradicts an assumption.”
10. Tests or checklists that a run failed if it hid assumptions or mixed simulated with observed.

## Locked decisions (spec only)

- Distinguish evidence from assumptions (section 2.3).
- Label all panel results as simulated (section 3 guardrails).
- Do not claim 1,000 simulated respondents equal 1,000 real interviews.
- Do not infer that a competitor signal proves the feature will succeed (section 4 Crustdata; out of scope list).
- Financial outputs are only as reliable as inputs and actual cfo.ai capabilities; do not present speculative adoption as verified forecasts (section 4 cfo.ai).
- Show disagreement and sensitivity to assumptions, not just one confidence score (section 3). Note: section 8 lists sensitivity analysis as nice-to-have — see questions.
- If new evidence contradicts an assumption, the agent can re-evaluate (section 2.10).
- Use clearly labeled illustrative assumptions wherever real customer data or validated financial forecasts are unavailable (section 9).
- Separate observed facts from inferences and hypotheses (section 10).
- Goal is not to claim AI can know the future (sections 11–12).

## Dependencies

- Consumes: SP-01 (how strict claim-safety is for v1), SP-02 (object types).
- Constrains: SP-05, SP-06, SP-07, SP-08, SP-09, SP-10, SP-13, SP-14.

## Questions

### Taxonomy

**SP-04-Q01.** What are the official kinds of statement in v1? Propose nothing until you name them. Candidates the spec uses: evidence, inference, hypothesis, assumption, simulated result, financial output, unknown, recommendation. Keep, merge, split, or replace.

**SP-04-Q02.** Is “hypothesis” different from “inference”?

**SP-04-Q03.** Is a panel aggregate a kind of evidence, a kind of simulation, or its own kind?

**SP-04-Q04.** Is a cfo.ai number “evidence,” “model output,” or “assumption-dependent projection”?

**SP-04-Q05.** Can a statement have more than one kind (example: inference built on evidence)? If yes, how is that shown?

### Provenance

**SP-04-Q06.** What is the minimum provenance for an evidence item: source identifier, URL, vendor, retrieved-at, vendor timestamp, raw payload, or another set?

**SP-04-Q07.** If provenance is incomplete, is the item unusable, usable with a warning, or usable silently?

**SP-04-Q08.** Must inferences cite the evidence ids they rest on?

**SP-04-Q09.** Must assumptions cite why they were needed (missing evidence, demo fixture, user override)?

### Assumptions

**SP-04-Q10.** What is the complete list of assumptions the demo is allowed to use if you already know it? If you do not, who is allowed to invent them during a run?

**SP-04-Q11.** Must every assumption have an owner (user vs agent vs spec fixture)?

**SP-04-Q12.** Must every assumption have a plausible range, a single point, or either?

**SP-04-Q13.** Which assumptions are locked for the demo so the story stays stable?

**SP-04-Q14.** Which assumptions the agent may change without asking the operator?

**SP-04-Q15.** Which assumption changes require operator approval?

**SP-04-Q16.** How is an assumption marked “contradicted”? Who decides, with what rule?

**SP-04-Q17.** If two assumptions conflict, is the run invalid until resolved?

### Uncertainty display

**SP-04-Q18.** Section 3 forbids relying on one confidence score. Are we forbidden from showing *any* single score, or only from showing a score without disagreement/sensitivity?

**SP-04-Q19.** For v1, is sensitivity analysis required (risk table) or optional (section 8 nice-to-have)? Pick which spec sentence governs v1.

**SP-04-Q20.** What disagreement must always be visible: segment vs segment, question vs question, respondent-level spread, qualitative objections, or another set?

**SP-04-Q21.** How should uncertainty be shown in the recommendation itself (ranges, lists of unknowns, “do not know,” all of these, something else)?

**SP-04-Q22.** Are we allowed to rank recommendations as high/medium/low confidence?

### Forbidden conclusions

**SP-04-Q23.** What exact conclusions are forbidden even if the LLM produces them (write the list you want enforced)?

**SP-04-Q24.** Where is that list enforced: schema, output validator, UI copy, agent prompt, human presenter script, all, or another place?

**SP-04-Q25.** If the agent emits a forbidden conclusion, is the run failed, the sentence stripped, the sentence relabeled, or another behavior?

**SP-04-Q26.** Is “enterprise power users are enthusiastic” allowed as a simulated finding, and what label must accompany it?

### Unknowns and validation steps

**SP-04-Q27.** Must the system always output at least one real-world validation step?

**SP-04-Q28.** Which validation methods are allowed to be recommended: real interviews, existing feedback, landing-page tests, pilots, others from the spec, others you add?

**SP-04-Q29.** Can the agent recommend “do not validate, just ship” or “do not validate, just kill”? Under what constraint inputs?

**SP-04-Q30.** Must each recommended validation step name which assumption it would test, at what cost/time, and what result would change the decision?

### Revision semantics

**SP-04-Q31.** What new inputs count as “new evidence” (Crustdata refresh, user-pasted signal, failed pilot, changed assumption, all of these)?

**SP-04-Q32.** Does any new evidence trigger re-evaluation, or only evidence that contradicts a named assumption?

**SP-04-Q33.** Must the system show a diff: previous recommendation vs new, previous assumptions vs new?

**SP-04-Q34.** If new evidence is itself simulated, may it trigger revision, or only observed/user-provided evidence?

### Consistency with illustrative example

**SP-04-Q35.** In the spec’s example, competitor activity is *not* proof of demand, and the agent still hypothesizes analytics may be strategically important. Must v1 reproduce that exact epistemic move, or only the general rule?

**SP-04-Q36.** Must every Crustdata finding have a paired “this does not prove demand” note in the UI?
