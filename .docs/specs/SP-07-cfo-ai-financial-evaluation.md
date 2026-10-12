# SP-07 — Implementation spec (cfo.ai financial evaluation)

**Status:** Locked from `07-cfo-ai-financial-evaluation.md` Q01–Q47 plus the clarifications in §1 (this design pass).  
**Depends on:** SP-01 (Pilot vs Broad comparison, sensitivity in scope, export labels), SP-02 (`financialRunResultSchema`, Q28–Q29 metrics, `mapsTo` on assumptions), SP-03 (intake financial baseline), SP-04 (assumption pack gate, Modeled display → `EpistemicKind.Inferred` in storage), SP-06 (optional panel→adoption via explicit Assumption only), SP-14 (≤20 MCP calls/phase, 90s finance stage, fixture labels).  
**Produces:** Frozen-session finance path (`runFinancePath`), `epistemic.finance` on snapshot, raw MCP payloads on disk, health smoke, `GET`/`POST` finance APIs, session-page comparison UI. `runFinance` is the function SP-10 will wrap.  
**Does not produce:** CEO agent loop (SP-10), Neatlogs spans (SP-11), recommendation/scorecard (SP-08), assumption-gate approve UI beyond what SP-04 already exposes (minimal approve flag this pass). **Provisioning** is triggered at wizard start (SP-03 `POST /api/sessions`); finance consumes the result.

---

## 1. Clarifications (this pass — not silent defaults)

| Topic | Decision |
|--------|----------|
| **One workspace per company** | Each company/session gets its **own cfo.ai workspace**. **Not** a single shared org for all users in production. |
| **When to provision** | **Wizard start** — `POST /api/sessions` kicks off `provisionCfoWorkspace` (async or awaited per implementation). See `.docs/practical/cfo-workspace-provisioning.md`. |
| **Workspace identity (app)** | At wizard start: **`workspaceKey`** = `{org_name_slug}-{session.createdAt UTC ISO}`. Index sessions/users by this; use in logs and internal APIs. |
| **cfo vendor id** | **`cfoOrgId`** from `list_orgs` after provision — only this (or vendor slug) goes on MCP **`org_id`**. Do not use `workspaceKey` as MCP `org_id`. |
| **Assignment to user** | **Identity only:** session/user holds `workspaceKey` + `cfoOrgId` when known. **No** cfo permissions/invites in v1. |
| **Create workspace via MCP** | **Not available today.** `edit_org` only renames; catalog has no `create_workspace`. Creation is sign-up/onboarding in product docs; multi-workspace is **Enterprise**. Until a partner API exists: `cfoWorkspace.status` = `pending` \| `ready` \| `failed`; finance uses **fixture/deferred** when not `ready`. |
| **Mapping** | **Template** (`config/cfo-ai-mapping.template.json` or equivalent): shared table/row names + assumption keys. **Per session:** `orgId` + scenario refs from bootstrap. |
| **Live finance gate** | `session.cfoWorkspace.bootstrapStatus === "ready"` **and** smoke (Q45) for **that** `org_id` **and** `CFO_LIVE` + server token. Else labeled fixture — never silent swap. |
| **MCP runtime** | **Next.js server only** (`nodejs` routes). Bearer (or documented server credential) via env — **never** in the browser. Mirror Crustdata’s `*_LIVE` gate pattern. |
| **Build boundary** | Must-have finance path **without** SP-10. One finance phase per session POST unless Full re-run rules apply later. No recommendation prose. |
| **Storage** | Extend `epistemic_json` with `finance` summary. Raw MCP JSON `data/cfo-raw/{sessionId}/{financeRunId}.json`. Mapped compare columns on snapshot; optional append of two `financialRunResults` rows in bundle export when SP-09 wires full bundle writes. |
| **Epistemic storage vs UI** | Mapped cfo numbers: **`EpistemicKind.Inferred`** + `assumptionRefs[]` (SP-02). UI badge **Modeled** + copy **“Modeled — cfo.ai workspace (not a verified forecast).”** (Q09, Q30). Baseline intake row: **Assumed** / user input labels (Q12, Q29). Fixture: distinct banner **“Recorded finance fixture — not live cfo.ai”** (Q47). |
| **Confirmed workflow v1** | (1) `validateFinanceAssumptionPack` → (2) operator `financeAssumptionsApproved` on session → (3) `edit_table_blocks` writes per scenario → (4) `inspect_table_blocks` **compare** Pilot vs Broad → (5) sensitivity on **Pilot** only (3× price, 3× adoption) → (6) deterministic checks → (7) persist raw + mapped subset. |
| **Comparison** | Must-have: **CEO sandbox - Pilot** vs **CEO sandbox - Broad** (Q11). Status quo from intake baseline on same view — not a third cfo scenario (Q12). |
| **Caps** | ≤ **20** MCP tool calls per finance phase; ≤ **90s** wall-clock per phase (SP-14 hard kill **120s**); max **2** finance phases per Run when SP-10 exists (Q14); this pass implements **1** POST completion + idempotent replay. |
| **Failure** | Hard-fail finance step only if compare read returns **no mapped output columns** for **both** scenarios after **one** retry (Q06). Otherwise nullable metrics with `provided: false`. Recommendation may continue with gaps when fixture/unavailable (Q46). |

---

## 2. Product behavior

After intake is frozen and the operator has approved finance assumptions (see §8), the frozen session page offers **Run financial comparison** (or auto-runs when SP-13 demo script dictates — button is sufficient for this pass).

The page shows:

1. **Baseline (your input)** — cash, MRR, runway months from intake; labeled as user assumption / not cfo.ai (Q29).
2. **Modeled comparison** — Pilot vs Broad columns for each mapped SP-02-Q29 metric that the workspace returns; gaps show em dash with “not in workspace model.”
3. **Attribution** — scenario names, `financeRunId`, timestamp, `CLAIM_SAFETY_COPY.financeModeled` (§7).
4. **Sensitivity snippet** — top **2** drivers by absolute delta on mapped **runway** (else burn, else revenue) after 3×3 grid on Pilot (Q33–Q36).
5. **Checks** — warning badges for failed deterministic checks; no silent correction (Q38).

**Demo** prefers live MCP when mapping is `ready` and server credential is configured. On failure, load `fixtures/finance/demo_run.json` with fixture styling (Q44–Q47). **Full** may use fixture only on failure; zero mapped compare after retry → `unavailable` without pretending live.

Panel may inform **adoption** only through an Assumption with `derivedFrom: { panelRunId, segmentIds[], questionId }` and operator approval (Q20). Silent panel→cell writes are forbidden.

---

## 3. Architecture

```text
Frozen /session/[id]
  → POST /api/sessions/:id/finance
       → 409 if status !== frozen
       → 409 if !epistemic.financeAssumptionsApproved (Q41)
       → if epistemic.finance.status === complete|fallback: idempotent 200
       → runFinancePath({ sessionId, intake, epistemic, mapping, clock, mcpClient })
            validateFinanceAssumptionPack
            if mapping.setupStatus !== ready OR !smokeCachedOk → fixture|deferred path
            else live: write inputs → compare → sensitivity loops
            mapCompareToCanonical (config/cfo-ai-mapping.json outputs)
            runFinanceDeterministicChecks
            write data/cfo-raw/...
            validateEpistemicSnapshot
            UPDATE epistemic_json
  → GET /api/health/cfoai  (startup log; Q45 smoke)
```

| Piece | Responsibility |
|-------|----------------|
| `@ceo-sandbox/domain` | Mapping config Zod schema, assumption pack validation, input hash, check predicates, `finance` epistemic schema, sensitivity grid math, fixture parse. No MCP `fetch`. |
| `apps/web/lib/cfo-ai/` | MCP client (server token), smoke, `runFinancePath`, raw writer, fixture/recorded adapter. |
| `@ceo-sandbox/db` | `applyEpistemicSnapshot` after finance (same pattern as Crustdata). |
| `apps/web` | POST + health routes, `FinanceComparison` component on session page. |
| `config/cfo-ai-mapping.template.json` | Shared table/row targets and `mapsToAssumption` keys (no global `orgId`). |
| Session `intake.cfoWorkspace` | Per-company `orgId`, slug, bootstrap + scenario refs. |

---

## 4. Mapping contract (template + per-session)

Checked-in **template** binds (legacy `config/cfo-ai-mapping.json` migrates to template; drop hard-coded production `orgId`):

- **Scenarios:** `pilot` → `CEO sandbox - Pilot`, `broad_launch` → `CEO sandbox - Broad`.
- **Inputs table** `Feature decision inputs` rows → assumption keys (`build_cost`, `build_timeline_months`, `price_per_seat`, `adoption_rate` per scenario, `inference_cost_per_user`, `pilot_cohort_size` pilot-only).
- **Outputs table** `Feature decision outputs` rows → canonical metrics (`revenue`, `burn`, `runway`, `margin`). Unmapped Q29 slots remain `provided: false`.
- **Sensitivity** applies to Pilot on `pricePerSeatUsd` and `adoptionRatePercent`.

Operator/bootstrap procedure: `.docs/practical/cfo-ceo-sandbox-setup.md` **per org** after `org_id` exists. Set `session.cfoWorkspace.bootstrapStatus` to `"ready"` when labels match and compare smoke passes for that org.

---

## 5. Assumption pack (finance-ready)

**Required before MCP write (Q16, Q40):**

- Scenario kinds **pilot** and **broad_launch** each with `requiresFinance: true` and assumption refs.
- Mapped inputs: one-time build cost, build duration (months), price/ARPU, adoption % per scenario, rollout scope label; optional support/sales/COGS as $0 assumptions if N/A (Q23).
- SP-03 baseline passed through: cash, MRR, customer count, runway (months), budget cap, execution timeline — as Assumption claims, not silently overwritten (Q17).
- User-confirmed adoption and build/price when not fully at intake (Q18).
- Agent proposals allowed with `owner=agent` and visible on recap (Q19).
- Every numeric sent to cfo or shown cites Assumption id (Q26).
- Point estimate required; sensitivity uses low/base/high (Q27, Q34).

**Panel-derived adoption (Q20):** optional `derivedFrom` on adoption assumptions; default proposal = conservative minimum segment rate among represented segments; never auto overall unweighted share without approval.

**Block MCP write when:** pack invalid, unresolved SP-04 conflicts, missing build cost or adoption for either scenario, or panel bridge without explicit Assumption + approval.

---

## 6. MCP operations (live path)

Representative tools (Q04): `list_orgs`, `inspect_scenarios`, `inspect_table_blocks` (with **compare**), `edit_table_blocks`, `edit_history` (undo on failure optional).

**Per scenario:** map approved assumptions → `edit_table_blocks` cell updates on input rows.

**Compare:** `inspect_table_blocks` with compare across Pilot and Broad on **Feature decision outputs**; parse row values into `FinancialMappedMetrics` per scenario.

**Sensitivity (nice-to-have in scope per SP-01):** For Pilot only, for each of price and adoption: low/base/high (base = approved pack; defaults ±20% price; adoption ×0.7/×1.3 clamped [0,100] unless `rangeMin`/`rangeMax` on assumption). Each point = input write + compare read. Orchestrator counts each MCP tool invocation toward 20 (Q14).

**Optional derived check (Q06):** When runway unmapped, if cash and monthly burn exist as user assumptions, compute `runway_derived = cash / monthly_burn` labeled **Derived check (not cfo.ai output)** — never replaces compare column.

---

## 7. Copy and labels

| Surface | Copy |
|---------|------|
| Finance section / export | **Modeled — cfo.ai workspace (not a verified forecast).** Include `Pilot` / `Broad`, `financeRunId`, timestamp (Q09). |
| Storage enum | `EpistemicKind.Inferred` on mapped metrics (SP-02). |
| Baseline row | **Current runway (your input)** etc. (Q39). |
| Fixture | **Recorded finance fixture — not live cfo.ai** (Q47). |
| Agent prose about finance | Inferred; must cite `financeRunId` + metric ids; never override displayed numbers (Q32). |

Add `CLAIM_SAFETY_COPY.financeModeled` with the Q09 sentence; keep existing `financeNotForecast` for generic illustrative wording elsewhere.

---

## 8. Operator gates

| Gate | Rule |
|------|------|
| Assumption pack approve (Q41) | `POST /api/sessions/:id/finance/approve-assumptions` (or reuse recap approve flag `financeAssumptionsApproved: true` on `epistemic_json`) **before** first MCP **write** in a Run. |
| Re-run (Q42) | Full mode: one additional finance phase after approved assumption change; increment `financePhase` 1→2. Demo: idempotent unless product later allows re-run. |

This pass: implement approve flag + POST finance rejects when false.

---

## 9. Deterministic checks (Q37–Q39)

**Mandatory:**

- Percent assumptions and mapped adoption in **[0, 100]**.
- Non-negative price and revenue where applicable; costs non-negative unless documented credits.
- **Input hash** sent to cfo matches approved assumption pack snapshot.
- If cash and monthly burn from user assumptions and intake runway present: warn when `|runway_derived − intake_runway| / intake_runway > 0.25`.

**On check failure:** warn + badge; do not hide non-null invalid values (Q38). Modeled runway and intake runway shown side by side; no silent overwrite (Q39).

---

## 10. `epistemic.finance` snapshot shape

Required fields (extend `epistemicSnapshotSchema`):

| Field | Meaning |
|-------|---------|
| `status` | `idle` \| `deferred` \| `complete` \| `incomplete` \| `fallback` \| `unavailable` \| `failed` |
| `source` | `live` \| `fixture` \| `recorded` |
| `financeRunId` | Stable id per run |
| `ranAt` | ISO datetime |
| `mcpCallCount` | Integer ≤ 20 |
| `mappingSetupStatus` | Echo from config |
| `financeAssumptionsApproved` | Boolean gate |
| `assumptionPackHash` | Hash of mapped inputs sent |
| `baseline` | `{ cashUsd?, mrrUsd?, runwayMonthsUserInput?, assumptionRefs[] }` |
| `compare` | `{ pilot: FinancialMappedMetrics, broad_launch: FinancialMappedMetrics }` |
| `sensitivity` | Optional grid + `topDrivers: [price, adoption]` ranked |
| `checks` | `{ code, severity: warn\|info, message }[]` |
| `rawPayloadRef` | Path under `data/cfo-raw/` |
| `error` | Short message when `failed` |

---

## 11. HTTP

| Method | Path | Effect |
|--------|------|--------|
| `POST` | `/api/sessions/:id/finance/approve-assumptions` | Sets `financeAssumptionsApproved: true` on frozen session. 409 if not frozen. |
| `POST` | `/api/sessions/:id/finance` | Run path. Body empty. 404 unknown; 409 not frozen or not approved; 200 snapshot. `failed` = validation bug; `fallback`/`unavailable` per §2. Idempotent when `status` is `complete` or `fallback`. |
| `GET` | `/api/health/cfoai` | `{ ok, live, detail, mappingReady }`. Live: Q45 smoke (`list_orgs`, scenarios include Pilot/Broad, compare read returns table). |

No browser calls to `api.cfo.ai`.

---

## 12. Environment

| Name | Meaning |
|------|---------|
| `CFO_LIVE` | `"1"` to attempt live MCP when mapping `ready`. |
| `CFO_MCP_ACCESS_TOKEN` | Server-only credential for `https://api.cfo.ai/mcp` (exact header format documented in plan from vendor docs). Gitignored `.env`. |

CI: no token → fixture path; health returns `ok: true, live: false`.

---

## 13. Agent interface (contract only this pass)

| Tool | Behavior |
|------|----------|
| `run_finance` | Wraps `runFinancePath`; enforces caps and approve gate (SP-10). |
| `get_finance_run` | Read-only latest `epistemic.finance` + raw ref. |

Forbidden: unlabeled adoption, missing build cost, raw MCP from recommendation model (Q40).

---

## 14. Demo proof (Q43)

Visible: Pilot vs Broad names, `financeRunId`, timestamp, Modeled table from compare, optional **Open in cfo.ai** link when `orgId` and page name known from mapping.

---

## 15. Testing

Vitest. Inject MCP client mock / fixture adapter. CI does not call `api.cfo.ai`.

**Domain:** pack validation rejects missing adoption; hash stable; checks fire on 25% runway tension; sensitivity grid defaults ±20% / ×0.7/×1.3; fixture parse matches `demo_run.json`.

**Route:** 409 frozen/approve; idempotent second POST; deferred mapping → no MCP mock calls; live path mock counts writes + compare; fallback banner when fixture used.

---

## 16. Out of scope

- SP-08 scorecard and recommendation refs.
- SP-10 orchestration, second finance phase in demo.
- SP-11 Neatlogs latency fields (log hooks stub ok).
- Open-ended model authoring in MCP hot path (Q v1 rule).
- Tax, non-USD, GAAP (Q25).
- Third cfo scenario (delay / no-build).

---

## 17. Traceability

| Source | Role |
|--------|------|
| `.docs/subproblems/07-cfo-ai-financial-evaluation.md` | Q01–Q47 |
| This spec §1 | Design-pass overrides (dual setup mode, server MCP) |
| `.docs/practical/cfo-workspace-provisioning.md` | Per-company org_id, MCP limits, wizard trigger |
| `.docs/practical/cfo-ceo-sandbox-setup.md` | Model bootstrap inside each org |
| `config/cfo-ai-mapping.json` (→ template) | Table/row binding |
| `fixtures/finance/demo_run.json` | Fallback artifact |
| `.docs/specs/SP-02-shared-domain-contracts.md` | `financialRunResultSchema`, Modeled display |
| `.docs/specs/SP-04-evidence-assumptions-uncertainty.md` | Assumption gate |
| `.docs/specs/SP-05-crustdata-market-research.md` | Pattern for path + health + fixture gate |
| [docs.cfo.ai MCP](https://docs.cfo.ai/integrations/mcp-server) | Auth and tool surface |
