# SP-14 — Cost, latency, fallbacks, and integration risk

## Why this is a subproblem

Section 10 is a risk table. Several risks are not features; they are operating constraints that, if unanswered, will be decided accidentally on demo day:

- Synthetic customers sound real → labeling (also SP-04, SP-06, SP-13).
- Crustdata mistaken for demand → epistemic rules (SP-04, SP-05).
- Finance looks too certain → ranges/labels (SP-04, SP-07).
- Required products feel bolted on → each must have a visible job (SP-13).
- Integrations take too long → smoke-test all four at the beginning; labeled fallbacks.
- Too many agent calls → batching, bounded samples, structured outputs, deterministic aggregation.
- Branching attributed to the wrong tool → SP-09 vs SP-12.

This subproblem collects **envelopes and backups**: money, time, what “labeled fallback” means, what we smoke-test, and what we do when a vendor is empty or late.

## Discussion

“To the very end” for a hackathon integration is not only the happy path. It is:

- a test that the vendor works **before** the rest of the build depends on it
- a cap so the demo cannot blow cost or clock
- a fallback that is honest (does not impersonate the vendor)
- a rule for whether a recommendation is allowed with gaps
- a rule for bolted-on prevention: if fallback is used, the product’s contribution might be *missing*, which the spec also cares about

These can conflict. If Crustdata is down and we skip it, we may fail “show real evidence.” If we replay a fixture, we must label it or we fail honesty. If we refuse to recommend without all four products, the demo dies. You have to rank those failures.

Panel N (100–1,000 “if cost and latency permit”) lives here as much as in SP-06. The orchestrator budgets in SP-10 must match the numbers here.

“Smoke-test all four products at the beginning” — beginning of the project, of each day, of the demo, or of each Run? Unspecified.

Fallbacks “clearly labeled” — labeled to developers, to the audience, on every widget, in Neatlogs too?

Batching and structured outputs are tactics the spec names. They are not a chosen architecture. Whether we batch panel respondents, cache Crustdata, or pre-run finance before the demo are open and have honesty implications.

## What “implemented to the end” would require

1. Numeric or qualitative budgets: time per beat, time per Run, money per Run, max calls.
2. A smoke-test checklist for Crustdata, cfo.ai, Neatlogs, Entire, plus LLM provider if used.
3. Per-vendor fallback artifact and label copy.
4. Gap policy: recommend with missing legs or not.
5. Caching/replay policy that cannot be mistaken for live.
6. Load strategy for the demo machine (warm caches vs cold start).
7. Ranked failure modes for demo day.
8. A “bolted on” review: each product’s visible contribution in the happy path and in fallback.

## Locked decisions (spec only)

- Smoke-test all four products at the beginning; keep fallbacks clearly labeled (section 10).
- Bound samples; batch; structured outputs; deterministic aggregation to control cost/latency (section 10).
- Panel around 100–1,000 **if cost and latency permit**; quality over raw count (section 3).
- Not 100,000 expensive LLM calls in the demo (section 8).
- Each product’s contribution should be visible (section 10).
- Make uncertainty explicit rather than hiding behind a fast polished answer (sections 11–12).

## Dependencies

- Constrains SP-05, SP-06, SP-07, SP-10, SP-11, SP-12, SP-13.
- Must be consistent with SP-01 success definition when a vendor is down.

## Questions

### Budgets

**SP-14-Q01.** What is the maximum wall-clock time for a full Run in the demo, excluding presenter talk?

**SP-14-Q02.** What is the maximum wall-clock time per stage (research, panel, finance, recommend, revision)?

**SP-14-Q03.** What is the maximum USD (or other currency) per demo rehearsal and per live demo?

**SP-14-Q04.** What is the maximum USD for the whole hackathon on each vendor and on the LLM?

**SP-14-Q05.** Who pays, and how are keys quota-limited?

**SP-14-Q06.** What is the maximum LLM calls in the live demo Run (and in the revision Run)?

**SP-14-Q07.** What is the maximum Crustdata calls? cfo.ai calls?

**SP-14-Q08.** If a stage exceeds its time budget, kill, background, or skip?

### Panel N vs clock

**SP-14-Q09.** Given SP-06-Q07, what happens if that N cannot finish inside SP-14-Q02? Shrink N, switch to fixture, or overrun?

**SP-14-Q10.** Is there a “demo N” vs “offline N” vs “marketing N”?

**SP-14-Q11.** Are we allowed to precompute the panel before the demo and replay it live if labeled?

**SP-14-Q12.** Are we allowed to precompute Crustdata or cfo.ai similarly?

### Smoke tests

**SP-14-Q13.** When do smoke tests run: project start, CI, daily, demo morning, every app boot, every Run?

**SP-14-Q14.** What is the pass/fail criterion for each of: Crustdata, cfo.ai, Neatlogs, Entire, LLM?

**SP-14-Q15.** Who is responsible for running them, and what is the report format?

**SP-14-Q16.** If a smoke test fails the morning of the demo, what is the go/no-go rule?

### Fallbacks

**SP-14-Q17.** For Crustdata down: exact fallback artifact and on-screen label.

**SP-14-Q18.** For synthetic panel too slow/expensive: exact fallback and label.

**SP-14-Q19.** For cfo.ai down: exact fallback and label.

**SP-14-Q20.** For Neatlogs down: exact fallback and label.

**SP-14-Q21.** For Entire down: exact fallback and label.

**SP-14-Q22.** For LLM down: exact fallback and label.

**SP-14-Q23.** May fallback artifacts impersonate vendor UI chrome (logos) if labeled “replay”?

**SP-14-Q24.** If two vendors are down, do we still demo?

**SP-14-Q25.** If fallback is used, may we still say the product is “integrated,” or must we say “integration failed, showing labeled fixture”?

### Caching and replay

**SP-14-Q26.** Is caching of vendor responses allowed in production/demo?

**SP-14-Q27.** How is a cached/replayed result marked in UI and in Neatlogs?

**SP-14-Q28.** TTL? Manual pin of a known-good fixture?

**SP-14-Q29.** Are fixtures stored in git? Do they contain vendor data that terms forbid committing?

### Bolted-on prevention

**SP-14-Q30.** What visible moment proves Crustdata was necessary to the recommendation (not just a sidebar)?

**SP-14-Q31.** Same question for the panel.

**SP-14-Q32.** Same question for cfo.ai.

**SP-14-Q33.** Same question for Neatlogs.

**SP-14-Q34.** Same question for Entire.

**SP-14-Q35.** If a product cannot be made causally necessary in 3–5 minutes, do we cut it from the spoken pitch even if must-have lists it? (Tension with spec — you must resolve.)

### Ranking demo-day failures

**SP-14-Q36.** Rank these from “still success” to “abort demo”: missing labels; Crustdata fixture; panel fixture; cfo.ai fixture; Neatlogs unreachable; Entire unreachable; agent recommends different path than the script; agent emits a forbidden claim; overrun time; total crash.

**SP-14-Q37.** What is the one failure you will not tolerate even if everything else works?

### Security and keys (cross-cutting)

**SP-14-Q38.** How are secrets provided at runtime (.env, OS keychain, demo-day paste, something else)?

**SP-14-Q39.** Are secrets allowed in logs, Neatlogs, screenshots, recordings?

**SP-14-Q40.** Is there a data-handling rule for Crustdata/cfo.ai payloads on disk?

**SP-14-Q41.** Network allowlist for the demo machine?

### Batching and structure

**SP-14-Q42.** Which calls must be batched (panel respondents, Crustdata profiles, finance scenarios)?

**SP-14-Q43.** What is the maximum payload size we will send to an LLM in one call?

**SP-14-Q44.** Who implements truncation, and is truncated context marked so the agent cannot over-claim on unseen evidence?
