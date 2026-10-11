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

Design choices here align with **SP-01** (pilot vs broad comparison **in**; live recommendation may differ from spec example; demo vs full modes), **SP-02** (Scenario kinds, Recommendation structure, rejected alternatives), **SP-04** (no headline-only report; segment disagreement; sensitivity in recommendation), **SP-06** (panel cannot alone justify broad launch when runway constraints exist), **SP-07** (**Modeled** finance for **Pilot** and **Broad** only; other strategies qualitative in comparison), **SP-10/SP-12** (**`engineering_risk`** scorecard row from `code_impact` when `SKIP_CODE_IMPACT=false`; **`missing`** when skipped).

**v1 comparison pattern:** deterministic **scorecard + gates** (finance deltas, segment-fit flags, missing-data flags) → agent **chooses and explains** from structured packet only (no invented numbers) → **Recommendation** published with refs.

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

**SP-08-Q01.** What is the v1 scenario catalog? List it?
**Fixed catalog (SP-02 strategy kinds):** `broad_launch`, `pilot`, `enterprise_segment_launch`, `delay`, `do_not_build`. **Finance-modeled in cfo.ai (SP-07):** `pilot`, `broad_launch` only. Others appear in comparison/recommendation as **qualitative** alternatives with assumption refs but without Modeled columns unless finance extended later.

**SP-08-Q02.** Who is allowed to add a scenario at runtime?
**Nobody adds new enum values in v1.** Agent may propose **wording** for scope on existing kinds (e.g. which segment for `pilot`). User may edit scenario labels/scope on intake/recap. New strategy kinds deferred post-hackathon.

**SP-08-Q03.** Must every run compare the same catalog, or may the agent drop scenarios?
**Default: all five in the comparison artifact** (some rows may be “not modeled”). Agent may **omit qualitative rows** only if irrelevant to intake (e.g. drop `enterprise_segment_launch` when intake says no enterprise motion) — must log omission in Neatlogs. **`pilot` and `broad_launch` never dropped** when finance succeeded; if finance failed, keep rows with **finance gap** label.

**SP-08-Q04.** What makes a scenario’s description complete (who launches, to whom, at what price, for how long, with what build cost)?
Per scenario: **`strategyKind`**, **`scope`** (who gets the change), **Assumption refs** for **price/packaging**, **build cost & timeline**, **adoption** (for modeled kinds), **rollout start**; for **`pilot`**: **target segment**, **duration**, **success criteria** (Q07). Incomplete scenarios enter comparison with **`incomplete: true`** and cannot be **chosen** until required refs exist.

**SP-08-Q05.** Is “delay” different from “do not build” in v1, and how?
**Yes.** **`delay`:** defer build/launch by explicit months; **build cost shifted**; revenue uplift $0 until launch month. **`do_not_build`:** **no rollout**; exploration cost only (if any); strategic exit from this feature bet. Distinct `strategyKind` values and copy in rejected-alternatives.

**SP-08-Q06.** Is “enterprise only launch” different from “enterprise pilot”? Define both if both exist.
**Yes.** **`enterprise_segment_launch`:** GA (or wide release) **only to enterprise** segment per scope. **`pilot`:** **limited cohort** (e.g. 5–20 accounts), **success/fail criteria**, time-boxed. v1 finance compares **pilot vs broad**; enterprise-only is **qualitative row** unless scope maps pilot to enterprise (common demo path).

**SP-08-Q07.** Does a pilot scenario include success/fail criteria?
**Required for `pilot`:** `successCriterion` (metric + threshold), `failCriterion` (optional), `pilotDurationWeeks`, `targetSegment`. Stored on Scenario object; shown in recommendation and next-validation step.

### Comparison mechanics

**SP-08-Q08.** What dimensions are compared (fit to goals, simulated demand by segment, cost, runway impact, competitive pressure, risk, time-to-learn, other)? List v1 dimensions.
**v1 dimensions:** (1) **Goals/constraints fit** (intake), (2) **Simulated segment demand** (panel), (3) **Modeled economics** — runway/burn/revenue delta (cfo.ai, Pilot vs Broad), (4) **Observed competitive/market context** (Crustdata), (5) **Time-to-learn**, (6) **Execution risk** (qualitative), (7) **Sensitivity** snippet (price/adoption, SP-07).

**SP-08-Q09.** Which of those dimensions must be numeric vs qualitative?
**Numeric (from tools):** panel segment rates, finance Modeled metrics/deltas, sensitivity deltas. **Qualitative:** goals fit, competitive narrative, execution risk — **Inferred** with refs, no fabricated percentages.

**SP-08-Q10.** Who assigns qualitative scores if any?
**No 1–10 scores in v1.** Agent writes **structured bullets** (`fitNotes`, `riskNotes`) citing Evidence/Claims; optional **traffic-light** `low | medium | high` per dimension **only** as ordinal tags, not weighted averages.

**SP-08-Q11.** What does “deterministic scenario comparison” mean for you: our code computes a ranking; our code only checks that each scenario has the same fields; our code computes finance deltas; something else?
**Hybrid:** deterministic code builds **comparison scorecard**: finance **delta Pilot vs Broad**, panel **segment-fit flags** (Q13), **missing-layer flags**, **constraint violations** (e.g. broad + runway below intake threshold). Code **does not** auto-publish final rank. Code may compute **`suggestedPreference`** (e.g. `pilot`) from rules for agent hint — agent may disagree with explicit reasoning in Recommendation.

**SP-08-Q12.** If an LLM writes the comparison, what structured packet must it receive, and what may it not invent?
**Packet:** `comparisonScorecard`, all **Evidence** summaries by id, **panel aggregates** by segment, **financeRun** mapped compare + sensitivity summary, **Assumptions** list, **Unknowns/conflicts**, intake goals/constraints. **Forbidden:** new numbers, new market facts, “customers said,” treating Simulated as Observed, omitting rejected alternatives.

**SP-08-Q13.** How is segment disagreement used in comparison (example: a scenario that launches to a hostile segment is penalized)? State a rule or say “LLM judgment.”
**Deterministic flags:** for scenario scope segment **S**, if **primary favorable rate < 40%** and some **non-target segment** favorable **> 60%** at same price assumption → **`segmentMismatch: true`**. **Broad launch** with **`segmentMismatch`** on ≥2 primary segments → scorecard **`cautionBroad`**. Winner must **not** be chosen using **overall panel average alone** (SP-04); agent must cite segment bars in explanation.

**SP-08-Q14.** How are missing inputs handled (no Crustdata, partial panel, failed finance) — compare anyway with gaps, or block?
**Compare with gaps**; each dimension shows **`missing` | `partial` | `ok`**. **Block Recommendation publish** only on SP-04 **unresolved conflicts** or **zero evidence paths** when user required them — not solely for missing Crustdata/finance. Missing finance: **no Modeled economics column**; recommendation must state **cannot justify broad launch on runway** without finance when intake runway constraint flagged (SP-06-Q04 pattern).

**SP-08-Q15.** Is a comparison table mandatory in the UI for must-have, or only for the nice-to-have comparison view?
**Mandatory** — SP-01-Q15 comparison is **in**. Minimum UI: **Pilot vs Broad** Modeled columns + qualitative rows for other strategies + **segment disagreement** row + **`engineering_risk`** row (qualitative; **`missing`** + label when `SKIP_CODE_IMPACT=true` or no `codeImpactRunId`). Demo beat shows this table in **≤60s** glance.

### Choice

**SP-08-Q16.** Must there always be exactly one recommended scenario?
**Exactly one `chosenScenarioId`** (strategy kind + scope) **or** one **`validation_first`** pseudo-choice where headline is “Run validation before commit” with **`chosenScenarioId = pilot`** (or `delay`) and explicit staging — still one primary enum for SP-09 diffing.

**SP-08-Q17.** May the agent recommend “insufficient evidence to choose; run this test first” as the recommendation itself?
**Yes** — headline may be **validation-first**; must still set **`chosenScenarioId`** to the **smallest** staged path (usually **`pilot`**) and fill **`nextValidationStep`** (Q28). Not a blank recommendation.

**SP-08-Q18.** May the operator override the agent’s choice? Is that still “autonomous CEO”?
**Yes** — operator **override** on recommendation card before publish; logged as **`owner=user` override** with reason; still “autonomous” default. Export shows **agent recommendation** + **operator final** if different.

**SP-08-Q19.** What tie-break rule if two scenarios are indistinguishable given uncertainty?
**Order:** (1) lower **modeled runway risk** (higher runway under constraints), (2) prefer **`pilot`** over **`broad_launch`**, (3) prefer **`delay`** over **`broad_launch`**, (4) if still tied → **validation-first** headline + **`pilot`**.

**SP-08-Q20.** Are we allowed to optimize for “best demo story” over “best structured comparison”? If yes, that is a SP-01 lock; restate it here if you want this layer scripted.
**No** — SP-01-Q21: recommendation = **output of the test run**, not scripted to spec example. Demo mode uses **fixed seeds/cards** for speed, not forced conclusion.

**SP-08-Q21.** If live tools would not support a pilot recommendation, may we still force it?
**No.** If tools/scorecard favor **`delay`** or **`do_not_build`**, agent must recommend that. **No forcing** pilot for narrative.

### Explanation

**SP-08-Q22.** What citations are mandatory on the recommendation (evidence ids, assumption ids, panel segment stats, finance output ids)?
**SP-02-Q30:** **`evidenceRefs[]`**, **`assumptionRefs[]`**, **`inferences[]`** each linking to Evidence/Claim/panel aggregate ids / **`financeRunId`** / segment stats ids; include **`codeImpactRunId`** when `code_impact` completed (engineering claims **Inferred** only). Every material sentence in executive summary maps to ≥1 ref in structured body.

**SP-08-Q23.** Must trade-offs be a structured list (gains vs losses per rejected scenario)?
**Yes** — **`tradeoffs[]`** and **`rejectedAlternatives[]`** (SP-02-Q33): per rejected kind, **gain**, **loss**, **why not chosen** (1–3 bullets each).

**SP-08-Q24.** Must uncertainty be restated on the recommendation view even if shown earlier on panel/finance views?
**Yes** — compact **`uncertainty`** block on recommendation view (SP-04-Q21): missing data, conflicts, sensitivity one-liner, open unknowns count + link to appendix.

**SP-08-Q25.** How long may the explanation be in the demo (time and/or length)?
**On-screen demo path:** **headline + comparison table + ≤6 bullets** (~**45–90 seconds** read). Full structured report on **export** (no tight cap); agent may generate longer prose only in export section.

**SP-08-Q26.** Is there a required template/order of sections for the explanation?
**Yes (report/export order):** Headline → **Chosen scenario** → **Comparison table** → **Evidence by source** → **Assumptions** → **Segment disagreement** → **Engineering risk (heuristic)** or **skipped note** → **Modeled economics** → **Sensitivity** → **Trade-offs / rejected** → **Uncertainty** → **Next validation** → **Open unknowns** appendix.

**SP-08-Q27.** Must forbidden claims (SP-04) be scanned on this output specifically?
**Yes** — same validator as panel (no “customers said,” no survey claim, no forecast language without Modeled label). **Block publish** on hard violations; soft warnings for borderline phrasing.

### Next validation step

**SP-08-Q28.** Is the next step always required, including when the recommendation is “do not build”?
**Always required.** For **`do_not_build`:** next step = **reframe problem** or **cheap test of alternate hypothesis** (e.g. 5 interviews on different pain), not “launch pilot.”

**SP-08-Q29.** What fields does a next step have (method, target segment, assumption tested, time, cost, pass/fail criterion, owner)?
**Required fields:** `method`, `targetSegment` (optional for pricing-only decisions), `assumptionTested` (Claim id), `durationWeeks`, `estimatedCost` (Assumption or range), `successCriterion`, `owner` (`user` | `agent`), optional `failCriterion`.

**SP-08-Q30.** Must the next step be something the *sandbox* can simulate further, or a real-world action outside the product?
**Primary: real-world action** (interviews, pilot customers, landing test). Sandbox **may** offer **“simulate follow-on panel”** as optional secondary — not a substitute for stated real-world step.

**SP-08-Q31.** Which methods from the spec are allowed (interviews, existing feedback, landing-page tests, pilots, other)?
**Allowed:** customer **interviews**, **review existing feedback** (user-provided), **landing/concierge test**, **paid pilot**, **pricing experiment**, **waitlist**, **fake-door** (labeled as test). Agent picks from menu; must match B2B SaaS context.

**SP-08-Q32.** In the example, the recommendation *is* a pilot. Can the next step be identical to the chosen scenario, or must it be a smaller action?
**May be smaller** — e.g. recommend **`pilot`** but next step = **5 enterprise discovery calls** before engineering pilot. If identical, **`nextValidationStep`** must still spell **method, N, criterion** explicitly (not empty “run pilot”).

### Demo

**SP-08-Q33.** What is the one sentence the presenter should be able to point at on screen as “the decision”?
**Template:** *“Recommend **{chosen strategy}** for **{feature}** because **{top segment + finance reason}**, not **{top rejected}** — validate next via **{next step one-liner}**.”* Rendered as **`Recommendation.headline`** on decision card.

**SP-08-Q34.** Must rejected alternatives be visible in the 3–5 minute path?
**Yes** — at least **two rejected alternatives** with one-line **why not** on decision beat (table row or chips); full detail in export.

**SP-08-Q35.** If the nice-to-have comparison view is out, what still appears?
N/A — comparison view is **in** (SP-01-Q15). Fallback if UI time-crunched: **headline + Pilot vs Broad two-column mini-table + two rejected chips**; full table remains on export.
