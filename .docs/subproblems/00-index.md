# Autonomous CEO Decision Sandbox — Subproblem Index

Source spec: `.docs/init.md` (title: Autonomous CEO Decision Sandbox). The filename `.docs/autonomous_ceo_decision_sandbox.md` was referenced in discussion but is not present in the repo; this decomposition treats `.docs/init.md` as the only spec.

This folder decomposes that spec into subproblems that **must** be solved before implementation. Nothing here invents product behavior, stack, APIs, UX, or architecture beyond what the spec already states.

## How to use these docs

1. Read this index for the split and the dependency map.
2. Read each subproblem doc. Each one has:
   - the problem, in depth
   - what “implemented to the end” would have to cover
   - **locked decisions** copied from the spec only
   - **locked answers** on each question line (design pass complete for SP-01–SP-14 as of repo state)
3. Answer questions by **ID** (example: `SP-06-Q12`). **Bold text after a question ID** is the decision; change only deliberately and keep IDs stable.

## Implementation specs and plans

| SP | Spec | Plan |
|----|------|------|
| SP-01 | `.docs/specs/SP-01-scope-success-nongoals.md` | `docs/superpowers/plans/2026-10-11-sp01-scope-foundation.md` |
| SP-02 | `.docs/specs/SP-02-shared-domain-contracts.md` | `docs/superpowers/plans/2026-10-11-sp02-domain-contracts.md` |
| SP-03 | `.docs/specs/SP-03-decision-intake-and-company-context.md` | `docs/superpowers/plans/2026-10-11-sp03-intake-and-company-context.md` |
| SP-04 | `.docs/specs/SP-04-evidence-assumptions-uncertainty.md` | `docs/superpowers/plans/2026-10-12-sp04-evidence-assumptions-uncertainty.md` |
| SP-05 | `.docs/specs/SP-05-crustdata-market-research.md` | `docs/superpowers/plans/2026-10-12-sp05-crustdata-market-research.md` |

Subproblem question docs remain the Q&A source of truth; specs consolidate locked answers for builders.

## What is not assumed

The spec does not choose:

- programming language, framework, hosting, database, or UI
- exact Crustdata, cfo.ai, Entire, or Neatlogs APIs
- whether the demo is hardcoded to one company/feature or accepts arbitrary input
- how synthetic respondents are generated
- how financial numbers are computed vs delegated to cfo.ai
- how application state is stored
- what the screen looks like

Those appear only as questions.

## Subproblems

| ID | File | Subproblem | Questions | Why it is separate |
|---|---|---|---|---|
| SP-01 | `01-scope-success-nongoals.md` | Scope, success, and non-goals | 35 | Bounds every other subproblem. If this stays vague, the rest expands into a startup game. |
| SP-02 | `02-shared-domain-contracts.md` | Shared objects that pass between parts | 43 | Without named objects and their meaning, integrations cannot meet at a boundary. |
| SP-03 | `03-decision-intake-and-company-context.md` | Receiving the decision and the one company/feature | 39 | Workflow step 1. Must-have: one SaaS company, one proposed feature. |
| SP-04 | `04-evidence-assumptions-uncertainty.md` | Facts vs inferences vs assumptions vs unknowns | 36 | The spec’s core claim. Every other output has to sit in this overlay. |
| SP-05 | `05-crustdata-market-research.md` | External market evidence | 44 | Required product. Does not prove demand. |
| SP-06 | `06-synthetic-market-panel.md` | Simulated customer panel | 61 | Built by us. Complementary to Crustdata, not a substitute for real interviews. |
| SP-07 | `07-cfo-ai-financial-evaluation.md` | Financial scenarios | 47 | Required product. Outputs are only as good as explicit inputs. |
| SP-08 | `08-scenario-comparison-and-recommendation.md` | Compare options, recommend, name next experiment | 35 | Workflow steps 7 and 9. The CEO output. |
| SP-09 | `09-application-state-and-revision-loop.md` | Application-owned state and re-evaluation | 34 | Spec forbids treating Entire as the business-state brancher. Workflow steps 8 and 10. |
| SP-10 | `10-agent-orchestration.md` | Autonomous CEO agent loop | 42 | Orchestrates tools; `code_impact` gated by `SKIP_CODE_IMPACT`. |
| SP-11 | `11-neatlogs-observability.md` | Inspectable agent run | 36 | Required product. Observability, not the decision engine. |
| SP-12 | `12-entire-checkpoints-and-history.md` | Entire dev history + server code impact alt. | 33 | Required Entire (CLI/hooks). Track B = git+OSS alternate to entire.io. |
| SP-13 | `13-human-interface-demo-and-reporting.md` | What a human sees in 3–5 minutes | 41 | Demo flow and labels. UI is unspecified. |
| SP-14 | `14-cost-latency-fallbacks-and-integration-risk.md` | Cost, speed, smoke tests, fallbacks, claim safety | 44 | Spec risk table. Cross-cuts every integration. |

Question IDs are stable (`SP-06-Q12`). Total in this pass: **570**. Some questions overlap on purpose where two subproblems would otherwise assume each other’s answers.

## Dependency map

Text only. Arrows mean “needs answers or outputs from.”

```text
SP-01 Scope
  -> SP-02 Domain contracts
       -> SP-03 Intake / company context
       -> SP-04 Evidence / assumption / uncertainty overlay
            -> SP-05 Crustdata
            -> SP-06 Synthetic panel
            -> SP-07 cfo.ai
                 -> SP-08 Scenarios + recommendation
                      -> SP-09 App state + revision
                           -> SP-10 Agent orchestration
                                -> SP-11 Neatlogs
                                -> SP-12 Entire
                                -> SP-13 Human interface / demo
  SP-14 Cost / latency / fallbacks / claim safety
    constrains SP-05, SP-06, SP-07, SP-10, SP-11, SP-12, SP-13
```

SP-04 is not a product; it is a rule layer that SP-05, SP-06, SP-07, SP-08, SP-09, and SP-13 must obey.

SP-02 is not a feature; it is the shared meaning of objects those features exchange.

SP-14 is not a feature; it is the operating envelope (cost, latency, fallbacks, what we are allowed to claim).

## Locked decisions that apply everywhere

Copied from the spec. Not new decisions.

- This is a **decision sandbox**, not a future-predictor.
- Target user situation: an **existing B2B SaaS company** considering a **new feature**.
- Required products in the run: **Crustdata**, **synthetic panel we build**, **cfo.ai**, **Entire**, **Neatlogs**.
- The agent **orchestrates**. Deterministic code should handle schemas, arithmetic checks, budget constraints, duplicate removal, validation, and scenario comparisons wherever possible. LLM calls are for language understanding or judgment.
- Application owns simulation state. Entire is not the business-state branching engine unless its product explicitly supports that.
- Neatlogs is observability, not the decision engine.
- Crustdata does not prove customer demand or willingness to pay.
- Synthetic panel results must be labeled simulated.
- Hackathon must-have is **one excellent end-to-end scenario**, not a full startup game.
- Strongest demo loop: **Investigate → simulate → model → compare → decide → receive new evidence → revise.**

## Explicitly out of scope (spec)

- Claiming synthetic agents predict the real market accurately
- Literally running 100,000 expensive LLM calls during the demo
- A complete startup-management game
- Building the actual product feature being evaluated
- Automatic real-world launch or spending decisions
- Assuming Entire itself branches application business state
- Treating competitor activity as proof of customer demand

## Question-answering convention

- Each question has a stable ID: `SP-XX-QNN`.
- If a question cannot be answered yet (for example because an external API is unverified), say so and say what would unblock it.
- Do not treat illustrative numbers in the spec as real data. The spec marks the company profile, panel percentages, and example recommendation as illustrative.
- A blank question is not a hidden default. “Whatever you think” is still an answer you must give.

## Suggested answering order (blocking first)

This is an order for *deciding*, not a claim about build order.

1. **SP-01** — what we are delivering, which nice-to-haves are in, frozen vs live recommendation, platform, claim-safety strictness.
2. **Vendor verification questions** in **SP-05, SP-07, SP-11, SP-12** (access, actual APIs, what “where supported” means). Until those exist, those products cannot be designed to the end.
3. **SP-03** — what the one company and feature actually are, including the missing product description.
4. **SP-02 + SP-04** — objects and epistemic labels, so later parts share meaning.
5. **SP-06** — panel mechanism, N, whether demo results must match the spec’s story.
6. **SP-08 + SP-09** — how a recommendation is chosen and how it revises.
7. **SP-10** — autonomy, fixed pipeline vs agent, deterministic vs LLM split.
8. **SP-13** — what a human sees, after the information is known.
9. **SP-14** — budgets, smoke tests, fallbacks, ranked demo-day failures.

You can answer in chat by ID (`SP-01-Q01: …`) or by editing the docs. Say which you prefer (**SP-01-Q32**, **SP-01-Q33**).

## What “implementation to the very end” means here

For each subproblem, “to the very end” means listing every hop that would have to exist in a finished system:

trigger → inputs → validation → processing → outputs → persistence → display → observability → failure → fallback → revision

Those hops are listed as **design surface**, not as chosen designs. Choosing them without your answers would be assuming.
