# Practical: cfo.ai CEO sandbox (Pilot vs Broad)

**Policy:** Run this bootstrap **inside each company’s cfo.ai workspace** after provisioning ([cfo-workspace-provisioning.md](./cfo-workspace-provisioning.md)). One workspace per company; wizard start assigns `org_id` to the session/user. Tables use the **shared template** row names; formulas stay the minimal CEO Sandbox feature-decision model unless the company later connects real data in cfo.

## Current state (repo + workspace)

| Item | Status |
|------|--------|
| MCP in Cursor | `.cursor/mcp.json` → `https://api.cfo.ai/mcp` |
| Scenarios | **CEO sandbox - Pilot**, **CEO sandbox - Broad** (children of Main) |
| Pages / tables | **Not built yet** — workspace had zero pages when scenarios were created |
| Mapping contract | `config/cfo-ai-mapping.json` (names must match tables you create below) |
| Demo intake | `fixtures/demo/decision-card-ai-analytics.json` |

## What Pilot vs Broad mean in the demo card

See `fixtures/demo/decision-card-ai-analytics.json`:

- **Pilot** — 10 enterprise accounts, 8 weeks, explicit success/fail criteria; lower adoption % on a small cohort.
- **Broad** — GA to all 1,000 customers; higher adoption %; higher build cost and longer timeline.

Finance compares **only those two** in cfo.ai. Delay / do-not-build / enterprise-only GA are qualitative rows in the app (SP-08).

## One-time: build the minimal model in cfo.ai

Do this in **[app.cfo.ai](https://app.cfo.ai)** (Ari chat) or via MCP with the `build-model` skill. Paste:

```text
Build a minimal SaaS feature decision model for our hackathon sandbox.

Page name: CEO Sandbox

Table 1 name: Feature decision inputs
Rows (variables we will set from our app):
- One-time build cost (USD)
- Build duration (months)
- Price per seat / month (USD)
- Adoption rate (%)
- Variable COGS per active user / month (USD)
- Pilot cohort size (accounts) — used only in scenario "CEO sandbox - Pilot"

Table 2 name: Feature decision outputs
Rows (formulas driven by inputs + baseline — keep simple):
- Incremental MRR
- Incremental monthly burn
- Runway (months)
- Gross margin (%)

Use scenarios:
- "CEO sandbox - Pilot" — smaller adoption, use pilot cohort size
- "CEO sandbox - Broad" — full customer base adoption assumption

Keep formulas transparent. Monthly calendar already in workspace (2026–2027).
```

After Ari builds it:

1. Open **CEO Sandbox** page and confirm both table names match `config/cfo-ai-mapping.json`.
2. Run **compare** across **CEO sandbox - Pilot** vs **CEO sandbox - Broad** in the UI once manually.
3. Set `setupStatus` in `config/cfo-ai-mapping.json` to `"ready"`.
4. If row names differ, update `config/cfo-ai-mapping.json` to match exact cfo.ai labels.

## Smoke test (SP-07-Q45)

From Cursor (MCP connected):

1. `list_orgs`
2. `inspect_scenarios` → lists Pilot and Broad
3. `inspect_table_blocks` read on **Feature decision outputs** with compare for both scenarios

Fail → finance step uses labeled fixture (`fixtures/finance/demo_run.json` when added).

## Wiring assumptions (runtime)

For each Decision run, after operator approves assumption pack:

| App assumption | Pilot example (demo card) | Broad example (demo card) |
|----------------|---------------------------|---------------------------|
| `build_cost` | $180k | $220k |
| `build_timeline_months` | 3 | 4 |
| `price_per_seat` | $25 | $25 |
| `adoption_rate` | 8% | 18% |
| `pilot_cohort_size` | 10 | (ignored or N/A) |
| `inference_cost_per_user` | $4 | $4 |

MCP flow: write cells per scenario → compare outputs → map to `financeRunId`.

## Panel → adoption (optional)

If panel suggests adoption, create Assumption with `derivedFrom` panel refs; operator approves. Demo card numbers above are **illustrative** defaults, not panel output.
