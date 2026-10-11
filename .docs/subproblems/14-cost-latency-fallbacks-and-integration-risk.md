# SP-14 — Cost, latency, fallbacks, and integration risk

## Why this is a subproblem

Section 10 is a risk table. Several risks are not features; they are operating constraints that, if unanswered, they will be decided accidentally on demo day:

- Synthetic customers sound real → labeling (also SP-04, SP-06, SP-13).
- Crustdata mistaken for demand → epistemic rules (SP-04, SP-05).
- Finance looks too certain → ranges/labels (SP-04, SP-07).
- Required products feel bolted on → each must have a visible job (SP-13).
- Integrations take too long → smoke-test all four at the beginning; labeled fallbacks.
- Too many agent calls → batching, bounded samples, structured outputs, deterministic aggregation.
- Branching attributed to the wrong tool → SP-09 vs SP-12.

This subproblem collects **envelopes and backups**: money, time, what “labeled fallback” means, what we smoke-test, and what we do when a vendor is empty or late.

## Discussion

“To the very end” for a hackathon integration is not only the happy path. It is smoke tests, caps, honest fallbacks, gap policy, and bolted-on prevention.

Align with **SP-01-Q08** (labeled vendor fallback via **structured LLM gap-fill or fixture** — **never** impersonate Crustdata/cfo numbers; **Neatlogs exception**), **SP-05** (Crustdata phase limits + `fixtures/crustdata/`), **SP-06** (demo **N=60**, batched panel, `fixtures/panel/`), **SP-07** (`fixtures/finance/demo_run.json`, finance continues with gap), **SP-10** (**authoritative Run caps** + **`SKIP_CODE_IMPACT`** default **true**), **SP-11** (local JSONL audit if Neatlogs down), **SP-12** (Track B clone caps: **500 MB** repo, **24h** sandbox TTL), **SP-13** (amber **Fixture** badges; no mid-run unlabeled swap).

**v1 policy:** orchestrator **kills** overrun stages; Run may end **`completed_with_gaps`** when publish still valid. **“Clearly labeled”** = **audience-visible** badge on every affected widget **and** `dataSource` field in artifacts **and** Neatlogs span attribute `fallback=true` when ingest works.

## What “implemented to the end” would require

1. Numeric or qualitative budgets: time per beat, time per Run, money per Run, max calls.
2. A smoke-test checklist for Crustdata, cfo.ai, Neatlogs, Entire, plus LLM provider if used.
3. Per-vendor fallback artifact and label copy.
4. Gap policy: recommend with missing legs or not.
5. Caching/replay policy that cannot be mistaken for live.
6. Load strategy for the demo machine (warm caches vs cold start).
7. Ranked failure modes for demo day.
8. A “bolted on” review: each product’s visible contribution in the happy path and in fallback.

## Locked decisions (spec only)

- Smoke-test all four products at the beginning; keep fallbacks clearly labeled (section 10).
- Bound samples; batch; structured outputs; deterministic aggregation to control cost/latency (section 10).
- Panel around 100–1,000 **if cost and latency permit**; quality over raw count (section 3).
- Not 100,000 expensive LLM calls in the demo (section 8).
- Each product’s contribution should be visible (section 10).
- Make uncertainty explicit rather than hiding behind a fast polished answer (sections 11–12).

## Dependencies

- Constrains SP-05, SP-06, SP-07, SP-10, SP-11, SP-12, SP-13.
- Must be consistent with SP-01 success definition when a vendor is down.

## Questions

### Budgets

**SP-14-Q01.** What is the maximum wall-clock time for a full Run in the demo, excluding presenter talk?
**Target ≤8 min** investigation Run (beats 2–5 + publish); **hard kill 12 min** (SP-10-Q18). **Revision Run target ≤4 min**, hard **6 min**. Presenter narration and assumption-gate clicks **excluded** from Run timer.

**SP-14-Q02.** What is the maximum wall-clock time per stage (research, panel, finance, recommend, revision)?
| Stage | Demo soft max | Hard kill |
| --- | --- | --- |
| `research` (+ Crustdata phase) | **60s** | **90s** |
| `hypotheses` | **45s** | **60s** |
| `code_impact` | **0s** if `SKIP_CODE_IMPACT=true` (stage event only); else **60s** soft / **90s** hard | **90s** |
| `panel` | **90s** (SP-06-Q35) | **120s** |
| `assumption_gate` | *(operator — not in Run clock)* | — |
| `finance` | **90s** (SP-07) | **120s** |
| `compare` | **30s** | **45s** |
| `recommend` | **90s** | **120s** |
| Revision pipeline (SP-09-Q21) | **180s** total | **360s** |

**SP-14-Q03.** What is the maximum USD (or other currency) per demo rehearsal and per live demo?
**Per Run:** **~$3 soft budget** (SP-10-Q19) — log and warn. **Per live demo session** (incl. revision): **≤$15** all-in (LLM + Crustdata credits + cfo plan). **Per rehearsal:** same caps; use fixtures when iterating to save credits.

**SP-14-Q04.** What is the maximum USD for the whole hackathon on each vendor and on the LLM?
**Team envelopes (adjust if sponsor credits):** LLM **$75**, Crustdata **$40** credits, cfo.ai **plan quota** (no extra spend target), Neatlogs/Entire **free tier**. Stop Full-mode N=1000 experiments when LLM envelope **80%** consumed.

**SP-14-Q05.** Who pays, and how are keys quota-limited?
**Team/hackathon sponsors** pay. Keys in **AWS Secrets Manager** (prod) + local **`.env`** (dev, gitignored). Server-only — never shipped to browser. Optional env **`DEMO_MODE=1`** disables costly paths (caps N, blocks >1000 panel).

**SP-14-Q06.** What is the maximum LLM calls in the live demo Run (and in the revision Run)?
**Investigation Run: ≤25** LLM HTTP calls (panel batches included) (SP-10-Q16). **Revision Run: ≤12** LLM calls (lighter pipeline). Orchestration/meta LLM **≤8** per investigation Run.

**SP-14-Q07.** What is the maximum Crustdata calls? cfo.ai calls?
**Crustdata: ≤5** HTTP/MCP calls per investigation Run (SP-10-Q17); research phase also respects SP-05 **30s** wall and **5 companies** mapped. **cfo.ai: ≤20** MCP tool calls per finance phase, **≤2** phases per Run.

**SP-14-Q08.** If a stage exceeds its time budget, kill, background, or skip?
**Kill the stage** at hard max → orchestrator marks stage `failed` or `timeout`. **No background continue** in demo. **Skip-with-gap** only when policy allows (e.g. Crustdata empty → continue with `missingData.crustdata`). Panel/finance timeout → offer **labeled fixture** retry once (operator confirm) or Run `failed` / `completed_with_gaps` per SP-10-Q21.

### Panel N vs clock

**SP-14-Q09.** Given SP-06-Q07, what happens if that N cannot finish inside SP-14-Q02? Shrink N, switch to fixture, or overrun?
**Demo (N=60):** must finish in **90s** — reduce **concurrency** first, then **batch size** tuning; if still over at **75s**, **abort panel** → offer **`fixtures/panel/demo_run.json`** (operator confirm, **Fixture** badge). **Do not** silently shrink N mid-run. **Full mode:** user may lower N or accept overrun up to **120s** hard cap.

**SP-14-Q10.** Is there a “demo N” vs “offline N” vs “marketing N”?
**Demo N = 60** (fixed seed). **Full default N = 200**, slider to **1000**. **Marketing copy** may cite “up to 1,000 simulated respondents” but **live demo never runs 1000** without explicit judge request + cost confirm.

**SP-14-Q11.** Are we allowed to precompute the panel before the demo and replay it live if labeled?
**Yes for rehearsal/CI** and **emergency** — replay **`fixtures/panel/demo_run.json`** with badge **“Recorded simulated panel (fixture)”**. **Preferred hackathon path:** **live** batched panel at N=60. Pre-run warmup allowed; presenting replay as live **forbidden**.

**SP-14-Q12.** Are we allowed to precompute Crustdata or cfo.ai similarly?
**Yes** — checked-in or gitignored **recorded** responses (`fixtures/crustdata/*`, `fixtures/finance/demo_run.json`) for dev/CI/emergency. **Session cache** (24h, SP-05-Q14) may serve stale data only with **Cached** badge if replayed in UI. Live demo default: **live** when health green.

### Smoke tests

**SP-14-Q13.** When do smoke tests run: project start, CI, daily, demo morning, every app boot, every Run?
| When | What |
| --- | --- |
| **Every app boot** (server) | Integration health check (lightweight) |
| **CI** on PR | Fixture-only smoke (no vendor keys required) |
| **Demo morning** | Full live smoke all five integrations |
| **Before “Start investigation”** (demo mode) | Re-run **Crustdata + cfo + LLM + Neatlogs** quick probe |
| **Each Run** | No full smoke — only stage-level timeouts |

**SP-14-Q14.** What is the pass/fail criterion for each of: Crustdata, cfo.ai, Neatlogs, Entire, LLM?
| Integration | Pass |
| --- | --- |
| **Crustdata** | SP-05-Q42: credits + `company_search` limit 1 ok (or identify) |
| **cfo.ai** | SP-07-Q46 pattern: `list_orgs` + CEO sandbox scenarios present + read compare target |
| **Neatlogs** | SP-11-Q35: `doctor --probe` or test trace visible in dashboard |
| **Entire** | `.entire/settings.json` enabled + `git-refs` checkpoint list non-empty **or** hook heartbeat in dev (see SP-12) |
| **LLM** | Minimal chat completion / token echo under 10s |

**SP-14-Q15.** Who is responsible for running them, and what is the report format?
**Operator** before demo; **CI** automated. Report: **in-app health strip** (green/amber/red per integration) + **`logs/smoke-{ISO}.json`** summary committed only if sanitized. Failed probe sets **`integrationStatus`** on Session.

**SP-14-Q16.** If a smoke test fails the morning of the demo, what is the go/no-go rule?
| Failed | Go/no-go |
| --- | --- |
| **LLM** | **No-go** for live agent — fix keys or switch provider |
| **Crustdata** | **Go** with **fixture fallback** labeled; say so in opener |
| **cfo.ai** | **Go** with finance **gap/fixture** (SP-07); mapping deferred already common |
| **Neatlogs** | **Go** — local audit fallback (SP-11) |
| **Entire** | **Go** — README + git log fallback (SP-13 beat 7 cut ok) |

### Fallbacks

**SP-14-Q17.** For Crustdata down: exact fallback artifact and on-screen label.
**Artifact:** `fixtures/crustdata/demo_search.json` **or** LLM-generated **Evidence** JSON with `source=fallback`, keys `fallback:crustdata:{runId}` (SP-05-Q36). **Label:** amber badge **“Fallback market context (not Crustdata)”** on evidence section. Recommendation allowed with **ungrounded market** flags.

**SP-14-Q18.** For synthetic panel too slow/expensive: exact fallback and label.
**Artifact:** `fixtures/panel/demo_run.json` or rule-based **`fallback_panel`** (SP-06-Q29). **Label:** **“Recorded simulated panel (fixture)”** or **“Rule-based panel fallback (not live LLM)”**. Section keeps **Simulated** chips.

**SP-14-Q19.** For cfo.ai down: exact fallback and label.
**Artifact:** `fixtures/finance/demo_run.json`. **Label:** **“Modeled economics unavailable — recorded cfo.ai fixture”** or **“Finance skipped (workspace mapping deferred)”** when `run_finance` returns `skipped`. Comparison table shows **gap** columns (SP-08).

**SP-14-Q20.** For Neatlogs down: exact fallback and label.
**Artifact:** `data/audit/{runId}.jsonl` (SP-11-Q30). **Label:** **“Local audit only — Neatlogs unavailable”** on stage rail + health strip. **No** LLM fake trace.

**SP-14-Q21.** For Entire down: exact fallback and label.
**Artifact:** `git log -5` screenshot or committed **`fixtures/demo/entire-checkpoint-screenshot.png`** + README **Entire** section. **Label:** **“Development history (Entire) — offline demo”**. Not a Run blocker.

**SP-14-Q22.** For LLM down: exact fallback and label.
**No vendor impersonation.** Stage **fails** after retries/alternate provider. **Panel:** optional **`fallback_panel`** rules (Q18). **Recommendation prose:** deterministic template from scorecard fields only, badge **“Template narrative (LLM unavailable)”** — publish only if validator passes. **Crustdata/cfo** never filled by LLM (SP-01-Q08).

**SP-14-Q23.** May fallback artifacts impersonate vendor UI chrome (logos) if labeled “replay”?
**No vendor UI impersonation.** Small **text attribution** (“Data from Crustdata”) allowed on **live** only. Fixtures use **plain “Fixture replay”** styling — no fake Crustdata/cfo dashboards.

**SP-14-Q24.** If two vendors are down, do we still demo?
**Yes** if **LLM up** OR template fallback can publish. **No** if **LLM + both** Crustdata and panel paths fail without fixture consent. **cfo + Neatlogs** down together is still **go** (common). Presenter states which legs are fixture/skipped.

**SP-14-Q25.** If fallback is used, may we still say the product is “integrated,” or must we say “integration failed, showing labeled fixture”?
**Say:** **“Integrated; this run used a labeled fixture because live {vendor} was unavailable.”** Do **not** claim live vendor data for that section. Health strip shows per-integration **Live / Fixture / Skipped**.

### Caching and replay

**SP-14-Q26.** Is caching of vendor responses allowed in production/demo?
**Yes — session-scoped** in-memory/DB cache, **TTL 24h** (SP-05), keyed by canonical request hash. **Not** a cross-tenant shared cache in v1.

**SP-14-Q27.** How is a cached/replayed result marked in UI and in Neatlogs?
**UI:** badge **Live** | **Cached** | **Fixture replay** (SP-13-Q31). **Artifact field:** `dataSource: live|cache|fixture|fallback`. **Neatlogs:** span attribute `dataSource` + `fallback=true` when not live.

**SP-14-Q28.** TTL? Manual pin of a known-good fixture?
**Cache TTL 24h** default; **`CACHE_TTL_HOURS`** env override. **Pinned fixtures** in git for demo card paths (`fixtures/demo/*`, `fixtures/finance/demo_run.json`) — refresh manually after vendor schema change.

**SP-14-Q29.** Are fixtures stored in git? Do they contain vendor data that terms forbid committing?
**Git:** demo decision card, finance demo_run, panel regression **sanitized** snapshots. **Crustdata raw:** prefer **gitignore** `fixtures/crustdata/*.raw.json`; commit only **redacted** samples. Document in README **data handling**. Never commit API keys.

### Bolted-on prevention

**SP-14-Q30.** What visible moment proves Crustdata was necessary to the recommendation (not just a sidebar)?
**Recommendation bullets or comparison row cite ≥1 `evidenceId` from Crustdata** with **Observed** chip; scorecard includes **market evidence** dimension; presenter expands **Evidence** section before decision beat. If fallback, explicit **“market section ungrounded”** — still visible, not hidden.

**SP-14-Q31.** Same question for the panel.
**Comparison table includes segment disagreement row** driven by **panelRunId**; recommendation prose references **Simulated** segment stats (not sidebar-only). Validator requires panel ref if panel stage ran.

**SP-14-Q32.** Same question for cfo.ai.
**Pilot vs Broad Modeled columns** in mandatory comparison table **or** explicit **finance gap** row explaining why economics could not justify broad launch (SP-08). Attribution footer on finance section.

**SP-14-Q33.** Same question for Neatlogs.
**“Open in Neatlogs”** after Run; demo shows **trace tree** with research/panel/finance spans (SP-11-Q25). Fallback: local audit download link — still a visible observability beat.

**SP-14-Q34.** Same question for Entire.
**Presenter shows git-refs checkpoint / Entire UI** tied to **building this repo**, narrated as dev history (SP-13-Q17). Minimum: README + one checkpoint screenshot proving hooks used.

**SP-14-Q35.** If a product cannot be made causally necessary in 3–5 minutes, do we cut it from the spoken pitch even if must-have lists it?
**Do not remove from must-have list** — **shorten beat** (Entire/Neatlogs) per SP-13-Q19 but still **name** the product. Never claim a product contributed when that leg was skipped without saying **skipped/fixture**.

### Ranking demo-day failures

**SP-14-Q36.** Rank these from “still success” to “abort demo”: missing labels; Crustdata fixture; panel fixture; cfo.ai fixture; Neatlogs unreachable; Entire unreachable; agent recommends different path than the script; agent emits a forbidden claim; overrun time; total crash.
**Still success (best → ok):** (1) agent recommends **different path** than spec example (SP-01-Q21). (2) **Neatlogs unreachable** (local audit). (3) **Entire unreachable**. (4) **cfo.ai fixture / gap**. (5) **Crustdata fixture** labeled. (6) **panel fixture** labeled. (7) **overrun time** but partial publish with gaps.  
**Degraded / fix before judging:** (8) **missing labels** on any shown number.  
**Abort / do not present as success:** (9) **forbidden claim** published without fix. (10) **total crash** / no recommendation.

**SP-14-Q37.** What is the one failure you will not tolerate even if everything else works?
**Invented or mislabeled numbers presented as Observed/Modeled vendor facts** (SP-01-Q11) — includes silent fixture, LLM impersonating Crustdata/cfo, or missing **Simulated/Modeled** labels on UI/export.

### Security and keys (cross-cutting)

**SP-14-Q38.** How are secrets provided at runtime (.env, OS keychain, demo-day paste, something else)?
**Server:** `.env` locally; **AWS Secrets Manager** (or ECS task secrets) in hosted demo. **Never** in client bundle or export JSON. **Demo-day paste** into server env only, not shared screen.

**SP-14-Q39.** Are secrets allowed in logs, Neatlogs, screenshots, recordings?
**No.** Redact in logs/Neatlogs (SP-11); blur keys in recordings; smoke JSON sanitized.

**SP-14-Q40.** Is there a data-handling rule for Crustdata/cfo.ai payloads on disk?
**Store under `data/blobs/{id}`** on server (SP-09); **gitignore** `data/` and raw vendor dumps. Export **links ids only**. Follow vendor ToS — no public republishing of full cfo export.

**SP-14-Q41.** Network allowlist for the demo machine?
**Egress allow:** Crustdata API/MCP, `api.cfo.ai` / MCP, `ingest.neatlogs.com`, `app.neatlogs.com`, LLM provider endpoints, AWS service endpoints for hosting. **Deny** general web browse from agent (SP-10-Q28). Entire/git via normal dev network.

### Batching and structure

**SP-14-Q42.** Which calls must be batched (panel respondents, Crustdata profiles, finance scenarios)?
**Required batching:** panel evaluations **8–12 profiles/LLM call** (SP-06). **Crustdata:** batch enrich where possible within call cap. **Finance:** single `run_finance` phase batches MCP writes/reads — no per-cell MCP in hot path. **Hypotheses + recommend:** one LLM call each unless retry.

**SP-14-Q43.** What is the maximum payload size we will send to an LLM in one call?
**~100k tokens input budget** per call (model-dependent); hard cap **120k tokens** estimated via tokenizer. **Panel batch** must fit with stimulus; shrink batch size before truncating stimulus text.

**SP-14-Q44.** Who implements truncation, and is truncated context marked so the agent cannot over-claim on unseen evidence?
**Orchestrator `packetBuilder`** truncates with manifest **`truncatedFields[]`** + **`packetRef`** to full blob in DB (SP-10-Q31). LLM packets include header **“Truncated — do not cite omitted ids.”** Publish validator rejects citations to truncated-only ids unless marked Assumed.
