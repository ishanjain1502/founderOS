# SP-01 — Implementation spec (scope, success, non-goals)

**Status:** Locked from subproblem answers (`01-scope-success-nongoals.md`).  
**Source overview:** `.docs/init.md`  
**Downstream:** Constrains SP-02–SP-14 and all runtime code.

---

## 1. Product definition

| Dimension | Decision |
|-----------|----------|
| **What we build** | Parameterized **web app** (SP-01-Q01 **b**): accepts varied B2B SaaS decisions; demonstrated with one excellent path plus optional **Demo mode** cards (SP-01-Q22 **d**). |
| **Input space** | Any decision type: new feature, pricing change, minor UI change, etc. (SP-01-Q02, Q20). |
| **Default example** | Illustrative AI analytics premium scenario — **not** the only runnable case (SP-01-Q18 **b**). Fixture: `fixtures/demo/decision-card-ai-analytics.json`. |
| **Recommendation** | Must reflect the **actual test run**, not a scripted outcome (SP-01-Q21). |
| **Brand** | “Autonomous CEO” = **personal brand** for the agent (SP-01-Q05). |
| **Audience** | Broad: judges, teammates, founders testing feature predictions (SP-01-Q03–Q04). Success = audience can **judge the idea** from the **final report**. |

**Product type (unchanged from init):** Decision sandbox — not a certainty engine, not a startup game.

---

## 2. End-to-end capability (success narrative)

Minimum credible run (SP-01-Q06), in business order:

1. **Codebase context** — User supplies a repo; **Entire** mirrors/checkpoints dev history on that repo; **Neatlogs** instruments the agent run on that project.
2. **Market behavior intake** — User describes target-market / user personalities (feeds synthetic panel).
3. **Constraints** — Money and time available to execute.
4. **Decision under test** — e.g. a new feature (parameterized).
5. **Code path analysis** — Regression risk, effort estimate, blast radius (gated where `SKIP_CODE_IMPACT` applies per SP-10).
6. **Non-code path analysis** — Customer response (simulated panel), Crustdata market/competitor signals, persona-judgment aggregation (~1k agents when budget allows), **cfo.ai** financial scenarios vs constraints.
7. **Synthesis** — Composed **decision report** with per-source reasoning (SP-01-Q30).

**Priority rule (SP-01-Q07):** Build a **boilerplate pipeline** that can consume all stages; implement **most important → least important** along the workflow. Contradictory-signal revision is **in** (Q14) but not a hard gate for “v1 works.”

---

## 3. Platform and delivery

| Item | Decision |
|------|----------|
| Runtime | **Cloud** (SP-01-Q23), deploy target **AWS** (SP-01-Q25) |
| Shape | **Web app only** (SP-01-Q24) |
| Demo operators | Up to **10** people (SP-01-Q27) |
| Deadline / offline | No fixed deadline; no offline requirement (SP-01-Q26) |
| Reproducibility | **Open-source repo**; third parties can clone and rerun (SP-01-Q28) |
| Doc source of truth | **Answers under each `SP-XX-QNN` in subproblem files**; `init.md` = overview (SP-01-Q32–Q33) |

**Suggested stack for implementation plans (not locked in SP-01):** TypeScript, Node 20+, pnpm, Next.js App Router for UI + API routes, AWS deployment (e.g. container or static+serverless) — refine in SP-14 for cost/latency.

---

## 4. Modes

### Demo mode (SP-01-Q22d)

- Pre-made **scenario cards** (starting set: `demo-ai-analytics-premium`).
- Selecting a card **auto-fills** intake, constraints, and hints so a 3–5 minute walkthrough stays coherent.
- Live integrations still run unless SP-14 fallback activates.

### Full mode

- User supplies company, feature/decision, constraints, repo, and market-behavior description.
- Recommendation may differ from the init.md illustrative story.

---

## 5. Nice-to-have → build inclusion (first pass)

| Item | SP-01 answer | Build stance |
|------|----------------|--------------|
| Multiple launch strategies | Single launch; ship updates incrementally (Q12) | Compare **pilot vs broad** (and qualitative alternatives in app per SP-08); not “many GTM plays” |
| Sensitivity (price, adoption) | **In** (Q13) | Required in v1 scope |
| Contradictory-signal revision | **In** (Q14) | Required when pipeline ready; not demo-day gate (Q7) |
| Pilot vs broad comparison view | **In** — pilot to validate feature (Q15) | Required in v1 scope |
| Exportable decision report | **In** (Q16) | Required in v1 scope |
| After must-haves | No extra ranked list (Q17) | Stop at listed nice-to-haves |

---

## 6. Integrations and fallbacks (scope level)

| Integration | Role in success | Fallback (SP-01-Q08) |
|-------------|-----------------|----------------------|
| Crustdata | Real market grounding | LLM + **required JSON shape**, clearly labeled non-Crustdata |
| cfo.ai | Deterministic finance numbers | Fixture + labels (see `fixtures/finance/`, SP-07) |
| Synthetic panel | Simulated demand | N/A — core product we build |
| Neatlogs | Observability | **No substitute** — if down, demo is degraded; document partial success |
| Entire | Repo history / checkpoints | Track B git+OSS alternate per SP-12 |

**Integration down on demo day:** Labeled LLM fallback for Crustdata-shaped payloads; finance uses fixtures; Neatlogs absence = partial success, not hidden.

**Quality bar:** Decision quality judged **manually** for now (Q09). “Good enough” = **mix** of human judgment, rubric, judges, and agent uncertainty display (Q10).

**Hard fail:** Presenting **invented numbers as facts** — Crustdata and cfo.ai chosen for **deterministic, attributable numbers** (Q11).

---

## 7. Claim safety (L2)

Per SP-01-Q29 (align with SP-02 glossary):

- **Export/report:** Mandatory epistemic labels — Observed / Simulated / Assumed / Inferred; finance carries “not a forecast” / illustrative wording.
- **UI:** Any **number, chart, or statistic** shows the correct label.
- **Panel:** All panel metrics marked **simulated**.
- **Headline recommendation:** Allowed only if the **same report** contains statistics and per-source reasoning (Q30).
- **Misuse liability:** Out of scope to block; no special legal UX (Q31).

---

## 8. Spec must-haves → visible demo moments

Maps `init.md` §8 must-haves to what a stranger checks in a 3–5 minute **Demo mode** run:

| Must-have | Visible moment | Artifact / integration |
|-----------|----------------|-------------------------|
| One SaaS company profile | Card auto-fill or intake step 1 | `fixtures/demo/decision-card-ai-analytics.json` |
| One proposed feature decision | Decision question on report cover | Same fixture + Full mode form |
| One Crustdata research path | Report section “Market evidence” + sources | SP-05 pipeline |
| Small diverse synthetic panel | Report “Simulated customers” + segment breakdown | SP-06 |
| Segment aggregation + disagreement | Chart/table with disagreeing segments | SP-06 |
| One financial comparison (cfo.ai) | Report “Economics” pilot vs broad | SP-07, `config/cfo-ai-mapping.json` |
| Neatlogs on main run | Link/panel “Agent trace” | SP-11 |
| Entire supported workflow | “Repository history” step | SP-12 |
| Recommendation + evidence + assumptions + uncertainty | Exportable report PDF/MD | SP-08, SP-13 |

---

## 9. Non-goals (spec + project stop-rule)

**From init.md §8 (unchanged):** No claiming synthetic agents predict the real market; no 100k expensive LLM calls in demo; no full startup game; no building the evaluated feature; no auto real-world launch/spend; no Entire as business-state brancher; no competitor activity = demand.

**SP-01-Q34 stop-rule (project):** Do not add until core loop ships:

- Multi-tenant SaaS auth beyond demo needs
- Arbitrary third-party CRM/ERP connectors
- Real customer outreach or ad spend automation
- Custom ML training pipelines for panel personas
- Mobile-native clients

**SP-01-Q35:** Success checklist lives in `.docs/specs/SP-01-success-checklist.md` (maintained with implementation).

---

## 10. Open decisions (defer to later SPs)

- Exact AWS service map (SP-14)
- Panel N and batching defaults (SP-06, SP-14)
- Entire vs Track B default in CI (SP-12)
- Full JSON schemas for domain objects (SP-02)

---

## 11. Traceability

| Subproblem file | This spec |
|-----------------|-----------|
| `.docs/subproblems/01-scope-success-nongoals.md` | Q01–Q33 answers |
| `.docs/init.md` | §1–12 principles and must-haves |
| `fixtures/demo/decision-card-ai-analytics.json` | Default demo card payload |
