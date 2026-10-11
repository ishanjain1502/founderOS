# SP-12 — Entire checkpoints and history

## Why this is a subproblem

Must-have: an Entire workflow that **demonstrably uses supported features**. Purpose: integrate the development workflow and preserve relevant history using Entire’s **actual** supported features.

The spec’s most repeated warning: do not describe Entire as automatically creating arbitrary branches of the simulated company’s business state unless the product explicitly supports that. Our application owns simulation state (SP-09).

Repo fact (not a product decision): this workspace already has Entire hooks and `.entire/settings.json` with checkpoints type `git-refs`. That shows Entire is present in the **development** environment. It does **not** decide what the demo may claim, and it does not prove which features we are allowed to depend on. Those still need your confirmation against Entire’s current product.

## Discussion

Entire is easy to misuse in a pitch: “we branch the company’s future.” The spec forbids that attribution unless verified.

So the implementation problem is:

1. **Inventory** Entire features that exist for this project today.
2. **Pick a workflow** that is real (connect repo, capture baseline, inspect changes, link demo to history/checkpoints **when available**).
3. **Show it in the demo** as development history, not as the decision sandbox’s scenario tree.
4. **Keep copy honest** when the UI discusses “scenarios” vs “checkpoints.”

Planned use in the spec (still “planned,” not verified):

- Connect the project repository and capture the baseline.
- Use supported checkpoints/history to inspect meaningful development changes.
- Link the demo to relevant history or checkpoints when available.

“Meaningful development changes” are about **building this sandbox**, not about the fictional SaaS company’s feature launch. Mixing those stories in the demo will recreate the bolted-on problem in the opposite direction: Entire looks like a gimmick, or it looks like a business simulator.

Questions that must not be answered by assuming git = Entire:

- Is Entire only git-refs checkpoints, or more?
- What does “connect the project repository” require (account, remote, permissions)?
- What is a baseline in Entire’s vocabulary?
- Can the demo deep-link to a checkpoint?
- Does Entire have APIs we should call from the app, or is the demo “switch to Entire UI”?
- Are we required to make commits at certain agent stages? That would couple SP-10 to git in a way the spec does not require.

The existing `.cursor/hooks.json` Entire hooks suggest development-time integration with Cursor. Whether that counts as the must-have “demonstrably uses supported features” for a 3–5 minute product demo is a question for you, not a conclusion.

## What “implemented to the end” would require

1. Written verification of Entire features in scope (docs + what this repo already has).
2. A demo script beat that uses those features honestly.
3. If the app links to Entire: exact link/API, auth, failure behavior.
4. If the app does not link: a presenter workflow (open Entire, show checkpoint X).
5. Copy review: no “Entire branched the business.”
6. Baseline captured; what “baseline” means in the demo.
7. Labeled fallback if Entire is unavailable (section 10).
8. Smoke test.

## Locked decisions (spec only)

- Purpose: development workflow + relevant history using **actual supported features** (section 4).
- Planned use bullets above; “when available.”
- Application owns simulation state and scenario comparisons.
- Do not assume Entire branches application business state (out of scope; risk table).
- Must-have: Entire workflow that demonstrably uses supported features.
- Demo beat: demonstrate the actual Entire workflow used by the project (section 9).
- Smoke-test; labeled fallbacks.

## Dependencies

- Adjacent to SP-09 (must not absorb business state).
- May correlate with SP-11 traces if you want, not required by spec.
- Demo timing in SP-13.

## Questions

### Product verification

**SP-12-Q01.** What Entire product docs are the source of truth for this hackathon?

**SP-12-Q02.** Which Entire features are verified as supported for us *today*? List them from the product, not from the spec’s hopes.

**SP-12-Q03.** Does Entire expose an API/SDK/CLI the application may call? Which operations?

**SP-12-Q04.** What does checkpoint type `git-refs` mean in Entire, and is that the only checkpoint type we may use?

**SP-12-Q05.** What does “connect the project repository” require (remote host, auth, Entire project, this already being connected)?

**SP-12-Q06.** What is a “baseline” in Entire’s terms, and have we already captured one?

**SP-12-Q07.** Can checkpoints be named, annotated, tagged to a Decision id, or only git-backed?

**SP-12-Q08.** Is there a UI we can open in the demo? Login constraints for judges?

**SP-12-Q09.** Retention, privacy, cost.

**SP-12-Q10.** Required attribution copy?

**SP-12-Q11.** Who verifies Entire capabilities in writing before demo copy is drafted?

### Must-have workflow

**SP-12-Q12.** What is the exact Entire workflow that satisfies must-have, as a sequence of user-visible actions?

**SP-12-Q13.** Is “repo already has Entire hooks” sufficient, or must the demo *do* something live?

**SP-12-Q14.** Which development changes are “meaningful” to show (first spec commit, agent integration commit, something else)?

**SP-12-Q15.** Do we create a checkpoint as part of the demo, or only inspect existing ones?

**SP-12-Q16.** Should a checkpoint be created when the agent finishes a Run? (Spec does not require this.)

**SP-12-Q17.** Should a checkpoint be created when the recommendation revises? If yes, how is that not confused with business-state branching?

### Linking from the app

**SP-12-Q18.** Does our UI need a “history” panel that deep-links to Entire?

**SP-12-Q19.** If yes, what identifier do we store on the Decision?

**SP-12-Q20.** If no, is leaving the app to Entire acceptable in a 3–5 minute demo?

**SP-12-Q21.** Are we forbidden from storing business scenarios in Entire even if a feature could hold JSON blobs?

### Copy and demo honesty

**SP-12-Q22.** What sentence will the presenter say when Entire appears, so it cannot be heard as “the company branched timelines in Entire”?

**SP-12-Q23.** What words are banned in UI near Entire (branch, universe, timeline, simulation)?

**SP-12-Q24.** How do we visually separate “application scenario: enterprise pilot” from “Entire checkpoint: git ref …”?

### Fallback

**SP-12-Q25.** If Entire UI is down, what labeled fallback still shows we used supported features (git log? screenshot? skip)?

**SP-12-Q26.** If we skip Entire live, does the must-have fail?

### Testing

**SP-12-Q27.** Smoke test definition.

**SP-12-Q28.** Are Entire hooks required for every developer on the team, or only for the demo machine?
