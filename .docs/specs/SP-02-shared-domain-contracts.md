# SP-02 — Implementation spec (shared domain contracts)

**Status:** Locked from `02-shared-domain-contracts.md` + clarifications below.  
**Depends on:** SP-01, SP-09 (SQLite persistence shape), SP-04 (epistemic rules).  
**Produces:** Types and validators in `@ceo-sandbox/domain` for all later SPs.

---

## 1. Clarifications (not assumptions — your answers + explicit recommendations)

| Topic | Decision |
|--------|----------|
| **cfo.ai mapped numbers vs epistemic kinds** | No fifth **Modeled** enum. Mapped finance outputs use **`EpistemicKind.Inferred`** with mandatory **`assumptionRefs[]`** (and optional `sourceRefs` to Evidence). Copy still uses SP-01 “not a forecast” / illustrative finance wording. Aligns with SP-04 “Modeled” as a *display category* mapped to **Inferred** in storage. |
| **Adoption / scenario rates** | **Not** anonymous floats on Scenario. **Adoption (and similar drivers)** are **`Assumption` Claims** per scenario (and session base set). Used to build finance scenarios and sensitivity — “predicted numbers against which finances are calculated.” Demo card `adoption_rate_percent` → Assumption objects on hydrate. |
| **Percentage storage** | **Confirmed:** Assumption numerics use **`unit: "percent"`** with **0–100** scale (e.g. `18` = 18%). Validators reject unitless numbers (SP-02-Q40). |
| **Schema source of truth** | **Recommendation (accepted for v1 plan):** **Zod** in `packages/domain`, `contractVersion: 1` on every persisted object; optional exported JSON Schema under `schemas/v1/` for docs/interop. |
| **Demo decision cards** | **Recommendation:** Cards remain **UX/import DTOs** (`DemoDecisionCard` + `loadDemoCard`). Canonical graph uses Session types. Single bridge: **`demoCardToSessionDraft(card): SessionDraft`** — not persisted as a domain type. |
| **CodeImpactArtifact** | **In v1** — first-class, linked from `Run` (`codeImpactRunId` / `missingData.codeImpact` when skipped). |
| **PanelStimulus** | **First-class** session-scoped object; panel runs reference `panelStimulusId`; evaluations snapshot stimulus version + text. |

---

## 2. Object inventory (v1, `contractVersion: 1`)

### 2.1 Core graph

```text
Session
  ├── Decision (question only; not the recommendation)
  ├── CompanyProfile
  ├── FeatureProposal
  ├── Constraints (budget, time — or Assumption-backed; see SP-03)
  ├── PanelStimulus (versioned)
  ├── Archetype[] 
  ├── Scenario[] (sibling strategies; assumptionRefs)
  ├── Evidence[]
  ├── Claim[] (kind: hypothesis | assumption | unknown)
  ├── Run[] (agent execution)
  │     ├── CodeImpactArtifact? (optional)
  │     ├── PanelRun → RespondentEvaluation[], SegmentAggregate[]
  │     └── FinanceRun → FinancialRunResult per scenario
  ├── Recommendation[] (draft | current | superseded)
  └── Revision[] (links recommendations + triggering evidence)
```

**Not first-class persisted:** Demo scenario cards (SP-02-Q02).  
**No User type in v1** (implicit operator, SP-02-Q05).

### 2.2 Identity rules (summary)

| Entity | Identity |
|--------|----------|
| Decision | `decisionId` stable; `questionRevision` bumps on material edit |
| Evidence | Provider id if present; else canonical URL; fallback `fallback:…` keys |
| Dedup | Same Q07 identity ⇒ duplicate (drop/quarantine) |
| Archetype | Stable `archetypeId` in Full mode |
| RespondentEvaluation | New row per `(archetypeId, panelRunId)` |
| Panel / finance history | Append-only; UI defaults to latest run (Q10–Q11) |

### 2.3 Recommendation lifecycle

`draft` → `current` on publish; previous `current` → `superseded`. Immutable snapshots; **Revision** explains change.

### 2.4 Panel

- **Archetype** = template; **Respondent** = instance in a run; **RespondentEvaluation** = answers + **snapshot** (profile, questionnaire version, stimulus, model hash).
- **Primary segment** one per respondent for headline aggregates; optional **tags** for drill-down (Q20).
- **Segment catalog:** fixed enum aligned with init.md archetypes (see §4).
- **PanelQuestionnaire:** versioned; primary choice closed enum (§4).
- **Aggregation:** primary by segment; retain respondent-level rows (Q22).

### 2.5 Finance

- **FinancialRunResult:** `rawPayloadRef` + **mapped** canonical fields (all Q29 concepts nullable with `provided: false`, never invented).
- Mapped fields labeled **Inferred** with assumption refs (§1).

### 2.6 Run

- Fields: `id`, `sessionId`, `status`, `startedAt`, `contractVersion`, `createdAt`, `source`.
- **`neatlogsTraceId` required** unless `runKind: "fallback"` (labeled).
- Optional `codeImpactRunId`; `missingData.codeImpact` when skipped.

### 2.7 Recommendation minimum (SP-02-Q30)

`headline`, `chosenScenarioId`, `evidenceRefs[]`, `assumptionRefs[]`, `inferences[]`, `uncertainty` (structured), `tradeoffs[]`, `rejectedAlternatives[]`, `nextValidationStep` (≤3 material), `panelDisagreementSummary`, `runId`, `status`.

### 2.8 Time

Server UTC ISO 8601 ms; vendor times on Evidence as-is; `retrievedAt` always set; `sourceTimeUnknown` allowed (Q36).

### 2.9 Validation tiers (SP-02-Q39)

| Severity | When |
|----------|------|
| Block | Invalid Session/Decision/Run; publish Recommendation; send cfo.ai |
| Quarantine / skip | Duplicate evidence; single bad Crustdata row |
| Continue + flag | Non-critical ingest with Neatlogs visibility |
| Never silent drop | User-entered assumptions |

---

## 3. Claim model (SP-02-Q13–Q18)

- **Evidence** — own type (provenance).
- **Hypothesis / Assumption / Unknown** — **Claim** with `kind`.
- **Assumption** — numeric `value` + `unit` + `currency`/`period` for money.
- **No promotion** of Hypothesis → Evidence (Q15); resolution `open | supported | refuted`.
- **Creators:** user, agent (visible), system (labeled defaults) (Q16–Q17).
- **Unknowns:** may stay open; ≤3 `nextValidationStep` on current Recommendation; rest in appendix (Q18).

**Rationale tags** (SP-04-Q09): `user_provided` | `missing_evidence` | `demo_fixture` | `system_default` | `agent_gap_fill` | `reconciliation`.

---

## 4. Closed enums (v1)

### 4.1 `PrimarySegment` (catalog)

`price_sensitive_smb` | `enterprise_buyer` | `power_user` | `loyal_existing` | `low_engagement` | `technical_evaluator` | `procurement_enterprise` | `early_adopter` | `conservative_buyer` | `competitor_loyal`

(Align names with SP-06 panel docs; stable snake_case in code.)

### 4.2 `PanelPrimaryChoice` (SP-06-Q21)

`pay_extra` | `use_if_included` | `try_not_pay` | `ignore` | `consider_switching`

### 4.3 `StrategyKind` (extensible)

`broad_launch` | `enterprise_segment_launch` | `pilot` | `delay` | `do_not_build` (+ string extension for Full mode)

### 4.4 `RunMode`

`demo` | `full` (already in code)

### 4.5 `FeatureChangeType`

`feature` | `pricing` | `ui` | `other`

---

## 5. Glossary & forbidden copy (SP-02-Q42–Q43)

Reuse `EpistemicKind` + `epistemicLabel()` + `CLAIM_SAFETY_COPY` in `@ceo-sandbox/domain`. Add `FORBIDDEN_PHRASES` for report post-check (substring or regex list).

| Label | Use |
|-------|-----|
| Observed | External evidence (Crustdata, etc.) |
| Simulated | Panel aggregates and quotes |
| Assumed | User/agent/system assumptions |
| Inferred | Agent conclusions **and** cfo.ai mapped outputs (with refs) |

---

## 6. Serialization & persistence (SP-09)

- Persist JSON documents in SQLite (SP-09); each row/object includes `contractVersion: 1`.
- Large blobs: `data/blobs/{id}` with refs from Evidence / FinancialRunResult.
- **SessionDraft** — in-memory shape before first save; produced from intake wizard or `demoCardToSessionDraft`.

---

## 7. Mapping from existing code

| Existing | Action |
|----------|--------|
| `DemoDecisionCard` / `loadDemoCard` | Keep; add `demoCardToSessionDraft` |
| `EpistemicKind` | Keep four values; document finance as Inferred |
| `RunMode` / `parseRunMode` | Keep; Session.mode uses same enum |

---

## 8. Out of scope for SP-02 implementation

- Crustdata / cfo.ai / Neatlogs payload mapping (SP-05, 07, 11) — only stub ref types.
- Agent orchestration (SP-10).
- UI layout (SP-13).
- AWS / SQLite wiring (SP-09 plan) — validators must not depend on DB.

---

## 9. Traceability

| Source | Role |
|--------|------|
| `.docs/subproblems/02-shared-domain-contracts.md` | Q01–Q43 + Appendix A |
| `.docs/subproblems/04-evidence-assumptions-uncertainty.md` | Epistemic display vs storage |
| `.docs/subproblems/09-application-state-and-revision-loop.md` | Session store, append-only runs |
| `.docs/subproblems/06-synthetic-market-panel.md` | Panel enums, PanelStimulus usage |
