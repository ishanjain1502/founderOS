# SP-01 — Demo / release success checklist

Use after a **Demo mode** or **Full mode** run. A stranger should be able to score pass/fail without reading the codebase.

## A. Preconditions

- [ ] Repo clones with documented env vars (no secrets in git).
- [ ] Smoke tests for Crustdata, cfo.ai, Neatlogs, Entire (or SP-12 Track B) documented and runnable (SP-14).
- [ ] `fixtures/demo/decision-card-ai-analytics.json` loads in Demo mode.

## B. Minimum sequence (Demo mode, ~3–5 min)

1. [ ] Select demo card → company + feature + constraints visible.
2. [ ] Connect or confirm codebase / Entire baseline (or labeled Track B).
3. [ ] Run completes without hiding integration failures.
4. [ ] Report opens with all sections: code impact (if enabled), market, panel, finance, recommendation.

## C. Claim safety (fail if any unchecked)

- [ ] Every numeric chart/table in UI has Observed / Simulated / Assumed / Inferred label.
- [ ] Panel section explicitly says **simulated**.
- [ ] Finance section says **not a forecast** / illustrative where applicable.
- [ ] Crustdata section does not imply competitor activity = customer demand.
- [ ] Fallback sections (if any) say they are **not** live vendor data.

## D. Must-have coverage (init.md §8)

- [ ] One company profile shown
- [ ] One feature/decision shown
- [ ] Crustdata (or labeled fallback) path produced structured evidence
- [ ] Synthetic panel: multiple segments + visible disagreement
- [ ] cfo.ai (or labeled fixture) compared pilot vs broad
- [ ] Neatlogs trace linked for the run
- [ ] Entire (or Track B) history/checkpoint demonstrable
- [ ] Final recommendation lists evidence, assumptions, uncertainty, next experiment

## E. Nice-to-have (v1 scope per SP-01)

- [ ] Sensitivity on price and/or adoption visible
- [ ] Pilot vs broad comparison view
- [ ] Exportable report (PDF or Markdown download)
- [ ] Contradictory-signal revision path exists (may be separate “beat” in demo)

## F. Hard failures (abort demo regardless of UI polish)

- [ ] Invented numbers presented as Crustdata or cfo.ai facts
- [ ] Panel results shown without “simulated”
- [ ] Headline recommendation with no supporting statistics in report
- [ ] Integration silently stubbed without label

## G. Partial success

- [ ] Neatlogs down → run still produces report but mark **partial** in checklist notes
- [ ] Crustdata/cfo.ai down → labeled LLM/fixture fallback visible in report

**Sign-off (SP-01-Q10):** Operator + rubric + uncertainty section reviewed — record date and run ID.
