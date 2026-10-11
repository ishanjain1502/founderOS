# SP-13 — Human interface, demo narrative, and reporting

## Why this is a subproblem

The spec describes a 3–5 minute demo flow and says “the UI presents” evidence, simulated segment results, financial assumptions, trade-offs, and recommended next step. It does not specify UI form: web, CLI, slides plus terminal, dashboard, or presenter-driven.

Humans will judge claim safety, bolted-on integrations, and “an agent that works” through this surface. If the UI lies (hides simulation labels, invents a fake Entire branch view, shows one confidence score), the rest of the system can be correct and still fail the spec.

## Discussion

There are at least three interfaces, possibly the same screen:

1. **Operator interface** — set the decision, run the agent, inject a new signal, maybe approve assumptions.
2. **Audience interface** — the 3–5 minute story with eight beats in section 9.
3. **Inspectability interface** — Neatlogs and Entire, which may live outside our app.

Align with **SP-01** (AWS **webapp**; Demo vs **Full** modes; comparison + sensitivity + revision + export **in**; live recommendation may differ from spec example; SP-01-Q29 label placement), **SP-02** (epistemic glossary chips), **SP-03** (demo **card** → recap → Start investigation), **SP-04** (no lone confidence score; forbidden-claim validator), **SP-05** (Evidence panel proof fields), **SP-06** (segment bars + simulated quotes), **SP-07** (Pilot vs Broad **Modeled** section + attribution), **SP-08** (**mandatory** comparison table on decision beat), **SP-09** (revision diff UI; Markdown + JSON export; reset demo), **SP-10** (**streaming stages**, **`code_impact`** on stage rail; **`SKIP_CODE_IMPACT=true`** v1 default), **SP-11** (**Open in Neatlogs**), **SP-12** (Entire dev checkpoints + **Engineering risk** UI for Track B).

**v1 UX:** single **web app** with a **guided investigation dashboard** (not eight separate wizard pages). Demo mode optimizes the scripted path; Full mode exposes the same screens with more editing. **Stage stream** fills sections as the run progresses; presenter narrates beats while the UI catches up.

## What “implemented to the end” would require

1. Chosen medium (web, CLI, etc.) after SP-01 platform answers.
2. Screen inventory mapped to demo beats and to must-have information.
3. Empty, loading, error, fallback, and partial-data states for each integration.
4. Label placement rules (SP-04).
5. How live agent progress is shown.
6. How revision is shown (before/after).
7. Navigation to Neatlogs and Entire.
8. Presenter script compatible with 3–5 minutes, including backup if a beat fails.
9. Export, if in scope.
10. What is *not* built (settings, accounts, history browser of all past companies, etc.).

## Locked decisions (spec only)

- UI presents evidence, simulated segment results, financial assumptions, trade-offs, recommended next step (section 5.9).
- Demo flow of eight beats, 3–5 minutes (section 9).
- Use clearly labeled illustrative assumptions where real data/forecasts are unavailable.
- Panel results labeled simulated; disagreement visible, not only an average.
- Each required product’s contribution visible (section 10).
- Nice-to-have comparison view and exportable report (section 8).
- Out of scope: claiming prediction; automatic real-world launch.

## Dependencies

- Consumes information from SP-03–SP-12.
- Constrained by SP-01 (scripted vs live), SP-04 (labels), SP-14 (latency).

## Questions

### Medium and audience

**SP-13-Q01.** What is the v1 interface medium (web app, CLI, notebook, slides+app, desktop, other)?
**Web app** (responsive layout) hosted on **AWS** (SP-01-Q23–Q24). No CLI/notebook as primary demo surface.

**SP-13-Q02.** Is the operator the same person as the presenter?
**Yes for hackathon demo** — one presenter drives Demo mode. Full mode may be used by judges post-demo on their own.

**SP-13-Q03.** Will judges operate it themselves, or only watch?
**Primary:** judges **watch** the 3–5 minute Demo mode walkthrough. **Secondary:** repo + hosted link for judges to run **Full mode** after; not required live.

**SP-13-Q04.** Is login required? For whom?
**No login in v1.** Session via **opaque `sessionId`** in URL or cookie. API keys server-side only. Optional future auth out of scope.

**SP-13-Q05.** What viewport is required (projector, laptop, phone)?
**Design for laptop 1280×800+ and projector 16:9.** Mobile **not** required; layout may degrade gracefully.

**SP-13-Q06.** Any brand, color, or naming constraints (product name vs “Autonomous CEO”)?
**Product title:** **“CEO Decision Sandbox”** (subtitle may reference autonomous agent). **Personal brand** (SP-01-Q05) in README/footer, not a corporate style guide. Neutral light theme; **epistemic chips** use consistent colors (Observed / Simulated / Assumed / Inferred / Modeled).

### Screen inventory

**SP-13-Q07.** List the views/screens/pages/panels you want in v1. If you do not know yet, say “unknown — propose after other SPs,” or list must-see information instead of screens.
**Routes/panels:** (1) **Start** — demo scenario cards + “New decision” (Full). (2) **Intake wizard** — multi-step form (incl. optional **repo URL**). (3) **Recap & approve** — SP-03-Q37. (4) **Investigation** — dashboard with stage rail + sections (**research**, **hypotheses**, **`code_impact`**, **panel**, **finance**, **compare**, **recommend**). (5) **Assumption gate** modal before finance. (6) **Recommendation** — headline + comparison table + bullets. (7) **Revision** — new evidence + diff. (8) **Export** drawer. **Global:** integration health strip, disclaimer banner, footer (Neatlogs, Entire dev, GitHub).

**SP-13-Q08.** Is the UI a step wizard matching the eight demo beats, a single dashboard that fills in, a streaming log plus summary, or something else?
**Single investigation dashboard that fills in** as SP-10 stages stream (**stage rail** + section cards). Intake uses a **short wizard**; beats 2–8 are **sections on one page** (scroll/presenter focus), not eight page transitions.

**SP-13-Q09.** Must the audience see agent “thinking” text, or only structured stage results?
**Structured stage results only** — stage name, status, duration, short **status line** (≤1 sentence). **No** chain-of-thought / raw reasoning stream. Recommendation prose appears on **recommend** stage complete.

**SP-13-Q10.** Must raw JSON ever be visible (for proof), or is that a failure of the UI?
**Not in demo path.** Optional **“Developer details”** collapsible per section (mapped JSON + ids) for judges who expand; default collapsed. Proof for audience = labeled summaries + external Neatlogs.

### Beat-by-beat must-see information

**SP-13-Q11.** Beat “set the decision”: what widgets and which fields are visible? (See SP-03.)
**Demo:** click **`fixtures/demo/decision-card-ai-analytics.json`** card → wizard auto-fill → **recap** with decision question, feature one-liner, **2 goal chips**, **budget + timeline**, **Illustrative example** chip if from card (SP-03-Q38–Q39). **Start investigation** CTA. Full mode: same wizard with editable required fields (SP-03-Q05).

**SP-13-Q12.** Beat “real evidence”: exactly what Crustdata fields are on screen? (See SP-05.)
**Evidence cards** per company: **Observed** chip, name, **retrievedAt**, **crustdata id**, **2–3 bullets**, website link optional; footer **“Data from Crustdata”** + demand disclaimer when applicable (SP-05-Q31, SP-04-Q36). Expandable **query submitted** (not Observed). No full raw JSON on demo path.

**SP-13-Q13.** Beat “simulated disagreement”: chart, table, quotes, all? What label copy?
**Mandatory (SP-06-Q42):** **Simulated** banner on section; **side-by-side segment bars** (demo rollup: enterprise/power vs price-sensitive SMB); **segment × choice %** table; **top objection per segment**; **≥1 simulated quote** per polarized pair. Copy: **“Simulated panel — not real customer interviews.”** Optional unweighted overall below with disagreement warning (SP-06-Q43–Q44).

**Engineering / code (between hypotheses and panel on stage rail):** section **“Engineering risk (heuristic)”** when `code_impact` completes — paths touched, reference hit counts, churn summary, **Inferred** chip. When **`SKIP_CODE_IMPACT=true`** or stage **`skipped`:** collapsed card **“Code impact skipped (not implemented)”** on rail (still shows **`code_impact`** stage as skipped, ~0s). Not a demo beat in section 9; optional presenter mention.

**SP-13-Q14.** Beat “economics”: which numbers, which assumption list, which scenario columns?
**Section title:** **Modeled — cfo.ai (not a verified forecast)** (SP-07-Q09). **Table:** **Pilot vs Broad** columns for mapped metrics (runway, burn, revenue uplift, etc. — nullable cells show “not in model”). **Status quo** row from **intake baseline** (Assumed/Observed). **Assumption list** (editable at gate): price, adoption, build cost, timeline. **Sensitivity** sub-block: price × adoption grid on Pilot when finance succeeded (SP-01-Q13). **Skipped/gap** state when mapping deferred (SP-07).

**SP-13-Q15.** Beat “decision”: headline path, explanation sections, next experiment — which are above the fold?
**Above fold:** **headline recommendation**, **`chosenScenarioId`**, **comparison table** (SP-08-Q15, ≤60s glance), **next validation step** one-liner. **Below fold / scroll:** ≤**6 bullets** trade-offs, rejected alternatives chips, sensitivity summary, open unknowns. Export holds full section order (SP-08-Q25).

**SP-13-Q16.** Beat “observability”: in-app button to Neatlogs, or leave the app?
**In-app “Open in Neatlogs”** on investigation complete + recommendation footer (new tab) (SP-11-Q24). Presenter may also use bookmarked workflow list.

**SP-13-Q17.** Beat “history”: in-app Entire link, or leave the app?
**Leave the app for v1 demo beat** — footer link **“Development checkpoints (Entire)”** opens presenter workflow (Cursor/Entire UI or README anchor). **No** in-app fake business branch tree. Spoken script: Entire shows **how we built** the sandbox, not company futures (SP-09-Q28, SP-12).

**SP-13-Q18.** Beat “adaptation”: what control injects the new signal, and how is the change highlighted?
**Button “New evidence”** → preset **`demo-enterprise-churn-signal`** (SP-09-Q19) or short paste → **confirm contradiction** → **Re-evaluate**. Highlight: **diff view** (before/after headline, scenario, top assumptions) + **Revision** banner citing `triggeringEvidenceIds` (SP-09-Q24–Q25). **Unchanged** outcome shows explicit message (SP-09-Q23).

**SP-13-Q19.** Which beats may be cut if time runs long, and in what order? (Align with SP-01.)
**Cut order (first dropped first):** (1) **Beat 7 Entire** — mention in speech + README only. (2) **Beat 6 Neatlogs live** — use **labeled screenshot** + trace id on screen (SP-11-Q28). (3) **Shorten beat 2** — one evidence card not full list. **Do not cut:** beats 1, 3–5, **8 revision** (SP-01-Q14 **in**). Sensitivity may be **export-only** if clock critical.

### Labels and claim safety in the UI

**SP-13-Q20.** What is the exact banner/disclaimer text on the app?
**Persistent banner:** *“Decision support sandbox — not a go-to-market guarantee. Simulated panel and modeled finance are illustrative; validate before acting.”* Footer: link to glossary (SP-02-Q42).

**SP-13-Q21.** Must every panel widget include the word “simulated”?
**Yes** — section header **“Simulated panel”** plus **Simulated** chip on every chart/stat/quote in that section (SP-01-Q29).

**SP-13-Q22.** Must every finance widget include “not a verified forecast” (or your chosen phrase)?
**Yes** — **“Modeled — not a verified forecast”** on section header and each finance numeric (SP-07-Q09).

**SP-13-Q23.** Must every Crustdata widget include “does not prove demand” (or your chosen phrase)?
**On demand-adjacent evidence rows** (competitor product, reviews, positioning): chip **“Observed market fact — does not prove demand for our feature.”** Other Observed firmographics: **Observed** only (SP-04-Q36).

**SP-13-Q24.** Are we allowed to show a single large percentage (example: 18% would pay extra) as the first thing on the panel view?
**Only with segment breakdown on the same view** — no headline lone % without bars/table (SP-04-Q18, SP-06-Q43). Prefer **segment bars first**, overall % secondary.

**SP-13-Q25.** Are we allowed to use gauge/confidence visuals?
**No** single 0–100 confidence gauge or traffic-light **confidence** (SP-04-Q18). **Allowed:** segment bar charts, scenario comparison table, discrete **caution** flags from scorecard (text/badge, not probability dial).

### Comparison and export

**SP-13-Q26.** If comparison view is in, what columns and rows?
**Mandatory table (SP-08):** **Rows** — five strategy kinds where applicable; **`segment disagreement`**; **`engineering_risk`** (or **missing** when skip); **Columns** — qualitative assessment, **Modeled Pilot**, **Modeled Broad** (or **gap**), key panel metric per row. Highlight **chosen** row. Pilot vs Broad never dropped when finance ok.

**SP-13-Q27.** If export is in, what trigger, format, and filename pattern?
**Buttons on Recommendation:** **Download report (Markdown)** and **Download bundle (JSON)**. Filenames: `decision-{decisionId}-report-{YYYYMMDD}.md`, `decision-{decisionId}-bundle-{YYYYMMDD}.json` (SP-09-Q33).

**SP-13-Q28.** Does export include traces and Entire links?
**Yes:** `neatlogsTraceIds[]` per Run + deep link when known; **Entire:** README/repo link + optional `gitCommitSha` — **not** a business checkpoint id. Neatlogs ids required when ingest succeeded.

**SP-13-Q29.** Who is the export for (judges, the fictional CEO, us)?
**Primary: hackathon judges** and **open-source replicators**; written as a **CEO-facing decision memo** tone but with full epistemic labels.

### Empty, loading, error

**SP-13-Q30.** What does the UI show while Crustdata is in flight? Panel? Finance? Recommendation?
**Per-stage placeholders:** skeleton cards in the active section; **stage rail** shows `in_progress` + elapsed time. Downstream sections **locked/empty** until prior stages complete. Assumption gate **blocks** finance section until approved. No fake partial numbers.

**SP-13-Q31.** What does the UI show for labeled fallback data vs live data (watermark, color, badge)?
**Badge on affected section:** **Live** (default) vs **Fixture / recorded** (amber) vs **LLM gap-fill** (amber + “Not from vendor”). Fixture never unlabeled (SP-01-Q08). Integration health strip mirrors status.

**SP-13-Q32.** What does the UI show if the agent refuses to recommend (if you allow that in SP-08)?
**Rare:** publish blocked → show **Run failed** with validator errors and **draft** recommendation hidden. Allowed outcomes **`delay`**, **`do_not_build`**, **validation-first** still **publish** with headline + table (SP-08-Q17). UI must not show empty “no recommendation.”

**SP-13-Q33.** What does the UI show if revision does not change the recommendation?
**Revision success card:** **“Recommendation unchanged”** + why signal was insufficient + link to new Run/Neatlogs trace (SP-09-Q23). Side-by-side shows identical headline with highlighted **unchanged** badge.

### Interaction

**SP-13-Q34.** Which fields are editable after first paint?
**After first Run starts:** intake **frozen** unless **Edit decision** (triggers material-change warning). **Assumptions** editable at **assumption gate** and via new assumption versions (SP-09). **Recommendation** override before publish only (SP-08-Q18). Evidence append-only.

**SP-13-Q35.** Which actions need confirmation (run panel at N=1000, recall finance, inject signal)?
**Confirm:** **Start investigation**, **Approve assumptions** (finance), **Publish recommendation**, **Re-evaluate** (revision), **panel N > demo default (60)** with cost estimate, **operator override** of chosen scenario. **Reset demo** requires confirm.

**SP-13-Q36.** Keyboard-only demo path required?
**No** — mouse-first demo acceptable. Basic focus order for accessibility best-effort only.

**SP-13-Q37.** Do we need a “reset demo” button?
**Yes** — header **Reset demo** → confirm → new session + reload demo card (SP-09-Q06).

### Script

**SP-13-Q38.** Who writes the spoken script, and must it be constrained by the same forbidden-claims list as the UI?
**Team-written** `docs/demo-script.md` (or `.docs/practical/demo-script.md`). Presenter must **not** state forbidden claims (SP-04-Q23) as facts; may read UI labels aloud. UI/export remain source of truth for numbers.

**SP-13-Q39.** What happens if a live call exceeds its beat budget — skip remaining stages, show cached, talk over loading?
**Do not silently skip** — show **live progress**; presenter **talks over** loading for beats 2–4. If SP-10/SP-14 budget hit: **partial Run** with gap labels and still publish if validator allows (SP-10-Q21). **No** switch to fixture mid-run without **Fixture** badge.

**SP-13-Q40.** Is a backup video of a successful run required?
**No** — optional nice-to-have. Minimum backup: **export bundle** + Neatlogs screenshot + README replay steps.

### Out of interface scope

**SP-13-Q41.** Confirm what we will **not** build: account system, multi-company switcher, settings, mobile app, theming, onboarding tour, etc. Add any other exclusions.
**Out of v1 UI:** user accounts/auth, billing, multi-tenant admin, mobile app, dark mode/theming studio, onboarding tour, global history browser across all companies, in-app Entire business branching, embedded Neatlogs iframe, PDF export (post-hackathon), real-time multi-user cursors, arbitrary code upload (repo context is separate Entire story), panel N=1000 slider without confirm, custom Crustdata query builder for judges.
