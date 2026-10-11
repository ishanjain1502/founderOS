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
**v1 official kinds (display + storage aligned with SP-02-Q13):** **Observed** (Evidence), **Hypothesis** / **Assumption** / **Unknown** (Claim kinds), **Inferred** (agent conclusion with refs), **Simulated** (panel aggregates + respondent-level), **Modeled** (cfo.ai mapped outputs), **Recommendation** (decision output). “Financial output” = **Modeled**; no separate persisted “inference” type beyond Claim + Recommendation `inferences[]`.

**SP-04-Q02.** Is “hypothesis” different from “inference”?
Yes. **Hypothesis** = testable proposition before sufficient evidence (resolution `open` | `supported` | `refuted`, SP-02-Q15). **Inference** = conclusion drawn from cited Evidence/Assumptions/Simulated/Modeled inputs; stored as **Inferred** entries with `sourceRefs[]`, not promoted to Evidence.

**SP-04-Q03.** Is a panel aggregate a kind of evidence, a kind of simulation, or its own kind?
**Simulated** only — never Evidence. Segment aggregates are **Simulated** with mandatory label (SP-02-Q42).

**SP-04-Q04.** Is a cfo.ai number “evidence,” “model output,” or “assumption-dependent projection”?
**Modeled** (assumption-dependent projection). Never Evidence. UI/report: **Assumed inputs → Modeled outputs**; “not a forecast” on export (SP-01-Q29).

**SP-04-Q05.** Can a statement have more than one kind (example: inference built on evidence)? If yes, how is that shown?
Yes. **Primary epistemic kind** on the object + **`derivedFrom[]`** / **`sourceRefs[]`** (ids + kind per ref). Example: Inferred conclusion with refs to Observed + Simulated. No dual-labeled Evidence.

### Provenance

**SP-04-Q06.** What is the minimum provenance for an evidence item: source identifier, URL, vendor, retrieved-at, vendor timestamp, raw payload, or another set?
Minimum: **`source`** (vendor name, e.g. crustdata | fallback), **external identity** (SP-02-Q07), **`summary`**, **`retrievedAt`** (server). Optional: vendor timestamp, URL, raw payload ref. Fallback evidence: `source=fallback` + stable key (SP-02-Q08).

**SP-04-Q07.** If provenance is incomplete, is the item unusable, usable with a warning, or usable silently?
**Usable with warning** if identity + `retrievedAt` exist; **unusable (quarantine)** if missing external identity and not a labeled fallback. Never usable silently without `retrievedAt`.

**SP-04-Q08.** Must inferences cite the evidence ids they rest on?
**Yes** when citing Observed facts. Inferences may also cite Assumptions, Simulated, Modeled; every **Inferred** row must have **≥1 `sourceRef`**. Report publish blocked if Inferred lacks refs (validator).

**SP-04-Q09.** Must assumptions cite why they were needed (missing evidence, demo fixture, user override)?
Yes. **`rationale`** enum or tags: `user_provided` | `missing_evidence` | `demo_fixture` | `system_default` | `agent_gap_fill` | `reconciliation` (SP-03-Q32). Shown in report Assumed section.

### Assumptions

**SP-04-Q10.** What is the complete list of assumptions the demo is allowed to use if you already know it? If you do not, who is allowed to invent them during a run?
**No closed global list.** Demo card supplies: company financials, feature brief, build cost range, adoption priors for scenarios, packaging hypothesis. **Who may invent:** user (intake), agent (**modeling gaps only**, SP-02-Q16), system (labeled defaults). Agent-invented adoption/price priors require **Assumed** + rationale `agent_gap_fill`; never presented as Observed.

**SP-04-Q11.** Must every assumption have an owner (user vs agent vs spec fixture)?
Yes. **`owner`:** `user` | `agent` | `system` | `demo_fixture`. Maps to SP-02-Q16 rules.

**SP-04-Q12.** Must every assumption have a plausible range, a single point, or either?
**Either.** Numeric assumptions should use **point + optional range** when sensitivity runs (Q19). Single point allowed; sensitivity varies point when range absent (default ±% bands documented in run metadata).

**SP-04-Q13.** Which assumptions are locked for the demo so the story stays stable?
**Demo mode:** demo-card **budget, time, core financials, feature brief, panel seed** locked unless user clicks **edit intake**. Agent may not change `demo_fixture` or user **locked** assumptions (SP-02-Q17). Full mode: only user-**locked** assumptions are fixed.

**SP-04-Q14.** Which assumptions the agent may change without asking the operator?
**Agent-only gap-fill assumptions** it created (`owner=agent`, not locked), and **new scenario overrides** that do not overwrite user/locked values. May **add** assumptions; may not **mutate** user/locked/`demo_fixture` without approval flow (Q15).

**SP-04-Q15.** Which assumption changes require operator approval?
Changes to **user-provided**, **`demo_fixture`** (in demo), **locked**, or any assumption **linked to published cfo.ai inputs** shown in report. UI: **approve / reject** on intake recap and on “assumption update” card before re-run/revision.

**SP-04-Q16.** How is an assumption marked “contradicted”? Who decides, with what rule?
**Status:** `active` | `contradicted` | `superseded`. **Auto-suggest** when new **Observed** Evidence conflicts (deterministic rules + agent proposal). **Operator confirms** contradiction in v1 (SP-01-Q10 mix). Contradiction must cite **contradictingEvidenceId** + short reason. Triggers **Revision** path (Q32).

**SP-04-Q17.** If two assumptions conflict, is the run invalid until resolved?
**Block cfo.ai send and Recommendation publish** until resolved or user **accepts explicit conflict** (both kept; scenario comparison shows tension). Panel/Crustdata may continue gathering; finance/recommendation wait.

### Uncertainty display

**SP-04-Q18.** Section 3 forbids relying on one confidence score. Are we forbidden from showing *any* single score, or only from showing a score without disagreement/sensitivity?
**Forbidden:** a **lone** score as the primary takeaway. **Allowed:** supplemental score **only alongside** segment disagreement summary + sensitivity snippet or unknowns list (same view or report section).

**SP-04-Q19.** For v1, is sensitivity analysis required (risk table) or optional (section 8 nice-to-have)? Pick which spec sentence governs v1.
**Required for v1** — SP-01-Q13 (sensitivity **in**). Minimum: **price and adoption** sensitivity on compared scenarios (at least pilot vs broad or delay), shown as **Modeled** ranges/tables, not a single headline number.

**SP-04-Q20.** What disagreement must always be visible: segment vs segment, question vs question, respondent-level spread, qualitative objections, or another set?
**Required visible:** **segment vs segment** on primary choice question + **top qualitative objections** (from open-text or structured objection field). **Optional drill-down:** respondent spread, question-by-question. Recommendation must **summarize** material segment disagreement (SP-02-Q31).

**SP-04-Q21.** How should uncertainty be shown in the recommendation itself (ranges, lists of unknowns, “do not know,” all of these, something else)?
**All in report (SP-02-Q32):** `missingData[]`, `conflicts[]`, **≤3 validation steps** (SP-02-Q18), **Open unknowns** appendix, **sensitivity summary** for price/adoption. Headline allowed if body contains this structure (SP-01-Q30).

**SP-04-Q22.** Are we allowed to rank recommendations as high/medium/low confidence?
**No user-facing high/medium/low** as primary ranking in v1. Use **scenario comparison**, disagreement, and sensitivity instead. Internal agent metadata may use scores for orchestration only (not shown in report/export).

### Forbidden conclusions

**SP-04-Q23.** What exact conclusions are forbidden even if the LLM produces them (write the list you want enforced)?
Non-exhaustive enforce list: (1) Competitor activity **proves customer demand** or WTP for our feature. (2) Simulated panel as **real customer quotes / survey / interviews**. (3) Modeled finance as **guaranteed revenue/runway** or “will hit $X.” (4) **Certainty language** without cited refs (“definitely,” “customers will buy”). (5) **1,000 agents = 1,000 real people** equivalency. (6) **Unlabeled assumptions** presented as facts. Align with SP-02-Q43 phrases.

**SP-04-Q24.** Where is that list enforced: schema, output validator, UI copy, agent prompt, human presenter script, all, or another place?
**Agent prompt + deterministic post-validator on Recommendation/report JSON + export renderer** (strip/relabeled). UI copy guidelines SP-02-Q42. Not reliant on presenter script.

**SP-04-Q25.** If the agent emits a forbidden conclusion, is the run failed, the sentence stripped, the sentence relabeled, or another behavior?
**Relabel or rewrite** to compliant form **+ validator retry** (bounded attempts). If still failing: **publish blocked**, Run `failed` with Neatlogs error; operator may **publish with warnings** (logged).

**SP-04-Q26.** Is “enterprise power users are enthusiastic” allowed as a simulated finding, and what label must accompany it?
**Allowed** as **Simulated** segment summary, e.g. “**Simulated:** among enterprise power-user archetypes, X% selected ‘would pay extra’ (panel run \<id\>).” Never **Observed** or “customers said.”

### Unknowns and validation steps

**SP-04-Q27.** Must the system always output at least one real-world validation step?
**Yes** for recommendations that propose **launch, pilot, or delay pending learning**. **Exception:** **do not build** may list validation as “none required” with explicit rationale. Still subject to **≤3** primary steps cap (SP-02-Q18).

**SP-04-Q28.** Which validation methods are allowed to be recommended: real interviews, existing feedback, landing-page tests, pilots, others from the spec, others you add?
**Allowed:** customer interviews, review of **existing** feedback (if user pasted), landing/smoke tests, **segment pilot**, pricing test, technical spike/prototype, delay with measurement plan. **Not:** automatic real-world launch/spend, or actions violating user **constraints** intake.

**SP-04-Q29.** Can the agent recommend “do not validate, just ship” or “do not validate, just kill”?
**Kill without further validation:** allowed when **Modeled runway/risk** and user constraints make validation moot (report must cite Modeled + Assumed inputs). **Ship without validation:** **discouraged** — only if user constraint explicitly forces ship timeline **and** report shows **high residual uncertainty** + Simulated/Modeled limits; never as default path. Default path: **pilot or measure** (spec example).

**SP-04-Q30.** Must each recommended validation step name which assumption it would test, at what cost/time, and what result would change the decision?
**Yes for the ≤3 primary steps** (SP-02-Q18): **assumption or unknown ref**, **estimated cost/time** (ranges allowed, Assumed), **decision change if positive/negative**. Appendix unknowns may omit full detail.

### Revision semantics

**SP-04-Q31.** What new inputs count as “new evidence” (Crustdata refresh, user-pasted signal, failed pilot, changed assumption, all of these)?
**Revision “evidence”:** new/changed **Observed** Evidence (Crustdata refresh, user-pasted external signal, user-reported pilot outcome). **Changed user assumption** → new Run or revision per SP-03-Q04 (not Observed kind). Simulated-only updates: Q34.

**SP-04-Q32.** Does any new evidence trigger re-evaluation, or only evidence that contradicts a named assumption?
**Primarily** when evidence **contradicts or materially updates** a named Assumption/Hypothesis or fills a listed **Unknown**. Informational Observed append may skip auto revision unless operator clicks **re-evaluate**.

**SP-04-Q33.** Must the system show a diff: previous recommendation vs new, previous assumptions vs new?
**Yes** on Revision: **headline diff**, **assumption status changes** (incl. contradicted), **new Evidence ids**, **panel/finance run ids** if re-run. Export includes revision section (SP-01-Q16 export in).

**SP-04-Q34.** If new evidence is itself simulated, may it trigger revision, or only observed/user-provided evidence?
**Only Observed or user-provided factual updates** trigger automatic contradiction revision. **Panel re-run** updates Simulated sections via explicit **re-run** / operator **revise**, not as external evidence.

### Consistency with illustrative example

**SP-04-Q35.** In the spec’s example, competitor activity is *not* proof of demand, and the agent still hypothesizes analytics may be strategically important. Must v1 reproduce that exact epistemic move, or only the general rule?
**General rule required**; demo narrative **should** include one competitor Observed finding → **Hypothesis** (strategic importance) + explicit **“does not prove demand”** Inferred disclaimer. Exact companies optional.

**SP-04-Q36.** Must every Crustdata finding have a paired “this does not prove demand” note in the UI?
**No** on every finding. **Yes** for **demand-adjacent** Observed items (competitor product/pricing, market size as proxy for WTP, etc.): auto-append **Inferred disclaimer** block in report + chip in UI on those rows. Other Observed facts (firmographics, funding) get standard **Observed** label only.
