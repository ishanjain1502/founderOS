# SP-12 — Entire checkpoints and history

## Why this is a subproblem

Must-have: an Entire workflow that **demonstrably uses supported features**. Purpose: integrate the development workflow and preserve relevant history using Entire’s **actual** supported features.

The spec’s most repeated warning: do not describe Entire as automatically creating arbitrary branches of the simulated company’s business state unless the product explicitly supports that. Our application owns simulation state (SP-09).

Repo fact (not a product decision): this workspace already has Entire hooks and `.entire/settings.json` with checkpoints type `git-refs`. That shows Entire is present in the **development** environment. It does **not** decide what the demo may claim, and it does not prove which features we are allowed to depend on. Those still need your confirmation against Entire’s current product.

## Discussion

Entire is easy to misuse in a pitch: “we branch the company’s future.” The spec forbids that attribution unless verified.

Align with **SP-01-Q06** (code regression / blast radius on the **user’s** repo), **SP-03-Q05** (repo connection before Run), **SP-09** (business scenarios ≠ git checkpoints), **SP-11** (no required Entire↔Neatlogs link), **SP-13** (beat 7 = dev history; beat “code” = in-app **Engineering risk** section), **SP-14** (Entire unreachable = go; git/OSS fallback).

**Two tracks (do not conflate):**

| Track | Purpose | Primary surface |
| --- | --- | --- |
| **A — Entire (must-have sponsor product)** | Dev workflow + checkpoint history on repos where Entire is enabled (this hackathon repo + optional mirror) | CLI (`entire checkpoint list/explain`), hooks, **entire.io when available** |
| **B — Server code impact (alternate to entire.io for product value)** | Regression / blast-radius **heuristics** on the **user’s connected repo** inside the CEO webapp | AWS orchestrator + **read-only git sandbox** + **OSS tools** — **not** entire.io sessions |

**entire.io / sessions status:** When sessions or the web UI are unreliable, **Track A** still satisfies must-have via **CLI + git-refs checkpoints + hooks** on **ideaSiulation** (and README demo). **Track B** delivers SP-01 “from code’s end” without depending on Entire sessions or entire-graph in the hot path.

Track B is documented below as **“Alternate to entire.io.”** It does **not** replace Entire attribution for the hackathon; it replaces **entire.io as the way end-users get codebase Q&A** during a Decision Run.

## Alternate to entire.io — server code impact (v1)

**When to use:** User connects a **GitHub/GitLab URL** (+ read-only token, server-side only) in intake (SP-03). Orchestrator runs **`code_impact`** **after `hypotheses`, before `panel`** (SP-10-Q36), bounded by SP-14 — **unless `SKIP_CODE_IMPACT=true`** (SP-10-Q42, v1 default).

**Repo on server (mirror optional):**

- **Default:** `git clone --depth 1` into ephemeral sandbox (`data/sandboxes/{decisionId}/`), max repo size **500 MB**, TTL **24h**, no writes.
- **Optional:** Entire **mirror** as git remote if user already connected GitHub to Entire — same analysis runs on the checkout; Entire mirror is **hosting**, not the analyzer.

**Open-source toolchain (v1 minimum):**

| Step | Tool | Output |
| --- | --- | --- |
| Map feature → paths | Intake text + optional LLM → validated path list | `candidatePaths[]` |
| References | **ripgrep** / `git grep` | `referenceHits[]` |
| Import fan-in (TS/JS first) | **dependency-cruiser** or **madge** | `importEdges[]` (optional v1.1) |
| Recent churn | `git log -n 20 -- <paths>` | `recentCommits[]` |
| Test surface (heuristic) | glob `**/*.{test,spec}.*` near paths | `nearbyTestFiles[]` |

**Artifact:** `CodeImpactArtifact` stored like other runs (`codeImpactRunId`), fields include `repoRef`, `commitSha`, `candidatePaths`, tool outputs (summarized), `epistemicLabel: Inferred` on narrative. Full blobs under `data/blobs/`. LLM may **narrate only** from artifact (SP-04).

**UI (SP-13):** section **“Engineering risk (heuristic)”** — badge **not** Entire, **not** Observed market data. Comparison table may include qualitative **code risk** row.

**Neatlogs:** `TOOL` spans per tool (`rg`, `git_log`, …); attribute `codeImpactRunId`.

**Not in scope for Track B:** claiming zero regression risk; running full CI; Entire business branching; substituting Crustdata/cfo.

## What “implemented to the end” would require

1. Written verification of Entire features in scope (docs + what this repo already has).
2. A demo script beat that uses those features honestly.
3. If the app links to Entire: exact link/API, auth, failure behavior.
4. If the app does not link: a presenter workflow (open Entire, show checkpoint X).
5. Copy review: no “Entire branched the business.”
6. Baseline captured; what “baseline” means in the demo.
7. Labeled fallback if Entire is unavailable (section 10).
8. Smoke test.
9. **Track B:** `connect_repository` + OSS runner + `CodeImpactArtifact` + UI section (when user repo connected).

## Locked decisions (spec only)

- Purpose: development workflow + relevant history using **actual supported features** (section 4).
- Planned use bullets above; “when available.”
- Application owns simulation state and scenario comparisons.
- Do not assume Entire branches application business state (out of scope; risk table).
- Must-have: Entire workflow that demonstrably uses supported features.
- Demo beat: demonstrate the actual Entire workflow used by the project (section 9).
- Smoke-test; labeled fallbacks.
- **Alternate to entire.io:** server-side **git sandbox + OSS analysis** for user repo **code impact** (Track B); does not satisfy Entire must-have alone.

## Dependencies

- Adjacent to SP-09 (must not absorb business state).
- May correlate with SP-11 traces if you want, not required by spec.
- Demo timing in SP-13.
- Extends SP-10 with `code_impact` stage when repo connected; SP-14 caps apply.

## Questions

### Product verification

**SP-12-Q01.** What Entire product docs are the source of truth for this hackathon?
**Primary:** [docs.entire.io](https://docs.entire.io) + [llms.txt index](https://docs.entire.io/llms.txt). **Cursor:** [agents/cursor](https://docs.entire.io/agents/cursor). **MCP:** [cli-reference/mcp](https://docs.entire.io/cli-reference/mcp). **Track B** does not add a second vendor doc set beyond git + named OSS tools (below).

**SP-12-Q02.** Which Entire features are verified as supported for us *today*? List them from the product, not from the spec’s hopes.
**Verified in this repo:** `git-refs` checkpoints (`.entire/settings.json`); **Cursor hooks** (`.cursor/hooks.json` → `entire-cursor.sh` when present); CLI **`entire status`**, **`entire checkpoint list`**, **`entire checkpoint explain`**, **`entire session list/info`**. **Unverified / broken for us:** **entire.io session browser** and **Cursor session resume** — treat as **optional** demo surface until fixed. **Not adopted in v1 hot path:** entire-graph, Brain, Dispatches (may use in dev only).

**SP-12-Q03.** Does Entire expose an API/SDK/CLI the application may call? Which operations?
**CLI yes** (subprocess from AWS backend **only** for **status/explain/list** on **our** deployment repo — not per-tenant entire.io API in v1). **MCP `entire mcp`:** read-only `agent_help`, `entire_status` — **dev/Cursor only**, not CEO Run. **No** documented public HTTP API for blast-radius in product Run — use **Track B** instead.

**SP-12-Q04.** What does checkpoint type `git-refs` mean in Entire, and is that the only checkpoint type we may use?
**Per-checkpoint refs** at `refs/entire/checkpoints/...` (ULIDs); default since CLI 0.10. **v1:** use **`git-refs` only** (already configured). Do not migrate to `git-branch` storage mid-hackathon.

**SP-12-Q05.** What does “connect the project repository” require (remote host, auth, Entire project, this already being connected)?
**Two connections:** (1) **Hackathon repo (ideaSiulation):** local Entire enable + hooks + push to GitHub; optional Entire mirror. (2) **User product repo (Track B):** GitHub/GitLab **HTTPS** URL + **read-only** token in server env — **no** Entire account required for analysis; optional Entire mirror if user already uses Entire GitHub App.

**SP-12-Q06.** What is a “baseline” in Entire’s terms, and have we already captured one?
**Baseline = first meaningful checkpoint** after `entire enable` on a repo (linked to a commit). **This repo:** baseline = first post-setup checkpoint once hooks run and a commit exists; document **`checkpointId` or ref** in README when captured. **Not** the CEO Decision snapshot.

**SP-12-Q07.** Can checkpoints be named, annotated, tagged to a Decision id, or only git-backed?
**Git-backed** via Entire; **no** Entire API to tag fictional `decisionId` in v1. **App may store** optional `gitCommitSha` + `entireCheckpointId` on export for **this repo’s dev work** only — not on user business Decision as Entire branch.

**SP-12-Q08.** Is there a UI we can open in the demo? Login constraints for judges?
**Primary Entire UI:** [entire.io](https://entire.io) when up — presenter login. **Alternate when entire.io/sessions broken:** **CLI demo** in terminal recording + README screenshots; **Track B** UI is **in-app Engineering risk** (not Entire). Judges watch presenter; no judge Entire account required.

**SP-12-Q09.** Retention, privacy, cost.
**Entire:** follow account/plan; checkpoint data in git refs / remote per Entire docs. **Track B sandboxes:** delete after TTL; **no** user source in public export except summarized `CodeImpactArtifact`. **Cost:** Entire mirror/hosting per Entire; OSS tools = compute only on our AWS.

**SP-12-Q10.** Required attribution copy?
**Entire (Track A):** README + demo script — “Development history captured with **Entire**.” **Track B:** “**Engineering analysis (heuristic)** — not Entire; not a substitute for QA.” Do not brand OSS output as Entire.

**SP-12-Q11.** Who verifies Entire capabilities in writing before demo copy is drafted?
**Operator** records working CLI commands + checkpoint id in README **Appendix Entire**; if entire.io broken, note **“CLI-only verification {date}”** and rely on Track B for user-repo story.

### Must-have workflow

**SP-12-Q12.** What is the exact Entire workflow that satisfies must-have, as a sequence of user-visible actions?
**Track A (Entire must-have):** (1) Show `.entire/settings.json` + hooks enabled. (2) `entire status` green on **ideaSiulation**. (3) `entire checkpoint list` → pick checkpoint tied to a real dev commit. (4) `entire checkpoint explain <id>` (or entire.io equivalent if working). (5) One-sentence separation from business scenarios (Q22). **Track B** runs in parallel in webapp when user connected repo — **separate** demo sentences.

**SP-12-Q13.** Is “repo already has Entire hooks” sufficient, or must the demo *do* something live?
**Not sufficient alone** — demo must **show one explain/list** live or recorded **this week**. Hooks alone = smoke only.

**SP-12-Q14.** Which development changes are “meaningful” to show (first spec commit, agent integration commit, something else)?
**Meaningful on ideaSiulation:** subproblem docs lock pass, orchestrator integration, Neatlogs wiring, **Track B code_impact** commit — pick **one** checkpoint the presenter can explain in **≤30s**.

**SP-12-Q15.** Do we create a checkpoint as part of the demo, or only inspect existing ones?
**Prefer inspect existing**; optional live commit during rehearsal creates a new checkpoint — do not depend on live commit during 3–5 min clock.

**SP-12-Q16.** Should a checkpoint be created when the agent finishes a Run? (Spec does not require this.)
**No** — CEO Run completion does **not** auto-create Entire checkpoints (avoids coupling SP-10 to git hooks).

**SP-12-Q17.** Should a checkpoint be created when the recommendation revises? If yes, how is that not confused with business-state branching?
**No** — revisions are **SP-09 Recommendation versions** only. Never “Entire checkpoint v2 of pilot.”

### Linking from the app

**SP-12-Q18.** Does our UI need a “history” panel that deep-links to Entire?
**No deep panel** — footer **“Development checkpoints (Entire)”** → entire.io or README anchor (SP-13-Q17). **Separate** in-app **Engineering risk** panel for Track B.

**SP-12-Q19.** If yes, what identifier do we store on the Decision?
**N/A for Entire deep link in v1.** Store on export optional: `devRepoEntireCheckpointId` for **sandbox repo** only. **Track B:** `codeImpactRunId`, `repoCommitSha`, `sandboxId` on Decision/Run.

**SP-12-Q20.** If no, is leaving the app to Entire acceptable in a 3–5 minute demo?
**Yes** for Track A (short) or **skip to README** if entire.io down (SP-13-Q19). Track B stays **in-app**.

**SP-12-Q21.** Are we forbidden from storing business scenarios in Entire even if a feature could hold JSON blobs?
**Yes — forbidden.** No Decision/Recommendation/scenario JSON in Entire as business state. Entire stores **agent dev sessions** on git repos only.

### Copy and demo honesty

**SP-12-Q22.** What sentence will the presenter say when Entire appears, so it cannot be heard as “the company branched timelines in Entire”?
*“**Entire records how we built this decision sandbox in git** — prompts and checkpoints on **our codebase**. **Acme’s pilot vs launch scenarios live in the app**, not in Entire.”*

**SP-12-Q23.** What words are banned in UI near Entire (branch, universe, timeline, simulation)?
**Banned next to Entire/checkpoint:** **branch**, **universe**, **timeline**, **simulation** (business sense). Allowed: **git branch**, **checkpoint**, **development history**.

**SP-12-Q24.** How do we visually separate “application scenario: enterprise pilot” from “Entire checkpoint: git ref …”?
**Scenarios:** product UI table + label **“Decision scenario.”** **Entire:** separate footer/modal with monospace **checkpoint id / commit sha** and header **“Development checkpoint (Entire)”** — never the same card component.

### Fallback

**SP-12-Q25.** If Entire UI is down, what labeled fallback still shows we used supported features (git log? screenshot? skip)?
**Order:** (1) **CLI recording** `entire checkpoint explain`. (2) **`fixtures/demo/entire-checkpoint-screenshot.png`**. (3) **`git log` + `.entire/settings.json`** in README with label **“Entire CLI verified; web UI unavailable.”** Track B unaffected.

**SP-12-Q26.** If we skip Entire live, does the must-have fail?
**Skip entire.io only:** **no fail** if Track A CLI/hooks demonstrated in README/recording. **Skip all Entire (no hooks, no CLI):** **must-have fail** for sponsor product. **Track B does not replace Entire must-have.**

### Testing

**SP-12-Q27.** Smoke test definition.
**Entire:** `entire status --json` ok; ≥1 checkpoint listable OR hooks present + `entire doctor` pass if available. **Track B:** clone public smoke repo + `rg` + artifact write under 60s in CI fixture mode.

**SP-12-Q28.** Are Entire hooks required for every developer on the team, or only for the demo machine?
**Recommended all devs**; **required for demo machine** and CI docs. Track B runs on **server** — devs need no Entire for user-repo analysis.

### Alternate to entire.io (server code impact)

**SP-12-Q29.** Is Track B (server git + OSS analysis) in scope for v1 when the user connects a repo?
**Yes** — satisfies SP-01-Q06 / SP-03-Q05 **code** leg. **Demo card** may use a **pinned public sample repo** if live user repo omitted.

**SP-12-Q30.** For Track B, is Entire mirror required, or is plain git clone enough?
**Plain read-only git clone is enough** for v1. Entire mirror is **optional** (same remote, regional hosting) — analysis pipeline identical.

**SP-12-Q31.** Which OSS tools are required for Track B v1?
**Required:** **git**, **ripgrep** (`rg`), shell `git log` / `git grep`. **TS/JS repos:** add **dependency-cruiser** or **madge** when `package.json` present. **Optional later:** semgrep, test runners in container.

**SP-12-Q32.** What orchestrator stage and artifact names tie Track B to the Run?
**Stage:** `code_impact` (after **`hypotheses`**, before **`panel`** — SP-10-Q36). **Facade tools:** `connect_repository`, `map_feature_paths`, `run_code_impact_analysis`. **Artifact:** `CodeImpactArtifact` + `codeImpactRunId` on Run; comparison row **`engineering_risk`**. **Until implemented:** **`SKIP_CODE_IMPACT=true`** (SP-10-Q42) — stage **`skipped`**, no analysis.

**SP-12-Q33.** May Track B output be presented as Observed or as Entire-backed?
**Neither.** Label **Inferred** (narrative) + **Heuristic / tool-derived** (facts from rg/git). Never **Observed** market evidence; never **“Entire blast radius”** unless entire-graph was actually run and cited with checkpoint id (out of v1 default).
