# SP-10 — Autonomous CEO agent orchestration

## Why this is a subproblem

The architecture says the **agent orchestrates** the workflow. The product must perform a sequence of actions, not emit one polished answer. Section 6 also says deterministic code should handle schemas, arithmetic, budget constraints, duplicate removal, validation, and scenario comparisons wherever possible; LLM calls are for language understanding or judgment.

That split is a real implementation problem: what is a model, what is a tool, what is a fixed pipeline, what is allowed to retry, and what must never be left to free-form generation.

No model vendor, tool framework, or autonomy level is specified.

## Discussion

“Autonomous” in the title can mean several incompatible things:

- The operator clicks **Run** and the agent walks the whole pipeline unattended.
- The agent proposes the next step and waits for approval each time.
- The pipeline is a fixed script; an LLM only fills judgment-shaped holes (hypotheses, respondent evaluations, explanation).
- A general agent may choose extra tools and loops until it stops.

The spec’s numbered workflow (receive → research → hypotheses → panel → evaluate → finance → compare → record → decide → observe/revise) looks like a **directed path**. It does not say whether the agent may skip, reorder, or loop steps except for revision when new evidence arrives.

Section 7 lists capabilities the product must actually perform. A single LLM call that *claims* it did them fails the Neatlogs story: the demo must prove investigation, evaluation, and change.

Budget constraints (section 6) are listed next to schemas and arithmetic as deterministic. That likely means **our** runtime budget (calls, time, money), not the SaaS company’s budget — but it could mean both. Ask.

Retries, validation failures, and revisions must be real because Neatlogs is supposed to show them. Inventing a fake retry in the UI would be theater. So the orchestrator needs actual invalid-output paths.

Tool boundaries:

- Crustdata research (SP-05)
- Panel run (SP-06)
- cfo.ai (SP-07)
- Maybe state load/save (SP-09)
- Maybe “ingest new evidence” (SP-09)

The LLM-shaped holes might be:

- interpreting Crustdata into hypotheses (without promoting them to evidence)
- producing respondent evaluations if you chose LLM-for-panel
- writing the recommendation explanation
- deciding that new evidence contradicts an assumption

Every hole needs I/O schemas so deterministic validation can wrap it.

Model choice, temperature, prompt storage, PII, and logging of prompts into Neatlogs are unspecified. Prompt logging may duplicate or conflict with Neatlogs (SP-11).

Human-in-the-loop vs autonomy also changes the 3–5 minute demo: an approval at every step may not fit; a fully silent run may look like a black box unless the UI streams stages.

## What “implemented to the end” would require

1. A stated autonomy policy (what the agent may do without asking).
2. A stated control flow (fixed pipeline vs planned agent vs hybrid).
3. A tool list with schemas, timeouts, budgets, retry rules.
4. A split table: deterministic module vs LLM task, covering every workflow step.
5. Input packet construction for each LLM task (no silent extra context).
6. Output validation and retry/fail behavior.
7. Stage events the UI and Neatlogs can both consume.
8. Stop conditions: success, budget exhausted, validation failed, operator abort.
9. Revision entry point that reuses the same orchestrator.
10. Secrets handling for vendor keys (where stored, who injects).
11. Model provider, identity, and what happens if the model is down (SP-14).
12. Deterministic budget enforcement (max calls, max tokens, max seconds, max dollars — whichever you require).

## Locked decisions (spec only)

- Agent orchestrates; deterministic code for schemas, arithmetic checks, budget constraints, duplicate removal, validation, scenario comparisons wherever possible; LLM for language understanding or judgment (section 6).
- Product must actually perform the action sequence in section 7, not only generate a recommendation.
- Strongest demo loop: Investigate → simulate → model → compare → decide → receive new evidence → revise.
- Neatlogs makes tool use, steps, failures, retries, and revisions inspectable (section 2.10, 4).
- Too many agent calls: use batching, bounded samples, structured outputs, deterministic aggregation (section 10).

## Dependencies

- Consumes all of SP-01–SP-09 and SP-14.
- Emits events for SP-11 and stages for SP-13.
- Does not own Entire semantics (SP-12).

## Questions

### Autonomy and control flow

**SP-10-Q01.** After intake is complete, does the operator press one Run, approve each stage, or something else?

**SP-10-Q02.** May the agent skip a stage (example: skip Crustdata if user pasted competitors)?

**SP-10-Q03.** May the agent reorder stages?

**SP-10-Q04.** May the agent loop a stage (example: extra Crustdata searches) without a revision trigger?

**SP-10-Q05.** Is the workflow a hard-coded state machine with LLM nodes, a free-form tool-calling agent, or a hybrid you will define?

**SP-10-Q06.** What does “autonomous” mean in the product copy, in one sentence you will stand behind?

**SP-10-Q07.** Can the operator pause, abort, or resume a run?

**SP-10-Q08.** Can the operator inject a message mid-run (“ignore SMB”)? In or out of v1?

### Deterministic vs LLM split

**SP-10-Q09.** For each workflow step below, mark it: deterministic only / LLM / either / both (LLM then deterministic check). Steps: intake parsing; Crustdata query construction; Crustdata payload mapping; hypothesis formation; archetype/profile generation; respondent evaluation; panel aggregation; finance input mapping; finance output mapping; arithmetic checks; scenario listing; scenario comparison; recommendation choice; recommendation prose; contradiction detection; revision prose.

**SP-10-Q10.** Are there LLM uses you forbid even if convenient (example: adding numbers, choosing prices, inventing competitors)?

**SP-10-Q11.** Must every LLM output pass a JSON/schema validator before it can affect state?

**SP-10-Q12.** Who writes and versions prompts? Are prompts product artifacts in the repo?

**SP-10-Q13.** May prompts include the illustrative spec percentages as few-shot examples? (That could bias the panel toward the demo story.)

### Tools

**SP-10-Q14.** What is the complete tool list for v1?

**SP-10-Q15.** For each tool: timeout, max retries, retry on which errors, idempotency expectation?

**SP-10-Q16.** What is the max number of LLM calls per Run (panel included or excluded)?

**SP-10-Q17.** What is the max number of external vendor calls per Run, per vendor?

**SP-10-Q18.** What is the max wall-clock time per Run?

**SP-10-Q19.** What is the max dollar cost per Run?

**SP-10-Q20.** Who enforces those budgets — deterministic wrapper around the agent?

**SP-10-Q21.** What happens when a budget is hit: partial recommendation with gaps, abort, operator choice?

### Models and runtime

**SP-10-Q22.** Which model provider(s) and model id(s) are allowed?

**SP-10-Q23.** Is more than one model allowed (cheap for panel, stronger for recommendation)?

**SP-10-Q24.** What happens if the model API is down?

**SP-10-Q25.** Are local models in scope?

**SP-10-Q26.** What temperature / sampling requirements exist, if any? (Spec says temperature alone must not create the market.)

**SP-10-Q27.** Where do API keys live, and who supplies them at demo time?

**SP-10-Q28.** Is network egress other than the four required products plus the LLM provider forbidden?

### Structured packets

**SP-10-Q29.** What may the hypothesis-formation step see (raw Crustdata only, mapped evidence only, intake, all)?

**SP-10-Q30.** What may the recommendation step see (aggregates vs raw panel rows, truncated evidence, finance mapped vs raw)?

**SP-10-Q31.** Must those packets be logged as the actual tool/LLM inputs?

**SP-10-Q32.** How do we prevent the recommendation model from seeing unlabeled illustrative numbers and restating them as facts?

### Failures and retries

**SP-10-Q33.** Which failures are retried vs fatal vs skipped-with-gap?

**SP-10-Q34.** Must we *intentionally* have a visible validation failure in the demo so Neatlogs can show it, or only if it happens naturally?

**SP-10-Q35.** If intake is free text, does a parser LLM fail closed when it cannot extract required fields?

### Observability hooks

**SP-10-Q36.** What stage names must be emitted, in order, for UI and Neatlogs?

**SP-10-Q37.** Do we emit one trace per Run, per stage, per tool call, or all of these?

**SP-10-Q38.** How is a Revision represented as a continuation vs a new trace (see also SP-11)?

### Testing the orchestrator

**SP-10-Q39.** What is a passing “agent that works” test beyond “it returned markdown”?

**SP-10-Q40.** Do we need a recorded end-to-end run with all vendors stubbed for CI?

**SP-10-Q41.** Who owns the definition of a golden path for the demo vs a golden path for tests?
