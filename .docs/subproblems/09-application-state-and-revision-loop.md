# SP-09 — Application-owned state and revision loop

## Why this is a subproblem

The spec splits two notions of “history” that people will confuse:

- **Entire**: development checkpoints/history using **supported** Entire features. Not the simulated company’s business-state brancher unless Entire explicitly does that.
- **Application-owned state**: assumptions, scenarios, panel results, evidence, financial inputs/outputs, decision and revisions.

Workflow step 8 says any business-simulation branching must be implemented by our application unless Entire explicitly supports it.

Workflow step 10: if new evidence contradicts an assumption, the agent can re-evaluate. Section 7’s strongest demo includes receive new evidence → revise.

Without this subproblem, we either overload Entire with meaning it may not have, or we produce a one-shot essay with no revisable trail.

## Discussion

“Record the decision state” is not the same as “git commit.” It is the working memory of the sandbox: what we believed, what we simulated, what we modeled, what we recommended, and what changed.

End-to-end implementation of state means answering:

- **Where** it lives (memory only, file, database, browser, git — unspecified; choosing is an assumption).
- **What** a snapshot contains (the object inventory in SP-02).
- **When** a snapshot is taken (after each tool, after recommendation, on operator save, on revision).
- **How** two snapshots relate (linear history, named scenarios, branches, diffs).
- **Who** can mutate it.
- **How** a revision is triggered (user pastes a signal, agent re-fetches Crustdata, a fixture in the demo).
- **What** is immutable after recommendation (audit) vs editable.

The spec’s second demo beat: introduce a contradictory signal that weakens the enterprise-demand hypothesis; the agent revises and explains why. Nice-to-have in section 8; part of strongest demo in section 7; present in section 9’s flow. Inclusion is a SP-01 question, but the **state design** still needs to allow revision if you want that beat at all.

“Contradictory signal” is unspecified: a new competitor, a lost enterprise deal, a pricing change, a fake news item, a user toggle, a second Crustdata fetch. The mechanism of introduction is a demo/UX question (SP-13) and a state question (what object is appended).

Branching of *business* scenarios (broad vs pilot) is application-owned. That may look like git branches in the UI if we metaphorically say “branch,” but the spec forbids attributing that branching to Entire unless verified. Copy discipline belongs here and in SP-12.

Concurrency, multi-user, and long-term persistence are unspecified and likely out of hackathon scope — still ask, so we do not silently build them.

## What “implemented to the end” would require

1. A store for Decision state (technology unchosen).
2. A snapshot/version model for recommendation history.
3. Mutation APIs/rules: append evidence, replace panel, replace finance, supersede recommendation.
4. A revision trigger path: new evidence in → contradiction detection (rule or agent) → re-run selected steps → new recommendation → explanation of delta.
5. Immutability/audit: can past recommendations be edited in place?
6. Export of state if SP-01 includes exportable report.
7. Clear names in UI: “scenario” vs Entire “checkpoint.”
8. Survival across demo refresh vs in-memory only.
9. Failure: partial writes, mid-revision crash.
10. What, if anything, is mirrored into Entire (probably development checkpoints, not business state — SP-12).

## Locked decisions (spec only)

- Application-owned state list (architecture section).
- Business-simulation branching is our application’s job unless Entire explicitly supports the needed behavior (sections 2.8, 4 Entire, 8 out of scope, 10 risk table).
- Agent can re-evaluate if new evidence contradicts an assumption (section 2.10).
- Strongest demo includes receive new evidence → revise (section 7).
- Nice-to-have: contradictory signal that triggers re-evaluation (section 8).
- Demo flow step 8: introduce one new signal and watch the agent reassess (section 9).
- Keep application-owned scenarios in our own state store (section 10).

## Dependencies

- Consumes: SP-01 (is revision in v1), SP-02 (objects), SP-04 (contradiction meaning), SP-05/06/07/08 outputs.
- Produces: the revisable trail SP-10 orchestrates and SP-13 displays.
- Adjacent to SP-12 (must not steal Entire’s name for this store).

## Questions

### Store

**SP-09-Q01.** Where must v1 state live (process memory, local files, SQLite, browser, hosted DB, something else)?

**SP-09-Q02.** Must state survive restart during the demo?

**SP-09-Q03.** Must state survive after the hackathon for judging or replay?

**SP-09-Q04.** Is more than one Decision stored at a time?

**SP-09-Q05.** Is multi-operator access required?

**SP-09-Q06.** What is the backup/reset story for a live demo (one-click reset to fixture)?

### Snapshot and identity

**SP-09-Q07.** What is the unit of history: every tool result, every completed stage, every recommendation, every operator action?

**SP-09-Q08.** Do we keep a linear log, named versions, or a tree of scenario branches?

**SP-09-Q09.** What is the name of a stored point in *our* UI so it cannot be confused with Entire checkpoints?

**SP-09-Q10.** Are scenario comparisons separate records or views over one snapshot?

**SP-09-Q11.** Must every snapshot be diffable against the previous recommendation?

### Mutability

**SP-09-Q12.** After a recommendation is produced, which objects are frozen?

**SP-09-Q13.** Can the user edit an assumption in place, or only by creating a revision?

**SP-09-Q14.** Can the user delete evidence?

**SP-09-Q15.** Can the user force a recommendation text edit without a new agent run?

**SP-09-Q16.** Who owns writes: only the agent runtime, or also the UI?

### Revision trigger

**SP-09-Q17.** Is the contradictory-signal beat in v1? (Align with SP-01-Q14.)

**SP-09-Q18.** How is the new signal introduced: typed by presenter, picked from a list, loaded from a file, second Crustdata fetch, toggle in UI, something else?

**SP-09-Q19.** What is the exact contradictory signal for the demo (write the content if you already want it frozen)?

**SP-09-Q20.** Does that signal enter as Evidence, as Assumption change, as User note, or as something else?

**SP-09-Q21.** Which steps re-run on revision: research, panel, finance, comparison, all, agent-chosen, operator-chosen?

**SP-09-Q22.** Must contradiction be detected by deterministic rules, by the agent, or by the presenter asserting it?

**SP-09-Q23.** If the new signal does *not* change the recommendation, is that an allowed outcome or a demo failure?

**SP-09-Q24.** Must the UI show previous vs new recommendation simultaneously?

**SP-09-Q25.** Must the explanation of change cite the new signal id and the contradicted assumption id?

### Branching of business scenarios

**SP-09-Q26.** Are parallel scenarios stored as branches of state, as sibling objects in one snapshot, or as separate Decisions?

**SP-09-Q27.** Can the operator “check out” an old recommendation and continue from there?

**SP-09-Q28.** What verbs are allowed in the product copy: branch, checkpoint, version, snapshot, revision? Which are reserved for Entire?

### Integrity

**SP-09-Q29.** What happens if the process dies between saving panel results and saving the recommendation?

**SP-09-Q30.** Are writes atomic per snapshot?

**SP-09-Q31.** Do we need checksums or schema version fields in v1?

### Export

**SP-09-Q32.** If exportable report is in (SP-01-Q16), what subset of state does it contain?

**SP-09-Q33.** What format (PDF, markdown, JSON, something else)?

**SP-09-Q34.** Does export include simulated labels on every panel/finance section?
