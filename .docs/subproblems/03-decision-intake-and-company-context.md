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

**SP-03-Q02.** Is there more than one operator role (analyst vs CEO vs demo presenter)?

**SP-03-Q03.** Can intake happen only once per Decision, or can it be updated?

**SP-03-Q04.** If updated, does that start a new Run, a Revision, or something else (see SP-09)?

### Required content

**SP-03-Q05.** What fields are required before the agent is allowed to start?

**SP-03-Q06.** What fields are optional?

**SP-03-Q07.** Is “business goals” free text, a fixed list (revenue, retention, expansion, etc.), or both?

**SP-03-Q08.** Is “constraints” free text, structured (budget, timeline, segment restrictions, legal), or both?

**SP-03-Q09.** Must the feature’s packaging be specified (premium add-on vs included vs new SKU vs usage-based)?

**SP-03-Q10.** Must a price or price range be provided at intake, left to the panel, left to cfo.ai, or some combination?

**SP-03-Q11.** Must current pricing of the existing product be provided?

**SP-03-Q12.** Must current customer segments of the existing product be provided?

**SP-03-Q13.** Must existing qualitative feedback (support tickets, NPS comments, lost deals) be in scope for v1 intake?

**SP-03-Q14.** Must team/capacity constraints (engineers, time to build) be in scope for v1?

### Illustrative company

**SP-03-Q15.** Do we use the spec’s illustrative numbers as the demo company?

**SP-03-Q16.** If yes, is the company named, fictional, anonymized, or labeled only as “illustrative”?

**SP-03-Q17.** Which of cash, customer count, MRR, runway, product description, and feature proposal are user-editable live?

**SP-03-Q18.** Is runway an input, a computed output of cfo.ai, or both with a reconciliation rule?

**SP-03-Q19.** What currency, period (monthly vs annual), and accounting basis are required?

**SP-03-Q20.** What is the existing product, in enough detail for Crustdata search and panel evaluation? The spec only says “existing B2B SaaS.”

**SP-03-Q21.** Who writes that product description, and how long is it allowed to be?

**SP-03-Q22.** What is “AI-powered analytics” as a feature definition for the demo (capabilities, data sources, buyer, implementation cost)? If unknown, who invents it for the demo, and how is that invention labeled?

### Goals and success for the company

**SP-03-Q23.** For the demo company, what is the business goal of considering this feature?

**SP-03-Q24.** How should the agent treat conflicting goals (example: maximize revenue vs protect SMB goodwill)?

**SP-03-Q25.** Is there a time horizon for the decision (this quarter, this year, until runway ends)?

**SP-03-Q26.** What constraints are in force for the demo (cannot hire, cannot raise, cannot change base price, etc.)?

### Out-of-scope inputs

**SP-03-Q27.** If someone pastes a consumer B2C idea, a new-company idea, or a non-feature decision (hiring, fundraising), what should happen?

**SP-03-Q28.** Is there a maximum length or a maximum number of features per Decision?

**SP-03-Q29.** Are attachments (PDFs, decks, spreadsheets) in scope for intake?

### Validation and defaults

**SP-03-Q30.** If a required field is missing, do we block, fill an illustrative default, or ask a follow-up?

**SP-03-Q31.** If defaults are used, must the UI mark them as defaults/assumptions?

**SP-03-Q32.** If numbers are internally inconsistent (MRR, customers, and implied ARPU contradict), who flags that and who wins?

**SP-03-Q33.** Are negative cash, zero customers, or already-launched features valid inputs?

### Mapping downstream

**SP-03-Q34.** Which intake fields become Crustdata query inputs (see also SP-05)?

**SP-03-Q35.** Which intake fields are shown verbatim to synthetic respondents (see also SP-06)?

**SP-03-Q36.** Which intake fields become cfo.ai inputs unchanged (see also SP-07)?

**SP-03-Q37.** Which intake fields the agent may rewrite into structured form, and must the rewrite be shown to the operator for approval?

### Demo beat “set the decision”

**SP-03-Q38.** In the 3–5 minute demo, is this beat a live type-in, a click on a prepared card, or a narrator talking over a prefilled screen?

**SP-03-Q39.** Must the audience see goals and constraints, or only the question sentence?
