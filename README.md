# idea-simulation

Autonomous CEO Decision Sandbox monorepo.

## Documentation

- [SP-01 scope, success criteria, and non-goals](.docs/specs/SP-01-scope-success-nongoals.md)
- [SP-01 implementation plan](docs/superpowers/plans/2026-10-11-sp01-scope-foundation.md)
- [SP-02 shared domain contracts (spec)](.docs/specs/SP-02-shared-domain-contracts.md)
- [SP-02 implementation plan](docs/superpowers/plans/2026-10-11-sp02-domain-contracts.md)
- [SP-03 decision intake and company context (spec)](.docs/specs/SP-03-decision-intake-and-company-context.md)
- [SP-03 implementation plan](docs/superpowers/plans/2026-10-11-sp03-intake-and-company-context.md)
- [SP-04 evidence, assumptions, and uncertainty (spec)](.docs/specs/SP-04-evidence-assumptions-uncertainty.md)
- [SP-04 implementation plan](docs/superpowers/plans/2026-10-12-sp04-evidence-assumptions-uncertainty.md)
- [SP-05 Crustdata market research (spec)](.docs/specs/SP-05-crustdata-market-research.md)
- [SP-05 implementation plan](docs/superpowers/plans/2026-10-12-sp05-crustdata-market-research.md)
- [Subproblem index](.docs/subproblems/00-index.md)
- [Project initialization](.docs/init.md)

## Environment

Copy environment variables locally as needed. **`.env` files are not committed** to the repository.

Optional (server-side only; used for intake scope-check when configured):

| Variable | Purpose |
|----------|---------|
| `SANDBOX_SQLITE_PATH` | Override path to the session SQLite file (default: repo `data/sandbox.sqlite`) |
| `LLM_PROVIDER` | `openai` or `anthropic` |
| `LLM_MODEL` | Model id for the chosen provider |
| `OPENAI_API_KEY` | Required when `LLM_PROVIDER=openai` |
| `ANTHROPIC_API_KEY` | Required when `LLM_PROVIDER=anthropic` |

If LLM env vars are missing, scope-check returns “LLM not configured” without calling the network.

Optional (server-side only; Crustdata market research — **never commit key values**):

| Variable | Purpose |
|----------|---------|
| `CRUSTDATA_API_KEY` | Bearer token for Crustdata REST (`authorization: Bearer …`); server routes only |
| `CRUSTDATA_LIVE` | Set to `1` together with `CRUSTDATA_API_KEY` to use live Crustdata REST; otherwise fixtures / recorded responses |

## Development

Session state is stored in **`data/sandbox.sqlite`** at the monorepo root (created on first use). The `data/` directory is **gitignored**; clone a fresh repo and run the app or tests to create the file locally.

```bash
pnpm install
pnpm test
pnpm --filter @ceo-sandbox/web dev
```
