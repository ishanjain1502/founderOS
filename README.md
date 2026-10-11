# idea-simulation

Autonomous CEO Decision Sandbox monorepo.

## Documentation

- [SP-01 scope, success criteria, and non-goals](.docs/specs/SP-01-scope-success-nongoals.md)
- [SP-01 implementation plan](docs/superpowers/plans/2026-10-11-sp01-scope-foundation.md)
- [SP-02 shared domain contracts (spec)](.docs/specs/SP-02-shared-domain-contracts.md)
- [SP-02 implementation plan](docs/superpowers/plans/2026-10-11-sp02-domain-contracts.md)
- [Subproblem index](.docs/subproblems/00-index.md)
- [Project initialization](.docs/init.md)

## Environment

Copy environment variables locally as needed. **`.env` files are not committed** to the repository.

## Development

```bash
pnpm install
pnpm test
pnpm --filter @ceo-sandbox/web dev
```
