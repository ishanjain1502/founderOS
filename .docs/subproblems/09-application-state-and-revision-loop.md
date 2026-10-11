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

Align with **SP-01** (contradictory-signal revision **in**; export **in**; cloud webapp on AWS), **SP-02** (Session → Decision → Run → Recommendation `draft|current|superseded`; **Revision** object), **SP-03** (intake frozen after first run unless explicit edit), **SP-04** (contradiction blocks publish until resolved or accepted), **SP-07** (**per-tenant** cfo mapping — no shared hackathon tables; finance runs stored even when mapping deferred), **SP-08** (stable `chosenScenarioId` for diffs), **SP-12** (Entire = **dev** history only; never business branching).

**v1 model:** one **Session** per browser visit (or shareable link id); one active **Decision**; **append-only** artifact history (evidence, panel runs, finance runs); **linear** recommendation versions with **Revision** records; business scenarios are **sibling Scenario objects**, not git branches.

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
**Server-side SQLite** database on AWS (webapp backend); large blobs (raw Crustdata/cfo payloads) as **files** under `data/blobs/` keyed by id. **Not** browser-localStorage as source of truth. Process memory only as request cache.

**SP-09-Q02.** Must state survive restart during the demo?
**Yes** — same `sessionId` / Decision must reload after deploy restart or presenter refresh (deep link or session token).

**SP-09-Q03.** Must state survive after the hackathon for judging or replay?
**Yes for open-source replay:** export **JSON bundle** + optional committed **fixtures**; DB file may be wiped in hosted demo — **export is the long-term artifact** for judges cloning the repo.

**SP-09-Q04.** Is more than one Decision stored at a time?
**Yes** — many Decisions per Session allowed in Full mode; **Demo mode** typically one Decision per session. List/history UI optional in v1; data model supports N.

**SP-09-Q05.** Is multi-operator access required?
**No** (SP-03-Q02). Single shared link; no concurrent edit locking in v1 — last write wins with warning if stale.

**SP-09-Q06.** What is the backup/reset story for a live demo (one-click reset to fixture)?
**“Reset demo”** button: new `sessionId`, load `fixtures/demo/decision-card-ai-analytics.json`, clear runs/recommendations. **Does not** delete Entire/git history. Optional **“Replay last export”** for judging.

### Snapshot and identity

**SP-09-Q07.** What is the unit of history: every tool result, every completed stage, every recommendation, every operator action?
**Persisted units:** **Run** (agent execution), **panelRunId**, **financeRunId**, **Evidence** append, **Recommendation** publish, **Revision**, material **operator actions** (intake edit, override, approve assumptions). Neatlogs holds fine-grained tool steps (SP-11); DB holds domain snapshots.

**SP-09-Q08.** Do we keep a linear log, named versions, or a tree of scenario branches?
**Linear** recommendation history per Decision + **append-only** runs. **Business scenarios** (`pilot`, `broad_launch`, …) are **sibling Scenario objects** in one Decision state — **not** a tree of alternate universes.

**SP-09-Q09.** What is the name of a stored point in *our* UI so it cannot be confused with Entire checkpoints?
UI label: **“Decision snapshot”** or **“Recommendation version”** (v1, v2). **Never** “checkpoint” or “branch” for business state. Entire UI: **“Development checkpoint”** only (SP-12).

**SP-09-Q10.** Are scenario comparisons separate records or views over one snapshot?
**View + artifact:** comparison **scorecard** computed from latest panel/finance run ids at publish time; stored as **`comparisonArtifactId`** on Recommendation for reproducibility (inputs frozen as refs).

**SP-09-Q11.** Must every snapshot be diffable against the previous recommendation?
**Yes** for published Recommendations: store **`diffFromPrior`** (structured: `chosenScenarioId`, headline, key metric deltas, assumption changes) generated **deterministically** where possible; agent narrates delta in **Revision.reason**.

### Mutability

**SP-09-Q12.** After a recommendation is produced, which objects are frozen?
**Published Recommendation** immutable. **Evidence** append-only (no in-place edit). **Panel/finance runs** immutable once complete. **Assumptions:** user-locked and `demo_fixture` frozen; others editable only via new version + re-run path.

**SP-09-Q13.** Can the user edit an assumption in place, or only by creating a revision?
**New Claim version** (supersede) + triggers **material change** flow (SP-03-Q04): may new Run or Revision; no silent in-place mutation of ids cited in published Recommendation.

**SP-09-Q14.** Can the user delete evidence?
**No delete in v1** — **quarantine/hide** with reason (audit retains id). Agent cannot delete Evidence.

**SP-09-Q15.** Can the user force a recommendation text edit without a new agent run?
**Operator override** of **headline** or **operator final** field only (SP-08-Q18) — logged; does not rewrite structured refs. Body prose edit requires **new Run** or explicit “edit as user note” not labeled as agent Recommendation.

**SP-09-Q16.** Who owns writes: only the agent runtime, or also the UI?
**Both:** UI writes intake, approvals, overrides, revision triggers; **agent runtime** writes tool outputs, draft Recommendation; **deterministic services** write aggregates, scorecard, diffs.

### Revision trigger

**SP-09-Q17.** Is the contradictory-signal beat in v1? (Align with SP-01-Q14.)
**Yes — in** (SP-01-Q14).

**SP-09-Q18.** How is the new signal introduced: typed by presenter, picked from a list, loaded from a file, second Crustdata fetch, toggle in UI, something else?
**Demo mode:** presenter clicks **“New evidence”** → choose **preset card** (see Q19) or paste short text. **Full mode:** paste URL/text or trigger **optional** second Crustdata fetch. All create append-only **Evidence** or **Claim** per Q20.

**SP-09-Q19.** What is the exact contradictory signal for the demo (write the content if you already want it frozen)?
**Preset id `demo-enterprise-churn-signal`:** *“Lost design partner: Acme Corp (enterprise) paused analytics beta — cited budget freeze and unclear ROI; not a pricing objection.”* Illustrative; labeled **Observed** if user confirms source or **Assumption/user note** if presenter-only.

**SP-09-Q20.** Does that signal enter as Evidence, as Assumption change, as User note, or as something else?
**Primary: new Evidence** (`kind=Observed` if attributed source, else `user_provided` note with timestamp). **Auto-suggest** contradiction on linked **Hypothesis** “enterprise demand strong for analytics add-on.” Operator confirms contradiction (SP-04-Q16).

**SP-09-Q21.** Which steps re-run on revision: research, panel, finance, comparison, all, agent-chosen, operator-chosen?
**Default revision pipeline:** append evidence → **contradiction check** → **re-run comparison + recommendation** (agent). **Optional re-run panel** if signal is demand-related (agent proposes, user confirm). **Re-run Crustdata** only if signal requests market refresh. **Re-run finance** only if assumptions changed or user confirms. **Not** full pipeline by default.

**SP-09-Q22.** Must contradiction be detected by deterministic rules, by the agent, or by the presenter asserting it?
**Two-step:** deterministic **suggest** (new Evidence tags `enterprise` + negative outcome ∧ prior hypothesis refs enterprise) → **operator confirms** contradiction. Agent may add narrative; operator confirmation required in Demo mode.

**SP-09-Q23.** If the new signal does *not* change the recommendation, is that an allowed outcome or a demo failure?
**Allowed** — publish **Revision** with `recommendationUnchanged: true` and explanation why signal was insufficient. Not a demo failure.

**SP-09-Q24.** Must the UI show previous vs new recommendation simultaneously?
**Yes** on revision beat: **side-by-side** or **diff view** (headline + chosen scenario + top 3 assumption changes). Demo path ≤90s on this screen.

**SP-09-Q25.** Must the explanation of change cite the new signal id and the contradicted assumption id?
**Yes** — **Revision** must include `triggeringEvidenceIds[]` and `contradictedClaimIds[]` (or hypothesis ids); narrative optional supplement.

### Branching of business scenarios

**SP-09-Q26.** Are parallel scenarios stored as branches of state, as sibling objects in one snapshot, or as separate Decisions?
**Sibling Scenario objects** under one **Decision** (SP-08 catalog). Separate Decisions only when user starts a **new question** (new `decisionId`).

**SP-09-Q27.** Can the operator “check out” an old recommendation and continue from there?
**View and export old versions yes;** **continue from superseded** = **“Start new Run from this version”** copies assumption set forward (new Run), does not rewrite history. No git-style checkout of business state.

**SP-09-Q28.** What verbs are allowed in the product copy: branch, checkpoint, version, snapshot, revision? Which are reserved for Entire?
**Allowed (app):** **decision**, **scenario**, **run**, **recommendation version**, **revision**, **snapshot** (decision snapshot). **Reserved for Entire/dev only:** **checkpoint**, **branch** (git), **Entire history**. UI copy review gate in SP-13.

### Integrity

**SP-09-Q29.** What happens if the process dies between saving panel results and saving the recommendation?
**Run** stays **`in_progress`**; panel/finance runs already saved remain. Recovery: resume Run or **mark failed**; user **retry** publish. No partial `current` Recommendation — only **`draft`** until atomic publish.

**SP-09-Q30.** Are writes atomic per snapshot?
**Yes** for **Recommendation publish** (transaction: scorecard refs + recommendation + supersede prior). **Append** operations (Evidence, panel run) atomic per id.

**SP-09-Q31.** Do we need checksums or schema version fields in v1?
**Yes:** **`contractVersion: 1`** on all persisted objects (SP-02); optional **content hash** on export bundle for replay verification — not required on every row in v1.

### Export

**SP-09-Q32.** If exportable report is in (SP-01-Q16), what subset of state does it contain?
**Full Decision report:** intake recap, all **Evidence**, latest **panel** aggregates + labels, **`CodeImpactArtifact`** summary or **code impact skipped** note (`SKIP_CODE_IMPACT` / `missingData.codeImpact`), latest **finance** mapped outputs (or gap note), **comparison artifact**, **current Recommendation** + **Revision** history, **Neatlogs** link/id, assumption registry, open unknowns. Excludes raw blob binaries (links only).

**SP-09-Q33.** What format (PDF, markdown, JSON, something else)?
**Primary: Markdown** download; **JSON** bundle for machine replay; **PDF** nice-to-have post-hackathon. Demo shows Markdown export button.

**SP-09-Q34.** Does export include simulated labels on every panel/finance section?
**Yes** — SP-01-Q29 / SP-02-Q42 on every numeric section; finance **Modeled / not a forecast**; panel **Simulated**; explicit **fixture** markers when used.
