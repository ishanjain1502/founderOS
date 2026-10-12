# SP-06 — Implementation spec (Synthetic market panel)

**Status:** Locked from `06-synthetic-market-panel.md` Q01–Q61 plus the clarifications in §1 (this design pass). Where §1 disagrees with a Q answer, §1 wins.  
**Depends on:** SP-01 (demo vs full), SP-02 (panel contracts, segment catalog, primary choice), SP-03 (frozen intake: feature, product summary, `targetMarketBehavior`, `panelSeed` on the demo card), SP-04 (Simulated label, no lone confidence score).  
**Produces:** One frozen-session panel path, a summary on `epistemic.panel`, raw rows on disk, and the session-page block. `runPanelPath` is the function SP-10 will call.  
**Does not produce:** CEO agent loop, Neatlogs, recommendation text, interactive follow-up questions, a market-mix weight control.

---

## 1. Clarifications (this pass — not silent defaults)

| Topic | Decision |
|--------|----------|
| **Build boundary** | Frozen-session path and the session page. No agent loop. No Neatlogs. No recommendation writer. |
| **Storage** | Summary on `epistemic.panel`. Rows in `data/panel/{sessionId}/{panelRunId}.json`. |
| **Headline** | Ten archetype segments: five-choice reaction and per-segment mean confidence. The overall mean confidence is supplemental on that same view. |
| **Each evaluation** | `pay_extra` \| `use_if_included` \| `try_not_pay` \| `ignore` \| `consider_switching`. `confidence` is a finite number from 0 to 100 inclusive. `objection` is 1–120 characters after trim. |
| **Dropped answers** | No closed objection enum. No reason text. No price range. No “what would change their mind.” |
| **Current user** | Code marks the integer nearest to `0.7 × N` profiles as current users. A `.5` tie rounds up. The model cannot change this flag or the archetype id. |
| **Profile source** | `market.targetMarketBehavior` is the text. Code assigns archetype and current-user first. The model fills the other profile fields. |
| **Profile calls** | Batches of 8, one batch at a time. The last batch may be smaller. |
| **Evaluation calls** | One call per remaining profile, at most 5 in flight. |
| **N** | Slider 10–1000 in demo and full. Starts at 10. |
| **Completion** | Segment gates only. Demo: at least 6 distinct segments and at least 4 segments with n ≥ 2. Full: at least 4 segments with n ≥ 2. The old minimum of 20 is dropped. |
| **Company size** | `smb` \| `mid` \| `enterprise`. |
| **Objections** | Up to 3 exact strings per segment, by frequency, then earliest profile id. |
| **Provider** | Command Code only. Model id `deepseek/deepseek-v4-flash`. Env `COMMANDCODE_API_KEY`. Scope-check `LLM_PROVIDER` is unchanged. |
| **Packaging** | Show `feature.packaging` when it is a non-empty string after trim. Otherwise show **packaging absent**. |

---

## 2. Product behavior

On the frozen session page the operator chooses N and runs a simulated panel. The panel is simulated buyers built from the intake market text. It is not a survey and not the seller’s user base.

The page headline is segment bars and per-segment confidence. The overall mean sits below that grid.

**Demo** uses the demo card `panelSeed` and does not live-call a second time. **Full** may re-run once with a new seed.

---

## 3. Assignment

N is an integer from 10 to 1000.

Catalog order:

1. `price_sensitive_smb`
2. `enterprise_buyer`
3. `power_user`
4. `loyal_existing`
5. `low_engagement`
6. `technical_evaluator`
7. `procurement_enterprise`
8. `early_adopter`
9. `conservative_buyer`
10. `competitor_loyal`

**Reserve.** The first 4 segments get 2 profiles each. In demo, the next 2 segments get 1 profile each. Full mode stops after the first 4.

**Remainder.** Profiles left after the reserve are dealt one at a time across all 10 segments, in catalog order, repeating until none remain.

Normative counts:

| Mode | N | Counts in catalog order |
|------|---|-------------------------|
| Demo | 10 | 2, 2, 2, 2, 1, 1, 0, 0, 0, 0 |
| Full | 10 | 3, 3, 2, 2, 0, 0, 0, 0, 0, 0 |

**Slot order.** Walk the segments that still have remaining slots, in catalog order, taking one slot each pass, and repeat. That order is slot index `0 .. N-1`.

**Current users.** `currentUserCount = round half up (0.7 × N)`. N = 10 → 7. N = 15 → 11. Slots `0 .. currentUserCount-1` have `usesProduct: true`. The rest are `false`.

**Profile id.** Four-digit zero-padded slot index, `"0000"` through `"0999"`. Earliest id is the lexicographically smallest id. Padding makes that the same as numeric order.

Demo N = 10 slot order and current-user flags:

| Id | Segment | usesProduct |
|----|---------|-------------|
| 0000 | price_sensitive_smb | true |
| 0001 | enterprise_buyer | true |
| 0002 | power_user | true |
| 0003 | loyal_existing | true |
| 0004 | low_engagement | true |
| 0005 | technical_evaluator | true |
| 0006 | price_sensitive_smb | true |
| 0007 | enterprise_buyer | false |
| 0008 | power_user | false |
| 0009 | loyal_existing | false |

The gate in §6 is judged on completed evaluations, not on this assignment. Dropped calls can leave a run incomplete.

---

## 4. Profile and evaluation schemas

Extend the SP-02 panel contracts. `contractVersion` stays `1`.

**Code-owned, restored after every fill response:** `primarySegment`, `usesProduct`.

**Model-owned profile fields:**

| Field | Rule |
|-------|------|
| `companySizeBand` | `smb` \| `mid` \| `enterprise` |
| `budgetSensitivity`, `painLevel`, `aiAdoptionComfort` | integers 1–5 |
| `workflowSummary` | 1–280 characters after trim |
| `switchingCost` | `low` \| `medium` \| `high` |
| `buyingAuthority` | `none` \| `influencer` \| `decider` |
| `primaryPurchasePriority` | `price` \| `features` \| `security` \| `ease` \| `support` |
| `industry`, `region` | optional. Empty or whitespace becomes omitted. |

**Evaluation fields:** `primaryChoice`, `confidence`, `objection` as in §1.

If `buyingAuthority` is `none` and `primaryChoice` is `pay_extra`, the evaluation is invalid. Code does not rewrite the choice.

Questionnaire version on every summary is the integer `1`.

---

## 5. Run pipeline

`runPanelPath` runs only for a frozen session that already has an epistemic snapshot. Demo seed is `String(demoCard.panelSeed)`. Full seed is `String(crypto.randomInt(0, 2_147_483_647))`.

**HTTP to the model.** `POST https://api.commandcode.ai/provider/v1/chat/completions`

Headers: `authorization: Bearer ${COMMANDCODE_API_KEY}`, `content-type: application/json`.

Body: `{ "model": "deepseek/deepseek-v4-flash", "messages": [system, user] }`.

Read `choices[0].message.content`. If it is wrapped in one ``` fence, strip that fence, then `JSON.parse`. Parse failure is an invalid try. Read usage from `usage.prompt_tokens`, `usage.completion_tokens`, and `usage.prompt_tokens_details.cached_tokens` when that last path is a number. Otherwise cache-read tokens are 0.

The key is never sent to the browser. A missing key does not call another provider.

**Stimulus**, same for every profile:

```text
Feature: {feature.title or "(no title)"}
Description: {feature.description}
Product: {company.productSummary}
```

When `feature.proposedPriceUsd` is a number, add:

```text
Price shown: {proposedPriceUsd} USD {proposedPricePeriod or "period absent"}
```

When the amount is absent, omit that line. Do not invent a price. The prompt does not include Crustdata rows, finance outputs, or competitor facts.

If `market.targetMarketBehavior` is missing, the fill prompt uses an empty string.

**Fill.** One batch at a time, 8 profiles, last batch smaller. The user message includes the stimulus, `targetMarketBehavior`, and each slot’s `profileId`, `primarySegment`, and `usesProduct`. The assistant content is a JSON array of objects with `profileId` and the model-owned fields. After parse, code writes the assigned segment and `usesProduct` back onto each row, then validates the other fields.

**Fill retries.** Retry the whole batch once. Profiles that are still invalid are refilled one at a time, up to 2 more times each. A profile that is still invalid is dropped and never evaluated.

**Evaluation.** Starts only after fill finishes. One call per remaining profile, at most 5 in flight. The user message includes that profile, the stimulus, and the archetype id. The assistant content is one JSON object: `primaryChoice`, `confidence`, `objection`. Each call is tried up to 3 times (first try plus 2 retries). A call that is still invalid is dropped.

---

## 6. Aggregation

Only completed evaluations count. Each completed evaluation has equal weight. `usesProduct` is not a weight.

**Rounding.** Percents and mean confidence are shown to one decimal. Halves of the second decimal round away from zero. Compare gaps, the 70% bar, and the strongest segment with unrounded ratios.

**Per segment with n ≥ 1.** Counts and percents for all five choices. A choice with no answers is 0. Mean confidence is the arithmetic mean of that segment’s confidence values.

**Overall.** One mean confidence and five choice percents across all completed evaluations. Label **unweighted overall**. This is not the mean of the segment means.

**20-point gap.** For any choice, if two segments’ unrounded percents differ by 20 or more, they are a polarized pair and the summary sets the disagreement line: **Overall share can hide segment disagreement.**

**Objections.** Up to 3 exact trimmed strings per segment, highest count first. Equal counts: the string whose earliest profile id is smaller ranks first. Each side of every polarized pair shows the first of those strings when the segment has at least one.

**n = 0.** Omitted from bars. Listed under **no simulated respondents** in catalog order. Assigned segments that finish with zero completions are on this list.

**n = 1.** Shown with badge **low n**. Excluded from the strongest-segment rule unless it is the only segment with completions.

**Strongest segment.** Among segments with n ≥ 5, the highest unrounded `(pay_extra + use_if_included) / n`. A tie uses catalog order. If none qualify, the field is omitted. Label **Inferred**. One archetype per profile, so this is never an intersection of two archetypes.

**Unanimity.** `lowDisagreement` is true when every completed evaluation has the same `primaryChoice`. The page adds: **The simulated panel showed unanimity.**

**70% bar.** `evaluationAttempts` counts evaluation calls that started. Fill drops are not attempts. Zero attempts is not a failed ratio. Otherwise the bar passes when `successes / evaluationAttempts >= 0.7`.

**Status** after aggregation, before the zero-completion fallback in §7:

| Status | When |
|--------|------|
| `complete` | 70% bar passes and the mode’s segment gates pass. |
| `incomplete` | 70% bar passes and a segment gate fails. Aggregates are stored. |
| `failed` | At least one evaluation attempt, and the 70% bar fails. Partial aggregates stay. |

---

## 7. Stop, cost, and fallback

The clock starts when `runPanelPath` starts. Before each new model call, check cost, then clock. The first check that fails sets `stopReason` and stops dispatch. Calls already in flight finish and can push the estimate past the cap.

| Mode | Wall clock | Dollar cap |
|------|------------|------------|
| Demo | 90 seconds | $2 |
| Full | 12 minutes | $15 |

Full mode’s page shows **This run is still going.** when the browser has been waiting 8 minutes and the POST has not returned. That timer is local to the click. There is no progress endpoint.

**Rates** are Command Code peak rates for this model, so off-peak runs stop early rather than exceed the cap at peak:

| Token class | USD per million |
|-------------|-----------------|
| Input, excluding cache-read | 0.30 |
| Output | 1.20 |
| Cache-read | 0.006 |

```text
estimatedUsd =
  (promptTokens - cacheReadTokens) * 0.30 / 1_000_000
  + cacheReadTokens * 0.006 / 1_000_000
  + completionTokens * 1.20 / 1_000_000
```

The summary stores `promptTokens`, `completionTokens`, `cacheReadTokens`, and `estimatedUsd`.

`stopReason` is `none`, `cost`, or `clock`.

**Copy when the path ends:**

| Case | Page text |
|------|-----------|
| `incomplete` and `stopReason` `none` | Raise N to finish the simulated panel. |
| `incomplete` and `clock` | Demo: The simulated panel stopped at 90 seconds. Full: The simulated panel stopped at 12 minutes. |
| `incomplete` and `cost` | Demo: The simulated panel stopped at $2. Full: The simulated panel stopped at $15. |
| `failed` | The simulated panel failed. |
| Zero completions, demo | Load `fixtures/panel/demo_run.json`. Status `fallback`. Banner **Recorded simulated panel (fixture)**. |
| Zero completions, full | Status `unavailable`. **The simulated panel is unavailable.** Do not load the fixture. |

A missing `COMMANDCODE_API_KEY` is the zero-completion case. If any evaluation completed, live rows are kept and the fixture is not applied. When `nCompleted` is 0, the §6 status is replaced by `fallback` (demo) or `unavailable` (full). When `nCompleted` is greater than 0 and the 70% bar failed, status stays `failed` and the fixture is not applied.

The fixture file validates as a panel summary plus rows, uses source `fixture`, includes at least 6 segments, and at least 4 of those have n ≥ 2. On demo fallback, generate a new `panelRunId` for this session, store the fixture summary under that id, and write the fixture rows to `data/panel/{sessionId}/{panelRunId}.json`.

---

## 8. Session page

Block on `/session/[sessionId]`, under the Crustdata block, only when the session is frozen.

First line, the only panel string that may contain “survey”:

**Simulated panel — not real customer interviews or survey data.**

Every metric on the block also shows **Simulated**.

Second line: **Simulated buyers; not your actual user base unless you imported segments.**

Every other string the block itself authors must not contain `survey`, `respondents said`, `market research`, or `customers said`. Objection text returned by the model is shown unchanged.

**Before a run.** Integer slider 10–1000, initial value 10. Button **Run simulated panel**.

**After a run.** Show the stored summary. Full mode, when `rerunCount` is 0, shows **Re-run**. That action sends `rerun: true` and then the control is gone. Demo does not show **Re-run**. A second demo request returns the stored run.

**Results, top to bottom.**

1. Rollup bar for the primary choice. One side is `enterprise_buyer` plus `power_user` (counts added, then percents). The other side is `price_sensitive_smb`. A side with n = 0 is omitted and listed under **no simulated respondents**.
2. Per-archetype bars for the five choices, the segment × choice percent table, and each segment’s mean confidence. This is the headline.
3. Up to 3 objection strings per segment, each marked Simulated, plus the polarized-pair strings from §6.
4. Unweighted overall choice percents and the overall mean confidence, under the grid. The disagreement line and the unanimity line appear when §6 set them.
5. Strongest segment, when present, labeled **Inferred**.

**Beside the results:** price line from §5, or **price absent**; packaging text or **packaging absent**; `panelSeed`; questionnaire version `1`; N requested and N completed; model id `deepseek/deepseek-v4-flash`; **70% of profiles were marked current users.** That note is not a weight.

---

## 9. HTTP and modules

`POST /api/sessions/:id/panel`. Node runtime. Body `{ "n": <integer>, "rerun": false }`. `rerun` defaults to false.

| Result | When |
|--------|------|
| 404 | Id is not a uuid, or the session does not exist. |
| 409 `{ "error": "not_frozen" }` | Session is not frozen. |
| 400 | First run, and `n` is missing or not an integer from 10 to 1000. |
| 500 | Frozen session has no epistemic snapshot, or the snapshot fails validation after the path. Do not write a failed snapshot over the previous one. |
| 200 | `sessionToJson`, including `epistemic.panel`. |

A stored panel whose status is `complete`, `incomplete`, `failed`, `fallback`, or `unavailable` is returned as-is, with no model call, unless `rerun` is true, the session mode is full, and `rerunCount` is 0. That one re-run uses a new seed and sets `rerunCount` to 1. Demo ignores `rerun`.

| Piece | Responsibility |
|-------|----------------|
| `@ceo-sandbox/domain` | Assignment, schemas, aggregation, summary schema, fixture parse. No `fetch`. |
| `apps/web/lib/panel` | Command Code client, fill, evaluation, `runPanelPath`, raw-file writer. |
| `@ceo-sandbox/db` | Existing `applyEpistemicSnapshot`. It does not unfreeze the session. |
| `apps/web/components/session/SyntheticPanel.tsx` | Slider, button, results. |
| `apps/web/app/api/sessions/[id]/panel/route.ts` | POST. |
| `apps/web/app/session/[sessionId]/page.tsx` | Mount the block under Crustdata. |

`epistemic.panel` is optional on the snapshot so existing rows still parse. It is a sibling of `marketResearch`. Fields: `status`, `source` (`live` \| `fixture`), `panelRunId`, `panelSeed`, `modelId`, `questionnaireVersion`, `nRequested`, `nCompleted`, `evaluationAttempts`, `stopReason`, `lowDisagreement`, `priceShown` (`{ usd, period }` or null), `packaging` (string or null), `currentUserCount`, token totals, `estimatedUsd`, per-segment counts, percents, mean confidence, top objections, `noSimulatedRespondents`, overall block, `disagreement`, `strongestSegment` (omitted when none), polarized pairs, `rerunCount`.

Raw file: `data/panel/{sessionId}/{panelRunId}.json` with `contractVersion: 1`, the run id, the session id, every profile (`fillStatus` `ok` or `dropped`), and every evaluation or evaluation drop. `data/` stays gitignored.

---

## 10. Testing

Vitest. Tests inject `fetch`. CI does not call `api.commandcode.ai`. No Playwright in this pass. After implementation, browser-check the frozen demo page: slider starts at 10, run with the fake or fixture path, banner and segment grid render, a second click does not start another live call.

**Domain**

- Demo N = 10 and full N = 10 match the count tables and the demo current-user table in §3. N = 15 marks 11 current users.
- A fill object that changes segment or `usesProduct` is overwritten before validation.
- `1/80` of a segment renders as `1.3`. Mean confidence uses the same rounding.
- Objection ties break by earliest profile id.
- A 20-point unrounded gap sets a polarized pair and the disagreement flag.
- `lowDisagreement` is true only when every completed choice matches.
- Strongest segment ignores n = 1 unless it is the only segment. It is omitted when no segment has n ≥ 5.
- Status follows the 70% bar and the segment gates. `7/10` passes the bar. `2/3` fails it.
- Cost uses the peak rates. Cache-read tokens use `0.006`. Missing cache detail bills every prompt token at `0.30`.

**Route**

- 409 when not frozen. 400 when `n` is outside 10–1000.
- A finished run is returned with no second model call.
- Full mode accepts one `rerun: true`. Demo ignores `rerun`.
- Missing key, or zero completions: demo stores the fixture; full stores `unavailable`.
- One completed evaluation is kept and is not replaced by the fixture.
- Authored panel strings other than the required first line do not contain `survey`, `respondents said`, `market research`, or `customers said`.

---

## 11. Out of scope

- SP-10 agent trigger, prompt truncation, and the five-sample-row view. The raw file is the source those can read later.
- Neatlogs spans and cost export (SP-11).
- Recommendation copy (SP-08).
- Interactive follow-up questions.
- A user-edited market-mix weight. The 70% flag is not a weight.
- Fictional names.
- Closed `main_objection` enum, reason, price-range answer, and “what would change their mind.”
- Sending `panelSeed` as a sampling parameter.
- Changing scope-check to Command Code.

---

## 12. Traceability

| Source | Role |
|--------|------|
| `.docs/subproblems/06-synthetic-market-panel.md` | Q01–Q61 |
| This spec §1 | Design-pass overrides |
| [Command Code provider API](https://commandcode.ai/docs/provider) | Chat completions URL and Bearer auth |
| [DeepSeek V4 Flash on Command Code](https://commandcode.ai/models/deepseek-v4-flash) | Model id and peak rates in §7 |
| `.docs/specs/SP-02-shared-domain-contracts.md` | Segment catalog, primary choice, panel objects |
| `.docs/specs/SP-03-decision-intake-and-company-context.md` | Intake fields, demo card `panelSeed` |
| `fixtures/demo/decision-card-ai-analytics.json` | Demo `panelSeed` |
