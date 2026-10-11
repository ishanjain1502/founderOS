# SP-07 — cfo.ai financial evaluation

## Why this is a subproblem

Workflow step 6 and must-have: one financial comparison through the **confirmed** cfo.ai workflow. The spec’s economic questions (costs, pricing, revenue scenarios, margins, burn, runway) are explicitly **subject to what the product supports**.

The spec says: confirm the intended cfo.ai workflow and API/product capabilities **before implementation**. Until that confirmation exists, any formula or endpoint list would be an assumption.

## Discussion

cfo.ai is where the sandbox is most likely to look more certain than it is. The risk table says: show scenarios, ranges, and sensitivity to inputs. The cfo.ai section says: do not present speculative adoption estimates as verified forecasts. Outputs are only as reliable as inputs **and** actual product capabilities.

So there are three nested unknowns:

1. **What cfo.ai actually is, for us, today.** Web product, API, MCP, spreadsheet-like model, agent, something else. Unverified.
2. **What we are allowed to ask it to do.** The spec *hopes* to compare launch scenarios and examine costs, margins, burn, and runway “where supported.” “Where supported” is a hard gate, not flavor text.
3. **What we put in.** Explicit cost, pricing, adoption, and revenue assumptions. Those assumptions may come from intake (SP-03), from the panel (SP-06), from the user, or from the agent. Mixing a simulated 18% “would pay extra” into a revenue forecast without labeling it is how this product fails its own spec.

“One financial comparison” might mean:

- two scenarios side by side (broad launch vs pilot), or
- one scenario vs do-nothing baseline, or
- one cfo.ai call that returns a comparison, or
- two calls we compare in our app.

The spec does not say which. Nice-to-have: sensitivity for price and adoption; comparison view launch vs pilot. Must-have is weaker: one financial comparison through the confirmed workflow.

Arithmetic checks belong in deterministic code (section 6). Even if cfo.ai computes runway, our app may need to sanity-check units, signs, and that inputs match stored assumptions. How far that checker goes is open.

The illustrative company has cash $2M, MRR $80k, runway 12 months. Those can contradict a model (burn implied by cash/runway vs burn implied by costs). Reconciliation is unstated.

Adoption is the most dangerous input: it is the number people will treat as a forecast. The panel must not be laundered into “we will get 18% conversion” unless you explicitly define that mapping as an assumption.

## What “implemented to the end” would require

1. Verified cfo.ai access, docs, auth, terms, cost, latency.
2. A written “confirmed workflow”: exact steps a human or agent follows, with the operations the product supports.
3. A mapping from our Scenario + Assumption objects to that workflow’s inputs.
4. A mapping from its outputs back to our objects, including unused/unsupported requested metrics.
5. Deterministic validation of inputs (units, required fields, assumption citations).
6. Deterministic checks on outputs (arithmetic sanity you define).
7. Storage of inputs, outputs, vendor ids, timestamps.
8. Agent tool contract: when it may call finance, how many times, with which scenarios.
9. UI: scenarios, numbers, assumption list, labels that these are not verified forecasts.
10. Failure and labeled fallback (SP-14).
11. Neatlogs of the call (SP-11).
12. Optional sensitivity loop only if SP-01 includes it — still needs a definition of which inputs move.

## Locked decisions (spec only)

- Purpose: assess whether the opportunity could make economic sense (section 4).
- Planned use: explicit cost, pricing, adoption, revenue assumptions; compare launch scenarios’ possible financial implications; examine costs, margins, burn, runway **where supported**; surface assumptions with greatest effect **where that is a capability**.
- Limitations: reliability bounded by inputs and actual capabilities; no speculative adoption as verified forecasts; confirm workflow/API before implementation.
- Must-have: one financial comparison through the confirmed cfo.ai workflow.
- Nice-to-have: sensitivity analysis for price and adoption.
- Deterministic arithmetic checks where possible (section 6).
- Demo beat: cfo.ai evaluates the stated scenarios and assumptions (section 9).
- Smoke-test at the beginning; labeled fallbacks (section 10).

## Dependencies

- Consumes: SP-01, SP-02, SP-03 (starting financials), SP-04 (assumption labels), SP-06 (only if you map panel → adoption), SP-08 (which scenarios to score), SP-14.
- Produces: financial inputs/outputs for SP-08, SP-09, SP-13.
- Traced in SP-11.

## Questions

### Product verification

**SP-07-Q01.** Do we already have cfo.ai access (account, keys, docs)?

**SP-07-Q02.** What official docs or product surface are the source of truth?

**SP-07-Q03.** Is cfo.ai in this hackathon an API, a UI we drive, an MCP server, a spreadsheet, a chat agent, or something else?

**SP-07-Q04.** What operations does it actually support today? List from the vendor.

**SP-07-Q05.** Which of these requested concepts does it actually support: costs, pricing, revenue scenarios, margins, burn, runway, sensitivity, scenario compare?

**SP-07-Q06.** For each unsupported concept, do we drop it, compute it ourselves, or fail the finance step?

**SP-07-Q07.** Spec section 6 says deterministic code should handle arithmetic checks. If we compute a metric ourselves, is that still “through the confirmed cfo.ai workflow,” or does that violate the must-have?

**SP-07-Q08.** What are rate limits, cost, latency, and retention terms?

**SP-07-Q09.** Required attribution copy?

**SP-07-Q10.** Who confirms the workflow, in writing, before other finance work starts?

### The one comparison

**SP-07-Q11.** What is the must-have comparison, exactly (which two or more states of the world)?

**SP-07-Q12.** Is a do-nothing / status-quo scenario required?

**SP-07-Q13.** Are the spec examples (broad launch, enterprise-only, pilot, delay, no build) the scenario set, a superset, or a menu the agent may choose from?

**SP-07-Q14.** How many cfo.ai invocations is v1 allowed to make per Decision?

**SP-07-Q15.** Does “one financial comparison” mean one vendor call, or one screen that may use several calls?

### Inputs

**SP-07-Q16.** What is the required input list for a scenario to be finance-ready?

**SP-07-Q17.** Which inputs come from SP-03 unchanged?

**SP-07-Q18.** Which inputs are assumptions the user must type?

**SP-07-Q19.** Which inputs may the agent propose?

**SP-07-Q20.** Are we allowed to derive adoption from the panel? If yes, write the mapping rule (it is an assumption). If no, say so.

**SP-07-Q21.** If panel-derived adoption is forbidden, where does adoption come from?

**SP-07-Q22.** What time horizon does finance use (months of runway, 12 months, 3 years, user-chosen)?

**SP-07-Q23.** What cost categories are in v1 (build cost, inference cost, support, sales, COGS, other)?

**SP-07-Q24.** Who estimates build cost for “AI analytics,” and how is that estimate labeled?

**SP-07-Q25.** Currency, tax, and accounting basis?

**SP-07-Q26.** Must every numeric input cite an Assumption or Evidence id?

**SP-07-Q27.** What ranges vs point estimates are required?

### Outputs

**SP-07-Q28.** What outputs must we display if the vendor returns them?

**SP-07-Q29.** What outputs must we display even if the vendor does not return them? (If any, that implies our own math — confirm that is wanted.)

**SP-07-Q30.** How do we show that numbers are not verified forecasts?

**SP-07-Q31.** Do we store vendor raw output plus a mapped view?

**SP-07-Q32.** How do we treat a vendor narrative vs a vendor number?

### Sensitivity (if in scope)

**SP-07-Q33.** Given SP-01’s inclusion choice: which inputs are swept?

**SP-07-Q34.** How many points per input? Who chooses the range?

**SP-07-Q35.** Does sensitivity run inside cfo.ai, inside our deterministic code, or not at all in v1?

**SP-07-Q36.** How do we show “which assumptions have the greatest effect” if the vendor cannot?

### Checks

**SP-07-Q37.** Which arithmetic checks are mandatory (example: negative revenue forbidden, runway = cash/burn if both exist, percentages in 0–100)?

**SP-07-Q38.** If vendor output fails a check, do we reject, warn, or hide the number?

**SP-07-Q39.** If intake runway and modeled runway disagree, what happens?

### Agent interface

**SP-07-Q40.** What tool(s) does the agent get, and what may it not send (unlabeled adoption, missing costs)?

**SP-07-Q41.** Must the operator approve the assumption pack before any cfo.ai call?

**SP-07-Q42.** May the agent change assumptions and recall finance during one Run?

### Demo, fallback, testing

**SP-07-Q43.** What on-screen proof shows cfo.ai was used?

**SP-07-Q44.** Live vs labeled fixture?

**SP-07-Q45.** Smoke test definition and when it runs.

**SP-07-Q46.** Fallback if cfo.ai is down: skip finance, use labeled toy numbers, stop recommendation, something else?

**SP-07-Q47.** If fallback numbers are used, are they allowed to look like cfo.ai output, or must they be visually distinct?
