# SP-03 — Decision intake and company context

## Why this is a subproblem

Workflow step 1: the user provides the proposed feature, existing product context, business goals, and constraints. Must-have: one existing SaaS company profile and one proposed feature decision.

Nothing else in the sandbox has a target unless this input is defined: what is known about the company, what is being proposed, what “success” means for the business, and what the company refuses to do.

The spec gives an **illustrative** company and question. It does not say how those enter the system, who can change them, or how complete they must be.

## Discussion

Intake is easy to under-specify because the example is vivid:

> Should we launch AI-powered analytics as a premium add-on to our existing SaaS product?

That sentence hides several different inputs:

- The **decision question** (launch or not, and in what form).
- The **feature definition** (what AI-powered analytics is, who it is for, how it is packaged and priced).
- The **existing product** (what the SaaS already does, current pricing, current customers).
- The **financial starting point** (cash, customers, MRR, runway in the example).
- The **goals** (growth, retention, enterprise expansion, something else — unnamed).
- The **constraints** (cannot increase burn above X, cannot touch SMB pricing, must ship in a quarter, legal/privacy limits on AI — unnamed).

If intake is a single text box, the agent must extract structure. If intake is a form, someone must design fields. If intake is hardcoded, the demo cannot show “receive the decision” as a user action unless the hardcoded values are still *presented* as the received decision.

The spec says the product is for an **existing** B2B SaaS company. Greenfield “should we start this company” is a different problem and is outside the stated idea. Whether the software should reject non-B2B or non-existing-product inputs is unstated.

Goals and constraints change recommendation quality. “Run a pilot” vs “do not build” depends on runway, team capacity, risk appetite, and what the company already promised customers. Those are not in the illustrative block except cash/customers/MRR/runway.

There is also a boundary with SP-07: some of these numbers become financial assumptions. If intake and finance disagree (user says runway 12 months, model computes 8), the spec wants arithmetic checks to be deterministic — but it does not say which number wins.

## What “implemented to the end” would require

1. A defined intake channel (UI form, prompt, config file, hardcoded demo fixture, API — unspecified which).
2. A defined required input set sufficient to run SP-05, SP-06, SP-07, SP-08.
3. Validation: missing, contradictory, or out-of-scope inputs.
4. A stored Company + Feature + Goals + Constraints snapshot attached to the Decision (SP-02, SP-09).
5. A visible recap so the operator can see what the agent received (SP-13).
6. Rules for editing inputs after a run has started (restart, branch, forbidden).
7. Provenance: which fields came from the user vs defaults vs illustrative fixtures.
8. Mapping of intake fields into Crustdata search targets, panel context, and cfo.ai inputs.
9. Demo choreography: how “set the decision” appears in 3–5 minutes.

## Locked decisions (spec only)

- User provides: proposed feature, existing product context, business goals, and constraints (section 2.1).
- Must-have: one existing SaaS company profile; one proposed feature decision (section 8).
- Illustrative sample data exists (section 5) and is illustrative, not a real company.
- Example question: launch AI-powered analytics as a premium add-on / “Should we build and launch AI Analytics?”
- Product context in the idea: existing B2B SaaS (section 1).
- Out of scope: building the actual product feature; automatic real-world launch or spending.

## Dependencies

- Consumes: SP-01 (frozen vs parameterized), SP-02 (object shapes).
- Produces: the Decision target consumed by SP-05, SP-06, SP-07, SP-08, SP-10, SP-13.

## Questions

### Channel and operator

**SP-03-Q01.** How does the decision enter the system in v1: typed in a UI, chosen from a list, loaded from a file, hardcoded, spoken in the demo while the screen shows a fixture, or another channel?
(a) **Staged web wizard** — multiple steps (e.g. repo/context → market personas → budget/time → feature/decision question). **Demo scenario cards** pre-fill each stage (SP-01-Q22).

**SP-03-Q02.** Is there more than one operator role (analyst vs CEO vs demo presenter)?
(a) **No roles** — anyone with the link has the same access (SP-02-Q05 v1).

**SP-03-Q03.** Can intake happen only once per Decision, or can it be updated?
(d) Editable freely **until the first agent run**. After that, intake **frozen** unless user chooses **“edit intake”**; **material** edits bump **`questionRevision`** (SP-02-Q06) and may trigger downstream re-run (SP-03-Q04).

**SP-03-Q04.** If updated, does that start a new Run, a Revision, or something else (see SP-09)?
(c) **Tiered:** cosmetic intake tweak → no automatic re-run. **Material** intake change (feature definition, decision question, budget, runway/time, core company metrics) → **new Run** (prior outputs retained for compare). New contradictory **evidence** mid-session → **Revision** path without full pipeline unless agent/rules require re-fetch.

### Required content

**SP-03-Q05.** What fields are required before the agent is allowed to start?
(a) Wizard must have before **Start investigation:** (1) codebase/repo connection, (2) existing B2B SaaS product description, (3) target market behavior (personas), (4) budget + time to execute, (5) feature/change under test, (6) explicit decision question, (7) financial baseline — **≥2 of** cash, customer count, MRR, runway (with units) **or** explicit “provide later” → labeled **Assumptions** before cfo.ai (not silent gaps).

**SP-03-Q06.** What fields are optional?
(a) Optional at start: structured business goals; extra constraints (legal, pricing/segment rules); current pricing; customer segments; proposed packaging; team capacity. **Out of v1 intake:** dedicated qualitative feedback fields, file attachments. Omitted financials from Q05 use “provide later” → Assumptions before cfo.ai.

**SP-03-Q07.** Is “business goals” free text, a fixed list (revenue, retention, expansion, etc.), or both?
(c) **Both:** multi-select chips (revenue, retention, expansion, enterprise, efficiency, competitive defense, other) + optional free-text nuance.

**SP-03-Q08.** Is “constraints” free text, structured (budget, timeline, segment restrictions, legal), or both?
(c) **Both:** budget + timeline are **required** in Q05; optional structured fields (segment restrictions, legal/privacy, pricing rules, hiring/raise limits) + free-text “other constraints.”

**SP-03-Q09.** Must the feature’s packaging be specified (premium add-on vs included vs new SKU vs usage-based)?
**Optional at intake.** If omitted, agent proposes packaging options as **Scenarios** + **Assumptions** during the run; user may set packaging in wizard when known (especially pricing-change decisions).

**SP-03-Q10.** Must a price or price range be provided at intake, left to the panel, left to cfo.ai, or some combination?
**Combination:** optional **proposed price/range** at intake when relevant; otherwise **panel** explores willingness signals (Simulated) and **cfo.ai** models pricing scenarios — all surfaced as Assumptions/Evidence in report, not invented headline prices (SP-01-Q11).

**SP-03-Q11.** Must current pricing of the existing product be provided?
**Optional.** Strongly encouraged for pricing/feature decisions; if missing, agent adds **Assumption** placeholders before finance and panel price-sensitive questions.

**SP-03-Q12.** Must current customer segments of the existing product be provided?
**Optional** if **target market behavior** (Q05) is rich enough to seed archetypes; optional segment chips supplement the fixed catalog (SP-02-Q21). Agent may infer segment mix as **Inferred**, not Evidence.

**SP-03-Q13.** Must existing qualitative feedback (support tickets, NPS comments, lost deals) be in scope for v1 intake?
**No dedicated fields in v1.** User may paste snippets into product description or constraints; no ticket/NPS importers.

**SP-03-Q14.** Must team/capacity constraints (engineers, time to build) be in scope for v1?
**Optional field** (engineers FTE, skills note). **Time to execute** is required via Q05; code analysis (regression/effort/blast radius) supplements capacity when repo is connected. Missing team size → agent **Assumption** for effort, visible in report.

### Illustrative company

**SP-03-Q15.** Do we use the spec’s illustrative numbers as the demo company?
**Yes as default demo card only** — pre-fills wizard for Demo mode; Full mode users supply their own (SP-01-Q18).

**SP-03-Q16.** If yes, is the company named, fictional, anonymized, or labeled only as “illustrative”?
**Fictional name + prominent “Illustrative example”** label in UI and export (not a real company).

**SP-03-Q17.** Which of cash, customer count, MRR, runway, product description, and feature proposal are user-editable live?
**All editable** in wizard before first run; after first run only via **edit intake** (Q03). Demo card values are starting points, not locked.

**SP-03-Q18.** Is runway an input, a computed output of cfo.ai, or both with a reconciliation rule?
**Both:** user may supply **runway (months)** as intake input (counts toward Q05 financial baseline). cfo.ai may output **projected runway** under scenarios. **User intake wins** for baseline; projected runway is **Inferred/modeled** and labeled separately; deterministic check flags large divergence and surfaces in report (no silent overwrite).

**SP-03-Q19.** What currency, period (monthly vs annual), and accounting basis are required?
**USD default**; user-selectable currency in wizard. Money fields require **currency + period** (MRR = monthly recurring). **Cash basis** for v1 hackathon unless user states otherwise in constraints. Validation per SP-02-Q40.

**SP-03-Q20.** What is the existing product, in enough detail for Crustdata search and panel evaluation? The spec only says “existing B2B SaaS.”
Minimum: **category**, **primary buyer**, **core job-to-be-done**, **delivery model** (SaaS), **rough customer size band** (SMB/mid/enterprise). Demo card uses spec-style “workflow SaaS with analytics upsell path”; Crustdata also gets **company/product names** and competitor hints when user provides them.

**SP-03-Q21.** Who writes that product description, and how long is it allowed to be?
**User writes** in wizard (optional enrichment from repo/README via agent — **Inferred**, shown for approval per Q37). **Soft cap ~2,000 characters** in UI; longer text truncated with “expand in export” or split into Assumptions.

**SP-03-Q22.** What is “AI-powered analytics” as a feature definition for the demo (capabilities, data sources, buyer, implementation cost)? If unknown, who invents it for the demo, and how is that invention labeled?
**Demo card** ships a **complete fictional feature brief** (capabilities, buyer, data sources, rough build cost range as **Assumptions**). Full mode: user supplies feature text; gaps filled by agent as **Assumptions/Inferred**, never as Evidence; shown in intake recap before run.

### Goals and success for the company

**SP-03-Q23.** For the demo company, what is the business goal of considering this feature?
Demo card defaults: **revenue expansion + enterprise upsell** (chips + one line nuance). User may override in optional goals step.

**SP-03-Q24.** How should the agent treat conflicting goals (example: maximize revenue vs protect SMB goodwill)?
**Explicit trade-off in Recommendation** — no silent weighting. Agent scores scenarios against stated goals; conflicts listed in **`tradeoffs[]`** and uncertainty; does not pick a single goal unless user ranks goals (optional “primary goal” chip in v1).

**SP-03-Q25.** Is there a time horizon for the decision (this quarter, this year, until runway ends)?
**Required implicitly via Q05 time-to-execute**; optional horizon chip (this quarter / 6 months / 12 months / until runway). Default horizon: **aligned with stated execution time + runway input**.

**SP-03-Q26.** What constraints are in force for the demo (cannot hire, cannot raise, cannot change base price, etc.)?
Demo card includes: **fixed engineering budget**, **ship within stated time**, **no base-price change for SMB** (example constraints). User-editable; appear in intake recap and report **Assumed** section.

### Out-of-scope inputs

**SP-03-Q27.** If someone pastes a consumer B2C idea, a new-company idea, or a non-feature decision (hiring, fundraising), what should happen?
**Soft validation warning** + allow proceed with label **“outside spec intent (existing B2B SaaS feature decision)”** OR user can **switch to generic mode** at own risk. **Hard block** only for empty/malicious input. Report disclaimer: sandbox tuned for B2B SaaS product decisions.

**SP-03-Q28.** Is there a maximum length or a maximum number of features per Decision?
**One feature/change per Decision** (SP-02-Q03). Field length caps: decision question ~500 chars; feature description ~4,000 chars; market-behavior ~4,000 chars (adjust in implementation).

**SP-03-Q29.** Are attachments (PDFs, decks, spreadsheets) in scope for intake?
**No in v1** (SP-03-Q06). Text paste only.

### Validation and defaults

**SP-03-Q30.** If a required field is missing, do we block, fill an illustrative default, or ask a follow-up?
**Block Start investigation** with inline wizard errors. **Demo cards** pre-fill so demo path is not blocked. No silent illustrative defaults on Full mode required fields.

**SP-03-Q31.** If defaults are used, must the UI mark them as defaults/assumptions?
**Yes** — demo card pre-fill, “provide later” financials, and agent-filled gaps must show **Assumed** / **Illustrative example** per SP-01-Q29 / SP-02-Q42.

**SP-03-Q32.** If numbers are internally inconsistent (MRR, customers, and implied ARPU contradict), who flags that and who wins?
**Deterministic validator** flags before run and before cfo.ai; show warning in wizard. **User-entered intake wins** unless user accepts “suggested reconciliation” (creates explicit Assumption). Agent does not auto-correct user numbers.

**SP-03-Q33.** Are negative cash, zero customers, or already-launched features valid inputs?
**Allowed with warnings** (pre-revenue, debt, evaluating change to live feature). Report must state context; “already launched” shifts question to **expand / rollback / reposition**, not greenfield launch.

### Mapping downstream

**SP-03-Q34.** Which intake fields become Crustdata query inputs (see also SP-05)?
Product name/description, category, buyer type, geography if provided, named competitors, feature keywords, company domain if provided. Repo-derived company hints only after operator approves rewrite (Q37).

**SP-03-Q35.** Which intake fields are shown verbatim to synthetic respondents (see also SP-06)?
**Feature/change description**, **product summary** (short), **packaging/price hypothesis** if provided, and **scenario-specific** positioning — not raw financial internals (MRR/runway) unless scenario requires it; panel sees **customer-relevant** slice only.

**SP-03-Q36.** Which intake fields become cfo.ai inputs unchanged (see also SP-07)?
Cash, MRR, customer count, runway baseline, budget cap, execution timeline, pricing/packaging assumptions, adoption assumptions per scenario — as **Assumption** objects with units (SP-02-Q14). User intake numbers pass through unless user accepts reconciliation (Q32).

**SP-03-Q37.** Which intake fields the agent may rewrite into structured form, and must the rewrite be shown to the operator for approval?
Agent may structure: repo **README → product summary**, loose goals/constraints → chips, long feature text → bullet **Feature proposal**. **Must show intake recap screen** (“what the agent will use”) with **approve / edit** before first Run; material rewrites require explicit confirm. Post-run changes follow Q03–Q04.

### Demo beat “set the decision”

**SP-03-Q38.** In the 3–5 minute demo, is this beat a live type-in, a click on a prepared card, or a narrator talking over a prefilled screen?
**Click demo scenario card** → wizard stages auto-fill → brief **recap confirm** → Start investigation (minimal typing). Presenter may narrate; audience sees card click + recap.

**SP-03-Q39.** Must the audience see goals and constraints, or only the question sentence?
**Recap shows:** decision question, one-line feature, **top 2 goals chips**, **budget + time**, and **illustrative** label if demo card — not every optional field. Full detail available in export/report.
