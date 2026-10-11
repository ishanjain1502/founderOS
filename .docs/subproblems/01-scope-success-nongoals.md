# SP-01 — Scope, success, and non-goals

## Why this is a subproblem

The spec describes a product idea, a hackathon slice, a demo narrative, and several “must not claim” rules. Those are different layers. Implementation cannot start until it is explicit which layer we are building now, what “done” looks like, who the audience is, and which illustrative examples are frozen demo content versus general product behavior.

If this subproblem is left unanswered, later subproblems will silently expand: a general decision engine, a research platform, a finance tool, and a startup simulator all fit the same words.

## Discussion

The spec’s one-sentence pitch is: an autonomous CEO agent that evaluates a proposed SaaS feature against real market signals, a simulated customer panel, and financial scenarios, then recommends what to do next, with an observable and revisable decision trail.

That pitch still leaves the **unit of delivery** unspecified:

- A 3–5 minute hackathon demo of **one** frozen scenario.
- A working app that can accept **other** feature decisions after the demo.
- A reusable agent that other companies could point at their own product.

The spec says: “Build one excellent end-to-end scenario, not a full startup game.” That locks the **hackathon ambition** toward one path. It does not lock whether the software is hardcoded to that path or parameterized and then demonstrated with one path.

“Must-have” items are capabilities in a run, not a statement of how much of the UI or data is fake, stubbed, live, or recorded. “Nice-to-have” items (multiple strategies, sensitivity, contradictory signal, comparison view, exportable report) may be the difference between a thin demo and the “strongest demo” loop in section 7. Whether nice-to-haves are required for *your* definition of success is not decided.

Success is also not only functional. The spec cares about **claim safety**: do not present simulation as survey, competitor signals as demand, or financial outputs as verified forecasts. A system that produces a confident recommendation and hides uncertainty can satisfy a naive “it recommends something” test and still fail the spec.

The audience is unnamed. A judging panel, a teammate, a founder, and a future user need different completeness. The 3–5 minute demo flow is a presentation order, not a product IA.

Platform, language, hosting, auth, and team size are unnamed. Those are not details to invent later; they change every other subproblem’s implementation surface.

## What “implemented to the end” would require

Until the questions below are answered, this list is the **surface**, not a design.

1. A written definition of the deliverable (demo-only vs parameterized product vs both).
2. A written success checklist that a stranger could use to say pass/fail after the demo.
3. A written non-goals list that matches the spec and any extra limits you add.
4. A decision on which nice-to-haves are in or out of the first build.
5. A decision on what is live vs stubbed vs recorded vs illustrative, per required product.
6. A decision on who operates the demo (one presenter, timed, with backup if an API is down).
7. A decision on runtime environment and who owns secrets.
8. A decision on how claim-safety language is enforced in every human-visible surface.
9. A mapping from spec section 8 must-haves to a visible moment in the demo.
10. A stop-rule: what we will not add even if time remains.

## Locked decisions (spec only)

- Product type: decision sandbox, not a certainty engine (sections 1, 11, 12).
- Company type in the idea: existing B2B SaaS considering a new feature (section 1).
- Hackathon shape: one excellent end-to-end scenario, not a full startup game (section 8).
- Must-haves are listed in section 8 (one company profile, one feature decision, one Crustdata path, a small diverse panel, segment aggregation and disagreement, one financial comparison through confirmed cfo.ai workflow, Neatlogs on the main run, Entire using supported features, a recommendation with evidence, assumptions, and uncertainty).
- Nice-to-haves are listed in section 8 and are not must-haves.
- Out of scope is listed in section 8.
- Demo length suggestion: three to five minutes (section 9).
- Strongest demo is the investigate → … → revise loop (section 7).
- Required products must each be visibly contributing, not bolted on without a role (section 10).
- Smoke-test all four products at the beginning and keep fallbacks clearly labeled (section 10).

## Dependencies

- Consumes: none (this is the outer bound).
- Produces answers that constrain every other SP.

## Questions

### Purpose and deliverable

**SP-01-Q01.** For this effort, is the deliverable (a) a one-path hackathon demo, (b) a parameterized app demonstrated with one path, or (c) something else you will define?
b

**SP-01-Q02.** If (b) or (c), what other decisions besides the AI-analytics example must the software be able to accept on day one?
Any kind of

**SP-01-Q03.** Who is the primary audience of the first delivery: hackathon judges, teammates, a specific founder, a future customer, or another party you will name?
everyone, can use it test their feature's prediction

**SP-01-Q04.** What should that audience be able to do after the demo that they could not do before (judge the idea, reuse the tool, invest, something else)?
judge the idea, on the basis of the final report it produces

**SP-01-Q05.** Is “autonomous CEO” a name for this agent, a role the user is playing, a product brand, or all of those?
a personal brand
### Success and failure

**SP-01-Q06.** What is the minimum visible sequence that counts as a successful demo for you, in order?
we take in a codebase, entire runs on it, and mirrors that repo and there is a neatlogs setup on it
feed a example target market beahvior to it, which defines different personalities of existing users
how much money and time we have to execute this
now we decide that we want to test that a certain new feature for it
so now we need to decide few things
1. from code's end, 2. from non code's end
From code's end
a. regression
b. effort estimation
c. blast radius

from non code's end
a. customer response for it
b. market signals and competitor signal's for it
c. judging the idea on basis of generating 1000 agents with different persona and asking them to judge it
d. financial suggestions using cfo.ai, to understand with regards to input money and time we have to execute on this

And composing all of these results, we will make a small report

**SP-01-Q07.** If the contradictory-signal revision (nice-to-have / strongest-demo beat) is cut, does the demo still count as success for you?
we will figure it out on the way, we will create a boiler plate to consume everything, and will build things from most important to least important and the workflow basis
And on the basis of that only we can decide how we are to build this out


**SP-01-Q08.** If one required product is down on demo day, is a labeled fallback still success, a partial success, or a fail?
in that case, apart from neatlogs, we will do an LLM query as a fallback to it, and will ask it to send required details, in the required format

**SP-01-Q09.** How will you score “decision quality” as distinct from “the UI looks complete”? The spec says demonstrate diversity and decision quality rather than maximizing respondent count.
manually judged for now

**SP-01-Q10.** Who is allowed to declare the recommendation “good enough” — you, a rubric, judges, or the agent’s own uncertainty display?
mix of all

**SP-01-Q11.** What would make you throw the demo away even if all integrations respond (example: hidden assumptions, invented numbers presented as facts)?
invented numbers, we are using crustadata and cfo only because, they are very deterministic with their numbers that they present

### Nice-to-have inclusion

**SP-01-Q12.** Are multiple launch strategies in the first build, out, or only if time remains?
single launch, we will keep on posting the updates though

**SP-01-Q13.** Is sensitivity analysis for price and adoption in, out, or only if time remains?
it is in

**SP-01-Q14.** Is the contradictory-signal re-evaluation in, out, or only if time remains?
It is in

**SP-01-Q15.** Is a comparison view for “launch broadly” vs “pilot with one segment” in, out, or only if time remains?
pilot with testing if this new feature is valid

**SP-01-Q16.** Is an exportable decision report in, out, or only if time remains?
it is an IN

**SP-01-Q17.** If time remains after must-haves, what is the first nice-to-have to add, and what is the last?
I cant think of any right now, what we have already is mostly must haves
### Frozen scenario vs general case

**SP-01-Q18.** Is the illustrative company (cash $2M, 1,000 customers, $80k MRR, 12 months runway, AI analytics premium feature) the **only** scenario the software will run in the hackathon?
(b) No — default example only; users supply their own company/feature (see Q01b, Q20).

**SP-01-Q19.** If it is the only scenario, which of those numbers are frozen inputs, which may be edited live, and which are computed?
this is just a general scenrio given for example all these numbers will be filled initially as discussed

**SP-01-Q20.** If it is not the only scenario, what is the allowed input space (any B2B SaaS feature, only analytics, only premium add-ons, etc.)?
anything, from pricing change to a new feature, to minor UI changes

**SP-01-Q21.** The spec’s example recommendation is “run a small enterprise validation pilot first.” Must the live agent be allowed to recommend a different path, or must the demo land on that path?
yes, it should give the output of the test run it did

**SP-01-Q22.** If the live agent must be allowed to differ, how do you still guarantee a coherent 3–5 minute story?
(d) Two modes: **Demo mode** with pre-made scenario cards; clicking a card auto-fills each stage so the walkthrough moves quickly. **Full mode** — parameterized live runs (recommendation may differ from the spec example).

### Platform and ownership (unspecified in spec)

**SP-01-Q23.** What runtime are we targeting (local only, cloud, both)?
cloud

**SP-01-Q24.** What language(s) and application shape are allowed or forbidden (CLI, web app, notebook, desktop, something else)?
allowed - webapp

**SP-01-Q25.** Who owns deployment, domains, and API keys?
aws

**SP-01-Q26.** Is there a deadline, judging time slot, internet constraint, or offline requirement?
no

**SP-01-Q27.** How many people will operate the system during the demo, and what is each person allowed to click or say?
10 maximum

**SP-01-Q28.** Must a third party be able to clone and rerun this after the hackathon, or is a live laptop sufficient?
repo is going to be opensource
### Claim safety as a product requirement

**SP-01-Q29.** Where must the words “simulated,” “illustrative,” “assumption,” and “not a forecast” appear — every screen, only panel/finance screens, only export, spoken only, or another rule you will state?
**(L2)** Mandatory on **export/report** and on **any UI number, chart, or statistic** (use SP-02-Q42 glossary: Observed / Simulated / Assumed / Inferred). “Not a forecast” / illustrative on finance and export; simulated on all panel metrics. Other screens use same terms when showing data.

**SP-01-Q30.** Are we allowed to show a single headline recommendation without visible uncertainty on the same view?
Primary output is a **report**: any headline is fine, but the report must lay out statistics and data-backed reasoning for the conclusion — per source, what each data source represented, and what the agent inferred from it (not headline-only without that backing on the report).

**SP-01-Q31.** Who is liable, in your intent, if someone treated the sandbox as a real go-to-market decision — is that a documented misuse, a blocked action, or out of scope to consider?
nothing to worry

### Process

**SP-01-Q32.** Which of these docs is the source of truth after you start answering: this folder, `.docs/init.md`, or a new decisions file you want created?
the answer itself, init.md is overview and guiding source

**SP-01-Q33.** Do you want a single running “decisions log,” or answers left under each question ID?
answer left under each question id
