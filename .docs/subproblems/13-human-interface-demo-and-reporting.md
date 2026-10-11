# SP-13 — Human interface, demo narrative, and reporting

## Why this is a subproblem

The spec describes a 3–5 minute demo flow and says “the UI presents” evidence, simulated segment results, financial assumptions, trade-offs, and recommended next step. It does not specify UI form: web, CLI, slides plus terminal, dashboard, or presenter-driven.

Humans will judge claim safety, bolted-on integrations, and “an agent that works” through this surface. If the UI lies (hides simulation labels, invents a fake Entire branch view, shows one confidence score), the rest of the system can be correct and still fail the spec.

## Discussion

There are at least three interfaces, possibly the same screen:

1. **Operator interface** — set the decision, run the agent, inject a new signal, maybe approve assumptions.
2. **Audience interface** — the 3–5 minute story with eight beats in section 9.
3. **Inspectability interface** — Neatlogs and Entire, which may live outside our app.

Nice-to-have: comparison view; exportable decision report. Those are extra surfaces.

The demo order in the spec:

1. Set the decision  
2. Show real evidence (Crustdata)  
3. Show simulated disagreement  
4. Show the economics (cfo.ai)  
5. Show the decision  
6. Show observability (Neatlogs)  
7. Show history (Entire)  
8. Show adaptation (new signal → reassess)

That is a **narrative**. It is not proof that the UI is a wizard with those steps, a timeline, a live stream of agent events, or a single scrolling report. Streaming vs wait-then-reveal changes orchestration (SP-10) and perceived latency (SP-14).

Labeling is part of the interface: simulated panel, illustrative assumptions, not a forecast, competitor ≠ demand. Where labels live (banner, per-widget, tooltip, spoken-only) changes whether a screenshot can be misused.

Accessibility, brand, mobile, auth, and visual design are unspecified. For a hackathon they may be “whatever we can do,” but that is still a decision.

The exportable report, if in scope, must carry the same labels as the screen. A pretty PDF that drops “simulated” would violate SP-04.

There is no user-research on this UI. Do not invent IA. Ask what must be on screen for each beat, and what can be off-screen.

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

**SP-13-Q02.** Is the operator the same person as the presenter?

**SP-13-Q03.** Will judges operate it themselves, or only watch?

**SP-13-Q04.** Is login required? For whom?

**SP-13-Q05.** What viewport is required (projector, laptop, phone)?

**SP-13-Q06.** Any brand, color, or naming constraints (product name vs “Autonomous CEO”)?

### Screen inventory

**SP-13-Q07.** List the views/screens/pages/panels you want in v1. If you do not know yet, say “unknown — propose after other SPs,” or list must-see information instead of screens.

**SP-13-Q08.** Is the UI a step wizard matching the eight demo beats, a single dashboard that fills in, a streaming log plus summary, or something else?

**SP-13-Q09.** Must the audience see agent “thinking” text, or only structured stage results?

**SP-13-Q10.** Must raw JSON ever be visible (for proof), or is that a failure of the UI?

### Beat-by-beat must-see information

**SP-13-Q11.** Beat “set the decision”: what widgets and which fields are visible? (See SP-03.)

**SP-13-Q12.** Beat “real evidence”: exactly what Crustdata fields are on screen? (See SP-05.)

**SP-13-Q13.** Beat “simulated disagreement”: chart, table, quotes, all? What label copy?

**SP-13-Q14.** Beat “economics”: which numbers, which assumption list, which scenario columns?

**SP-13-Q15.** Beat “decision”: headline path, explanation sections, next experiment — which are above the fold?

**SP-13-Q16.** Beat “observability”: in-app button to Neatlogs, or leave the app?

**SP-13-Q17.** Beat “history”: in-app Entire link, or leave the app?

**SP-13-Q18.** Beat “adaptation”: what control injects the new signal, and how is the change highlighted?

**SP-13-Q19.** Which beats may be cut if time runs long, and in what order? (Align with SP-01.)

### Labels and claim safety in the UI

**SP-13-Q20.** What is the exact banner/disclaimer text on the app?

**SP-13-Q21.** Must every panel widget include the word “simulated”?

**SP-13-Q22.** Must every finance widget include “not a verified forecast” (or your chosen phrase)?

**SP-13-Q23.** Must every Crustdata widget include “does not prove demand” (or your chosen phrase)?

**SP-13-Q24.** Are we allowed to show a single large percentage (example: 18% would pay extra) as the first thing on the panel view?

**SP-13-Q25.** Are we allowed to use gauge/confidence visuals?

### Comparison and export

**SP-13-Q26.** If comparison view is in, what columns and rows?

**SP-13-Q27.** If export is in, what trigger, format, and filename pattern?

**SP-13-Q28.** Does export include traces and Entire links?

**SP-13-Q29.** Who is the export for (judges, the fictional CEO, us)?

### Empty, loading, error

**SP-13-Q30.** What does the UI show while Crustdata is in flight? Panel? Finance? Recommendation?

**SP-13-Q31.** What does the UI show for labeled fallback data vs live data (watermark, color, badge)?

**SP-13-Q32.** What does the UI show if the agent refuses to recommend (if you allow that in SP-08)?

**SP-13-Q33.** What does the UI show if revision does not change the recommendation?

### Interaction

**SP-13-Q34.** Which fields are editable after first paint?

**SP-13-Q35.** Which actions need confirmation (run panel at N=1000, recall finance, inject signal)?

**SP-13-Q36.** Keyboard-only demo path required?

**SP-13-Q37.** Do we need a “reset demo” button?

### Script

**SP-13-Q38.** Who writes the spoken script, and must it be constrained by the same forbidden-claims list as the UI?

**SP-13-Q39.** What happens if a live call exceeds its beat budget — skip remaining stages, show cached, talk over loading?

**SP-13-Q40.** Is a backup video of a successful run required?

### Out of interface scope

**SP-13-Q41.** Confirm what we will **not** build: account system, multi-company switcher, settings, mobile app, theming, onboarding tour, etc. Add any other exclusions.
