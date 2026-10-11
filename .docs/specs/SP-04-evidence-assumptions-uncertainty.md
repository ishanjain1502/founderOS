# SP-04 — Implementation spec (evidence, assumptions, and uncertainty)

**Status:** Locked from `04-evidence-assumptions-uncertainty.md` Q01–Q36 plus the clarifications in §1 (this design pass).  
**Depends on:** SP-01 (claim-safety copy, Demo/Full), SP-02 (`Evidence`, `Claim`, `EpistemicKind`, `inferenceSchema`, `FORBIDDEN_PHRASES`, `sessionBundleSchema`), SP-03 (frozen session, `intake_json`, Start).  
**Produces:** Epistemic snapshot at freeze, domain validators, view-only taxonomy lists on `/session/[sessionId]`.  
**Does not produce:** live Crustdata (SP-05), panel disagreement (SP-06), finance sensitivity (SP-07), recommendation body (SP-08), revision diffs (SP-09/SP-10), agent tools (SP-10), investigation dashboard (SP-13).

---

## 1. Clarifications (this pass — not silent defaults)

| Topic | Decision |
|--------|----------|
| **Spec split** | Separate spec + plan for SP-04, then SP-05 in the same design session. |
| **SP-04 build boundary** | Domain rules + persist claims/evidence/inferences JSON on the session + a **view-only** list on the frozen session page. No live Crustdata, panel, finance, recommendation, revision, or agent. |
| **Seed data** | **Demo:** hydrate a small labeled fixture (1 illustrative Observed competitor-style row, Assumptions from intake, ≥1 Unknown, Q35 Hypothesis + demand-disclaimer inference). **Full:** Assumptions/Unknowns from intake only — **no Observed** until SP-05. |
| **Persistence** | New column `sessions.epistemic_json`. Do **not** nest inside `intake_json`. Not a partial `sessionBundle` dump. |
| **When written** | **Once on Start investigation** (freeze). Draft/recap do not show this list. After freeze: GET-only; PATCH → **409**. |
| **Inferred rows** | Persist `inferences[]` on `epistemic_json` using existing SP-02 `inferenceSchema` (`statement` + `refIds` ≥1). Same object SP-08 will nest under the recommendation. |
| **Demo Observed vs Crustdata** | Demo row is **`vendor: demo_fixture`**, identityKey `fallback:demo:{sessionId}:competitor`, chip **Illustrative example**. Never “via Crustdata”. SP-05 **appends** `vendor: crustdata` rows; it does not replace this row. |
| **Vendor vs EntitySource** | Keep `baseEntitySchema.source` as EntitySource (`system` \| `user` \| `agent` \| `import`). Add Evidence field **`vendor`**: `crustdata` \| `fallback` \| `demo_fixture`. UI labels key off `vendor`. |
| **Contradiction UI** | Schema + predicates this pass (`status`, `contradictingEvidenceId`). No approve/reject card (Q15–Q17 UI is later). |
| **Sensitivity / disagreement / validation steps / revision** | Locked in Q&A; **not built** this pass (see §14). |
| **Numeric ranges** | Assumptions store **point** values from intake. Optional range only if already present on the demo-card draft assumption; no invented ±% bands in SP-04. |
| **Modeled display kind** | No fifth `EpistemicKind`. Finance stays **Inferred** + `assumptionRefs` (SP-02). SP-04 “Modeled” remains a display category for later SPs. |

---

## 2. Product behavior

SP-04 is the rule layer that keeps Observed, Assumed, Unknown, Hypothesis, and Inferred from collapsing into one blob. The operator sees that split on the **frozen** session page after Start.

**Demo path:** intake (already filled) → recap → Approve → Start → `/session/[id]` shows:

- **Observed** — one illustrative competitor-style fact, chip **Illustrative example**, not Crustdata.
- **Hypothesis** — strategic-importance statement citing that Observed id (Q35).
- **Inferred** — `CLAIM_SAFETY_COPY.competitorNotDemand` with `refIds` containing that Evidence id.
- **Assumptions** — projected from intake (financials, budget, time, demo-card scenario assumptions).
- **Unknowns** — at least WTP/demand if not a user-provided fact; `provideLater` metrics.

**Full path:** same lists; Observed empty with copy “No observed market evidence yet.” Assumptions/Unknowns from whatever the operator entered (`provideLater` → Unknowns, never Observed).

Existing start-page safety lines stay (`CLAIM_SAFETY_COPY.panelSimulated`, etc.).

---

## 3. Architecture

```text
POST /api/sessions/:id/start
  → require approved + complete intake (SP-03)
  → projectIntakeToEpistemic(intake, { mode, sessionId })
  → validateEpistemicSnapshot
  → UPDATE sessions SET epistemic_json, status=frozen, frozen_at
  → redirect /session/:id

GET /api/sessions/:id
  → { ..., intake, epistemic: snapshot | null }

/session/[sessionId]
  → view-only Observed / Assumptions / Unknowns / Inferred lists
```

| Piece | Responsibility |
|-------|----------------|
| `@ceo-sandbox/domain` | Schema extensions, `epistemicSnapshotSchema`, projection, validators, forbidden-phrase list, contradiction predicates. Client-safe (no Node crypto in client barrel). |
| `@ceo-sandbox/db` | `epistemic_json` column; Start writes it; freeze blocks later writes. |
| `apps/web` | Start route materializes snapshot; GET returns it; frozen page renders lists. |

`intake_json` remains the wizard snapshot. `epistemic_json` is a **separate** freeze-time projection. Client PATCH of epistemic is out of scope (409 via freeze). How SP-05 writes additional Evidence is decided in the SP-05 spec; this snapshot is the document it will extend.

---

## 4. HTTP

| Method | Path | Effect |
|--------|------|--------|
| `POST` | `/api/sessions/:id/start` | Unchanged gates (must be `approved`, intake complete). **Additionally** writes `epistemic_json`. Response includes `epistemic`. If projection/validate throws, **do not freeze** (500, stable `code: "epistemic_projection_failed"`). |
| `GET` | `/api/sessions/:id` | Adds `epistemic`: parsed snapshot if frozen, else `null`. |
| `PATCH` | `/api/sessions/:id` | Unchanged. Frozen → **409**. No client PATCH of `epistemic`. |

No new routes. Cookie behavior unchanged.

---

## 5. SQLite

Keep `data/sandbox.sqlite`. Add a column (migrate existing DBs with `ALTER TABLE` if the column is missing):

```sql
ALTER TABLE sessions ADD COLUMN epistemic_json TEXT;
```

- Draft / approved: `epistemic_json` is **NULL**.
- Frozen: `epistemic_json` is NOT NULL JSON that parses as `epistemicSnapshotSchema`.
- `openSessionStore` freeze/start is the only writer in SP-04.
- After freeze, any store method that would write `intake_json` or `epistemic_json` throws `FrozenSessionError` (HTTP 409).
- Missing/unwritable DB → **500** (same as SP-03).

---

## 6. Schemas (`contractVersion: 1`)

Do **not** add `EpistemicKind.Modeled` or `ClaimKind.Inferred`. Display buckets:

| UI bucket | Stored as |
|-----------|-----------|
| Observed | `Evidence` with `EpistemicKind` implied Observed |
| Simulated | not in this SP |
| Assumptions | `Claim` `kind: assumption` — label **Assumed** |
| Unknowns | `Claim` `kind: unknown` |
| Hypothesis | `Claim` `kind: hypothesis` |
| Inferred | `inferences[]` (`inferenceSchema`) |

### 6.1 `epistemicSnapshotSchema`

```text
EpistemicSnapshot
  contractVersion: 1
  evidence: Evidence[]
  claims: Claim[]
  inferences: Inference[]    // { statement, refIds: uuid[] }  min 1 ref each
```

Unknown keys rejected. Empty arrays allowed (Full Observed is `[]`).

`emptyEpistemicSnapshot()`: `{ contractVersion: 1, evidence: [], claims: [], inferences: [] }`.

### 6.2 Evidence extensions (additive on SP-02 `evidenceSchema`)

Existing required: `id`, `contractVersion`, `createdAt`, **`source` (EntitySource)**, `sessionId`, `summary`, `retrievedAt`, plus identity (`externalId` \| `canonicalUrl` \| `identityKey` starting `fallback:`).

**Add:**

| Field | Rule |
|-------|------|
| `vendor` | required enum `crustdata` \| `fallback` \| `demo_fixture` |
| `fieldPaths` | optional `string[]` (vendor field paths included in the summary) |
| `demandAdjacent` | boolean, default `false`. When true, UI **must** show the demand disclaimer (Q36). Demo competitor row is `true`. |
| `quarantine` | boolean, default `false` |

**Q07 provenance:**

| Condition | Result |
|-----------|--------|
| Missing identity (no `externalId`, no `canonicalUrl`, and `identityKey` not `fallback:…`) | **Unusable:** `quarantine: true`. Never show in Observed list. |
| Identity present but `retrievedAt` missing | Invalid schema (still required). |
| Identity + `retrievedAt`; `vendor` present | Usable. Incomplete optional fields (no URL, no vendorTimestamp) → **warning** in `intakeWarnings`-style helper `epistemicWarnings(snapshot)`, still listed. |
| Never usable silently without `retrievedAt` | Already schema-required. |

Demo Observed identity: `identityKey = "fallback:demo:{sessionId}:competitor"`, `vendor: demo_fixture`, `source: EntitySource.System`, `retrievedAt` = freeze timestamp, `demandAdjacent: true`. Optional `canonicalUrl` omitted (do not invent a competitor URL).

`rawPayloadRef` is **not** required in SP-04 (SP-05 stores raw Crustdata). Demo fixture may omit it.

### 6.3 Claim extensions (additive)

Existing: `kind` hypothesis \| assumption \| unknown; `statement`; optional `locked`, `rationaleTag`; hypothesis `resolution`; assumption optional `numeric`.

**Add to all claim kinds:**

| Field | Rule |
|-------|------|
| `owner` | required `user` \| `agent` \| `system` \| `demo_fixture` |
| `status` | required `active` \| `contradicted` \| `superseded`. Projection always writes `active`. |
| `contradictingEvidenceId` | optional uuid; required by predicate when `status === contradicted` |

**Add on assumption only:**

| Field | Rule |
|-------|------|
| `numericRange` | optional `{ min: number, max: number, unit }` matching the point `numeric.unit` when present. Omit when intake has only a point. |

`mapsTo` from `SessionDraftAssumption` is not on SP-02 `claimSchema`. **Add** optional `mapsTo: string` on assumption claims so SP-07 can join. When promoting `intake.assumptions[]`, keep the draft row `id` as the Claim `id` so existing scenario `assumptionRefs` stay valid.

**Promotion of `intake.assumptions[]`:** reuse draft `id` as Claim `id` so scenario `assumptionRefs` stay valid.

### 6.4 Inferences

Reuse `inferenceSchema`: `{ statement: string, refIds: uuid[] }` with `refIds.min(1)`. Validator: every id must exist on `evidence[]` or `claims[]` in the same snapshot. Q08: Inferred is not Evidence. Publish-block for missing refs is a validator failure on Start (500 path) in this SP because there is no recommendation publish yet.

### 6.5 Projection `projectIntakeToEpistemic(intake, { mode, sessionId, now })`

Deterministic. `now` ISO-8601 from the server.

**Always (Demo and Full):**

1. Map each `intake.assumptions[]` entry → Assumption Claim: same `id`/`statement`/`numeric`/`rationaleTag`/`mapsTo`; `owner` = `demo_fixture` if `rationaleTag === demo_fixture`, else `user` if `user_provided`, else `system`; `locked` = true when `owner === demo_fixture` (Q13; Edit intake is SP-09); `status: active`.
2. From intake fields **not** already represented by a `mapsTo` key, add Assumption Claims (`newId()` on server):
   - `constraints.budgetUsd` → money, period `one_time`, `mapsTo: "budget"`
   - `constraints.executionMonths` → no `numeric` unless we store months as a statement-only assumption (“Execution window: N months”)
   - `financials.cashUsd` / `customerCount` / `mrrUsd` / `runwayMonths` when the value is present and `provideLater` is not covering that metric
3. Unknown Claims (`newId()`):
   - Each financial metric listed in `provideLater` / missing because `provideLater: true` → Unknown, `rationaleTag: missing_evidence`, `owner: user`, statement like “Cash on hand not provided (provide later).”
   - Always at least one demand/WTP Unknown unless `feature.proposedPriceUsd` is present **and** a matching assumption already covers price: e.g. “Willingness to pay for this feature is unknown.” `rationaleTag: missing_evidence`.
4. Owner from `intake.fieldSources` when the path exists: `demo_fixture` → owner `demo_fixture`; `user` → `user`; `provide_later` → Unknown not Assumption; `system_default` → `system`.

**Demo only (`mode === demo`):**

5. One Evidence row as in §6.2. Summary must be a restatable competitor **fact-shaped** sentence that is honestly illustrative, e.g. “Illustrative: a comparable workflow vendor lists analytics as a product capability.” Must **not** use forbidden phrases (§8).
6. One Hypothesis Claim, `resolution: open`, `owner: demo_fixture`, `locked: true`, statement that analytics **may** be strategically important (Q35). Not stored as Observed.
7. One inference: `statement` = `CLAIM_SAFETY_COPY.competitorNotDemand`, `refIds: [thatEvidenceId]`.

**Full only:** skip 5–7. `evidence: []`, `inferences: []` unless a future SP-05 appends them.

Do **not** invent competitor names as Observed. Do **not** copy panel/finance copy into Evidence.

### 6.6 `validateEpistemicSnapshot(snapshot)`

Returns `{ ok, errors, quarantinedIds }`.

- Parse `epistemicSnapshotSchema`.
- Evidence identity rule; set/require `quarantine` consistent with Q07 (projection should already set it; validator fails Start if a shown Observed row is quarantined).
- Every inference `refIds` resolves.
- No Evidence row with `vendor: crustdata` in SP-04 projection (guard test: demo fixture is never `crustdata`).
- Claim `status === contradicted` requires `contradictingEvidenceId`.
- `contradictionPredicate(claim, evidence)` exists for tests: auto-**suggest** only (does not flip status in SP-04).

### 6.7 `epistemicWarnings(snapshot)`

Non-blocking: missing optional URL/vendorTimestamp; quarantined count.

---

## 7. Frozen session UI

Replace/extend the SP-03 placeholder on `/session/[sessionId]`.

**Required visible:**

- Session still frozen (existing copy).
- Heading **Observed** — each row: `summary`, epistemic label **Observed**, `retrievedAt`, `vendor` chip (`Illustrative example` when `vendor === demo_fixture`; `Observed via Crustdata` is **SP-05 only**). If `demandAdjacent`, show `CLAIM_SAFETY_COPY.competitorNotDemand` under the row (in addition to the Inferred list).
- Heading **Assumptions** — `statement`, **Assumed** label, `owner`, `rationaleTag` when present, point `numeric` if any.
- Heading **Unknowns** — `statement`, **Unknown** label.
- Heading **Hypothesis** — if any claims of that kind.
- Heading **Inferred** — inference statements + that they are not Evidence.
- Full empty Observed: one line **No observed market evidence yet.**
- Quarantined rows: **not** listed; if count > 0, a warning “N evidence item(s) hidden (missing identity).”

Inputs disabled / no edit controls. No contradiction approve/reject. No Reset.

Copy on this page must pass `findForbiddenPhrases` (tests use the fixture strings + CLAIM_SAFETY_COPY).

---

## 8. Forbidden conclusions (Q23–Q25, Q26)

Extend `FORBIDDEN_PHRASES` (substring, case-insensitive) **without removing** SP-02-Q43 entries:

| Phrase | Targets |
|--------|---------|
| existing | `customers said`, `survey`, `forecast`, `will generate`, `proven demand`, `real market proof` |
| add | `definitely`, `customers will buy`, `guaranteed revenue`, `will hit $`, `1000 real`, `1,000 real`, `proves demand`, `proves customer demand`, `real interviews` |

**Enforcement this pass:** `findForbiddenPhrases` on (1) demo fixture `summary` and hypothesis `statement`, (2) frozen-page static copy, (3) `CLAIM_SAFETY_COPY` values (must remain clean). **Not** an agent retry loop (no agent). Q25 publish-blocked run is SP-08/SP-10.

**Q26:** not applicable (no panel). Simulated label remains on start-page `panelSimulated` copy.

**Q36:** demand-adjacent Observed (demo row) always shows the disclaimer chip/block. Not every future Crustdata field (firmographics) — SP-05 sets `demandAdjacent` per field group.

---

## 9. Assumption / contradiction rules (schema now, UI later)

Locked Q10–Q17, implemented as types + functions:

| Rule | SP-04 behavior |
|------|----------------|
| Who may invent | User (intake) and system/demo_fixture projection. **No agent_gap_fill rows** this pass (no agent). |
| Owner | Required on every Claim. |
| Agent mutate user/locked/demo_fixture | Predicate `mayAgentMutate(claim)` → false for those; untested against a live agent. |
| Contradiction | `status` + `contradictingEvidenceId` + `operatorMustConfirm: true` in the predicate result. Status never auto-flips in SP-04. |
| Conflicting assumptions | `claimsConflict(a, b)` helper + tests. Does **not** block Start in SP-04 (no cfo.ai send yet). Documented for SP-07. |

---

## 10. Downstream mapping (types only)

| Later SP | This snapshot |
|----------|----------------|
| SP-05 | Append Evidence `vendor: crustdata` or `fallback`; set `demandAdjacent` for product/pricing/reviews; do not delete `demo_fixture` Observed. |
| SP-06 | Panel aggregates are **Simulated**, never Evidence. |
| SP-07 | Assumption Claims + `mapsTo` / ids; Modeled display = Inferred + `assumptionRefs`. |
| SP-08 | Lift `inferences[]` into recommendation; validator retry; ≥1 validation step rules. |
| SP-09/10 | Contradiction confirm + revision diff. |

---

## 11. Errors

| Case | Behavior |
|------|----------|
| Unknown `sessionId` | 404 (unchanged) |
| PATCH frozen | 409 |
| Intake incomplete on Start | 400 (unchanged) |
| Projection/validate fail | 500 `epistemic_projection_failed`; status stays `approved` |
| DB down | 500 |
| Quarantined Evidence in projection | Start fails validate (demo fixture must not quarantine) |

---

## 12. Testing (SP-04)

Vitest. No Playwright. After implementation, browser-check: Demo Start → frozen lists show Observed (illustrative), Assumption, Unknown, Hypothesis, demand disclaimer; Full Start → empty Observed line; frozen PATCH 409; GET before Start has `epistemic: null`.

- **Domain:** demo vs Full projection; `provideLater` → Unknown not Observed; demo Evidence `vendor !== crustdata`; identityKey prefix `fallback:demo:`; inferences resolve; quarantine vs warning; `contradicted` requires evidence id; forbidden phrases on fixture copy; draft assumption ids preserved.
- **db:** start writes `epistemic_json`; re-open file returns same JSON; freeze blocks writes; draft row has NULL epistemic.
- **API:** GET null then snapshot; start failure does not freeze; 409 frozen.

---

## 13. Out of scope for SP-04 implementation

- Crustdata REST/MCP, smoke test, fixtures/crustdata (SP-05)
- Panel disagreement, respondent spread (SP-06)
- Price/adoption sensitivity tables (SP-07)
- Recommendation `missingData` / validation steps / confidence ranking (SP-08) — Q18–Q22, Q27–Q30
- Revision diffs, new-evidence triggers (Q31–Q34)
- Operator contradiction confirm UI (Q15–Q16)
- Agent prompt + bounded rewrite retry (Q24–Q25)
- Edit intake / unlocking `demo_fixture` assumptions (SP-09)
- Neatlogs
- Fifth epistemic enum
- Sharing `epistemic_json` across users / cache (SP-05 terms)

---

## 14. Traceability

| Source | Role |
|--------|------|
| `.docs/subproblems/04-evidence-assumptions-uncertainty.md` | Q01–Q36 |
| This spec §1 | Design-pass clarifications |
| `.docs/specs/SP-01-scope-success-nongoals.md` | Illustrative vs live, claim-safety |
| `.docs/specs/SP-02-shared-domain-contracts.md` | Evidence, Claim, Inference, EpistemicKind (4 values) |
| `.docs/specs/SP-03-decision-intake-and-company-context.md` | Freeze/Start, intake projection inputs |
