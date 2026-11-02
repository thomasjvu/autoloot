# Repository layout

All documentation sources live in `docs/`:

- `user/content/`: setup, buyer/seller workflows and integrations.
- `dev/content/`: architecture, APIs, deployment, recovery, audits and production notes.
- `dev/design.md`: canonical design specification.
- `theme/`: shared theme, fonts and license notices.
- `.papers/user/` and `.papers/dev/`: ignored framework runtimes and build output.

Each site owns navigation/config and an immutable Papers lock. `scripts/build/docs.mjs`
stages tracked content and bootstraps either site from its pinned upstream release.
`runtime.patch` preserves existing branding and hosted machine-readable guidance;
shared locked dependency manifests make installation repeatable.

The Node docs asset adapter reads `docs/.papers/user/dist/`. Existing rendered
`/docs/...` routes remain stable. Repository references use the canonical files.

`apps/marketing/` owns the independent marketing website. `creative/` contains
character rigs, font tools, artwork experiments and video production sources.
Only active browser assets remain in `public/`; `browser/` holds wallet bundle
source. Retired character exports are kept in `creative/character/legacy-exports/`.

`server.mjs` remains the Node entry point. Backend code is grouped by ownership:

| Directory | Responsibility |
| --- | --- |
| `lib/commerce/` | Inventory, auctions, bids, orders, runs and public projections |
| `lib/integrations/` | Provider clients, catalog, companion, vision, payments and shipping |
| `lib/auth/` | Administrator and hosted-node authentication |
| `lib/persistence/` | Durable workspace storage and backup primitives |
| `lib/platform/` | Runtime configuration and request-host policy |
| `lib/http/` | Shared HTTP adapters, actions and platform asset access |

`cloudflare/` owns the Worker adapter and migrations; `deploy/` holds Node
deployment templates. Root npm commands are the entry points for each deployment
target. `scripts/` is organized into `build/`, `check/`, `deploy/`, `maintenance/`
and `runtime/`. Production Docker images copy only runtime helpers.
`tests/` holds verification, `packages/` reusable packages, and `plans/` planning records.

Root config required by npm, Docker, Railway, Wrangler, GitHub and Forgejo stays
in its expected locations. The commerce entry point has not been relocated.
