# SP-11 — Neatlogs observability

## Why this is a subproblem

Must-have: Neatlogs instrumentation for the main agent run. Purpose: make the multi-step run inspectable — tool use, steps, failures, retries, revisions.

The spec is explicit: Neatlogs is the **observability layer, not the decision engine**. Verify current SDK and integration surface before committing to specific trace features.

Without this, judges (or we) cannot tell an investigated decision from a single generated memo.

## Discussion

Observability here has a product job, not only an engineering job. The demo beat is: open Neatlogs to inspect the multi-step run and any revision. So Neatlogs must be **visible in the demo**, not only useful to developers.

That still leaves open:

- What SDK/API exists today, in the environment we actually have.
- What we send: spans, logs, payloads, prompt text, token counts, errors.
- How much payload is too much (Crustdata raw JSON, 1000 respondent rows).
- Privacy: keys, prompts, vendor data retention.
- How a judge gets from our UI to Neatlogs (link, embedded view, separate tab, screenshot fallback).
- What “revisions” look like in Neatlogs (child trace, same trace, tagged event).
- Whether we must show a *failure and retry* live, or only that the system *can* record them.

The spec wants structured inputs/outputs and failures **where supported**. “Where supported” is the same hard gate as cfo.ai.

There is a risk of duplication: our app UI already shows stages; Neatlogs shows them too. The spec wants each required product to contribute visibly. If our UI copies a fake “trace,” Neatlogs feels bolted on. If we only use Neatlogs and our UI is a black box, the 3–5 minute flow may not show investigation without leaving the app.

Entire vs Neatlogs: Entire is development history; Neatlogs is agent-run inspectability. Using Entire to “show the agent thought” would be the wrong product.

## What “implemented to the end” would require

1. Verified Neatlogs product surface, auth, project, SDK.
2. A mapping from orchestrator events (SP-10) to Neatlogs primitives that actually exist.
3. Instrumentation of the main Run: start, each tool, each LLM call if required, validation fail, retry, end, revision.
4. Payload policy: what is attached, truncated, redacted.
5. A demo path to open the trace in time.
6. Labeled fallback if Neatlogs is down (local log file? screenshot? still must be labeled).
7. Proof that the recommendation can be tied to the trace id in application state.
8. Smoke test at the beginning (section 10).

## Locked decisions (spec only)

- Purpose: inspectable multi-step agent run (section 4).
- Planned use: trace steps and tool calls; record structured I/O and failures where supported; show retries, validation failures, revisions; prove investigation rather than one polished answer.
- Not the decision engine; verify SDK/integration before committing to features.
- Must-have: instrumentation for the main agent run.
- Demo beat: open Neatlogs to inspect the run and any revision.
- Smoke-test; labeled fallbacks.

## Dependencies

- Consumes: SP-10 event model, SP-01 (revision in or out), SP-14 (fallback).
- Should be able to show SP-05/06/07/08/09 work as real calls, not summaries.
- Must not be asked to store business-state branching (that is SP-09).

## Questions

### Product verification

**SP-11-Q01.** Do we already have Neatlogs access (account, project, keys, docs)?

**SP-11-Q02.** What official SDK/docs are the source of truth for this hackathon?

**SP-11-Q03.** What primitives actually exist (trace, span, event, log, artifact, session, something else)?

**SP-11-Q04.** What languages/runtimes does the SDK support, and does that constrain SP-01 platform choice?

**SP-11-Q05.** Is there a hosted UI we can open in the demo? URL pattern?

**SP-11-Q06.** Auth for the hosted UI during judging (public link, login, invite)?

**SP-11-Q07.** Retention, PII policy, and whether prompts/tool payloads are allowed to be stored.

**SP-11-Q08.** Cost, rate limits, max payload size.

**SP-11-Q09.** Required attribution?

**SP-11-Q10.** Who verifies the SDK *before* instrumentation design is treated as decided?

### What to instrument

**SP-11-Q11.** Is “main agent run” one trace covering research+panel+finance+decide?

**SP-11-Q12.** Is the panel’s N respondent evaluations each a span, batched spans, or hidden behind one “run_panel” span?

**SP-11-Q13.** Must LLM prompts and completions be recorded, or only tool I/O?

**SP-11-Q14.** Must validation failures be recorded even if retried successfully?

**SP-11-Q15.** Must retries be explicit events vs just duplicate spans?

**SP-11-Q16.** How is a revision represented (new trace linked to old, same trace, tagged run group)?

**SP-11-Q17.** Do we record operator actions (click Run, paste contradictory signal)?

**SP-11-Q18.** Do we record deterministic modules (aggregation, arithmetic checks) or only LLM/vendor calls?

**SP-11-Q19.** Must each span include the Decision id and Recommendation id?

### Payload policy

**SP-11-Q20.** What is redacted (API keys, full Crustdata payloads, full panel rows, financial raw output)?

**SP-11-Q21.** What is truncated and to what size?

**SP-11-Q22.** Do we attach our mapped objects, vendor raw, or both?

**SP-11-Q23.** Are simulated-panel labels included in traces so a Neatlogs viewer cannot mistake them for real interviews?

### Demo

**SP-11-Q24.** How does the presenter open Neatlogs in the 3–5 minute flow (button in our UI, bookmark, separate monitor)?

**SP-11-Q25.** What three things must a judge see in Neatlogs to count as success (example: Crustdata call, panel call, finance call)?

**SP-11-Q26.** Must they see a retry or failure, or is a clean success trace enough?

**SP-11-Q27.** If revision is in scope, must both recommendation versions be visible in Neatlogs?

**SP-11-Q28.** Is a screenshot of Neatlogs an acceptable fallback if live UI login fails, if labeled?

### Fallback and failure

**SP-11-Q29.** If Neatlogs ingest fails, does the agent run continue?

**SP-11-Q30.** If it continues, how do we still show observability (local log, in-app trace labeled “not Neatlogs”)?

**SP-11-Q31.** Is a fake in-app trace allowed in addition to Neatlogs, or does that steal the product’s role?

### Correlation

**SP-11-Q32.** Do we store neatlogs_trace_id on the Decision state?

**SP-11-Q33.** Deep link from our recommendation screen to the trace?

**SP-11-Q34.** Correlation with Entire checkpoints (SP-12) — wanted in v1 or not?

### Testing

**SP-11-Q35.** Smoke test: create a trace, open it, confirm fields X, Y, Z. What are X, Y, Z?

**SP-11-Q36.** Do CI tests run against a Neatlogs sandbox, a mock, or not at all?
