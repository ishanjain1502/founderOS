# SP-08 — Scenario comparison, recommendation, and next experiment

## Why this is a subproblem

Workflow steps 7 and 9: compare alternatives; decide and explain. This is the “CEO” output: a path, with evidence, assumptions, uncertainty, trade-offs, and the next validation step.

Must-have: a clear final recommendation with evidence, assumptions, and uncertainty.

If this is just an LLM essay over the other tools’ dumps, the product is a summarizer, not a decision sandbox.

## Discussion

The spec’s example alternatives:

- launch to everyone
- launch only to enterprise customers
- run a pilot
- delay
- do not build

The example recommendation: **run a small enterprise validation pilot first**, not a broad launch. Motivated by simulated segment disagreement (enterprise power users vs SMBs) plus finance on explicit assumptions.

Several different jobs are packed here:

**Generate alternatives.** Who invents the scenario list? Frozen for the demo? Agent? User? Spec examples only?

**Score alternatives.** Using panel aggregates, Crustdata evidence, cfo.ai outputs, goals/constraints from intake. Weighting is unspecified. The spec says deterministic code should handle scenario comparisons wherever possible. That could mean: our code compares structured scorecards; or our code only checks consistency while an LLM writes the judgment.

**Choose.** A single recommended path. Unspecified: ties, “insufficient evidence,” refusing to recommend, recommending a portfolio (pilot AND delay hiring), vs one enum value.

**Explain.** Evidence, assumptions, uncertainty, trade-offs. This must obey SP-04. A fluent paragraph that does not cite object ids fails the inspectability story even if it sounds like a CEO.

**Name the next experiment.** Not the same as the recommended strategy, though in the example they coincide (the strategy *is* a validation pilot). For “do not build,” the next step might be “stop” or “validate a different problem.” Unspecified.

**Not blindly trust the average.** The comparison must be able to prefer a targeted path when segments disagree, even if the overall mean looks lukewarm. That is a comparison rule, not a vibe.

Nice-to-have: multiple launch strategies; comparison view broad vs pilot. Must-have might be satisfied by two scenarios and a paragraph. You have to say.

The recommendation is also the thing that **revises** in SP-09. Comparison therefore needs a stable scenario identity so “we changed from pilot to delay” is a real diff.

## What “implemented to the end” would require

1. A defined set or generator of scenarios.
2. Completeness rules: a scenario cannot enter comparison without required panel/finance/evidence pieces you specify (or can it, with gaps?).
3. A comparison artifact: table, scorecard, prose, all — unspecified UI, but the *information* must exist.
4. A choice procedure (deterministic rule, LLM judgment over a structured packet, operator pick, hybrid).
5. A Recommendation object satisfying SP-02/SP-04 minimums.
6. Explicit rejected alternatives and trade-offs, if you require them.
7. A next-validation-step object linked to unknowns/assumptions.
8. Display in the demo beat “show the decision.”
9. Persistence and later superseding (SP-09).
10. Tracing of why the choice was made (SP-11), not only the final text.

## Locked decisions (spec only)

- Compare alternatives; examples listed (section 2.7).
- Recommend a path showing evidence, assumptions, uncertainty, trade-offs, and next validation step (section 2.9).
- Do not blindly trust the average; notice segment disagreement (section 3).
- Must-have: clear final recommendation with evidence, assumptions, and uncertainty (section 8).
- Nice-to-have: multiple launch strategies; comparison view launch broadly vs pilot one segment.
- Example end-to-end chooses enterprise validation pilot rather than broad launch (section 5) — illustrative of the *kind* of output, not a lock that live runs must always choose it (unless you lock that in SP-01-Q21).
- Deterministic scenario comparisons wherever possible (section 6).
- Demo beat: recommend targeted validation pilot rather than broad launch (section 9) — demo narrative; live-vs-scripted still open in SP-01.

## Dependencies

- Consumes: SP-01 (scripted vs live choice), SP-02, SP-03 goals/constraints, SP-04, SP-05 evidence, SP-06 panel, SP-07 finance.
- Produces: Recommendation + comparison artifact for SP-09, SP-10, SP-13.
- Revision rules continue in SP-09.

## Questions

### Scenario set

**SP-08-Q01.** What is the v1 scenario catalog? List it.

**SP-08-Q02.** Who is allowed to add a scenario at runtime?

**SP-08-Q03.** Must every run compare the same catalog, or may the agent drop scenarios?

**SP-08-Q04.** What makes a scenario’s description complete (who launches, to whom, at what price, for how long, with what build cost)?

**SP-08-Q05.** Is “delay” different from “do not build” in v1, and how?

**SP-08-Q06.** Is “enterprise only launch” different from “enterprise pilot”? Define both if both exist.

**SP-08-Q07.** Does a pilot scenario include success/fail criteria?

### Comparison mechanics

**SP-08-Q08.** What dimensions are compared (fit to goals, simulated demand by segment, cost, runway impact, competitive pressure, risk, time-to-learn, other)? List v1 dimensions.

**SP-08-Q09.** Which of those dimensions must be numeric vs qualitative?

**SP-08-Q10.** Who assigns qualitative scores if any?

**SP-08-Q11.** What does “deterministic scenario comparison” mean for you: our code computes a ranking; our code only checks that each scenario has the same fields; our code computes finance deltas; something else?

**SP-08-Q12.** If an LLM writes the comparison, what structured packet must it receive, and what may it not invent?

**SP-08-Q13.** How is segment disagreement used in comparison (example: a scenario that launches to a hostile segment is penalized)? State a rule or say “LLM judgment.”

**SP-08-Q14.** How are missing inputs handled (no Crustdata, partial panel, failed finance) — compare anyway with gaps, or block?

**SP-08-Q15.** Is a comparison table mandatory in the UI for must-have, or only for the nice-to-have comparison view?

### Choice

**SP-08-Q16.** Must there always be exactly one recommended scenario?

**SP-08-Q17.** May the agent recommend “insufficient evidence to choose; run this test first” as the recommendation itself?

**SP-08-Q18.** May the operator override the agent’s choice? Is that still “autonomous CEO”?

**SP-08-Q19.** What tie-break rule if two scenarios are indistinguishable given uncertainty?

**SP-08-Q20.** Are we allowed to optimize for “best demo story” over “best structured comparison”? If yes, that is a SP-01 lock; restate it here if you want this layer scripted.

**SP-08-Q21.** If live tools would not support a pilot recommendation, may we still force it?

### Explanation

**SP-08-Q22.** What citations are mandatory on the recommendation (evidence ids, assumption ids, panel segment stats, finance output ids)?

**SP-08-Q23.** Must trade-offs be a structured list (gains vs losses per rejected scenario)?

**SP-08-Q24.** Must uncertainty be restated on the recommendation view even if shown earlier on panel/finance views?

**SP-08-Q25.** How long may the explanation be in the demo (time and/or length)?

**SP-08-Q26.** Is there a required template/order of sections for the explanation?

**SP-08-Q27.** Must forbidden claims (SP-04) be scanned on this output specifically?

### Next validation step

**SP-08-Q28.** Is the next step always required, including when the recommendation is “do not build”?

**SP-08-Q29.** What fields does a next step have (method, target segment, assumption tested, time, cost, pass/fail criterion, owner)?

**SP-08-Q30.** Must the next step be something the *sandbox* can simulate further, or a real-world action outside the product?

**SP-08-Q31.** Which methods from the spec are allowed (interviews, existing feedback, landing-page tests, pilots, other)?

**SP-08-Q32.** In the example, the recommendation *is* a pilot. Can the next step be identical to the chosen scenario, or must it be a smaller action?

### Demo

**SP-08-Q33.** What is the one sentence the presenter should be able to point at on screen as “the decision”?

**SP-08-Q34.** Must rejected alternatives be visible in the 3–5 minute path?

**SP-08-Q35.** If the nice-to-have comparison view is out, what still appears?
