# Documentation

All guide sources and site configuration live here and are tracked in Git.

| Folder | Contents | Preview |
| --- | --- | --- |
| [user](user/README.md) | Setup, buyer and seller workflows, integrations | `npm run docs:dev` — port 3333 |
| [dev](dev/README.md) | Architecture, APIs, deployment, recovery, audits and design | `npm run dev-docs:dev` — port 3334 |
| `theme/` | Shared Autoloot fonts and Papers theme | Both sites |
| `.papers/` | Ignored local Papers runtimes and generated output | Never edit as source |

Each site has `content/`, `documentation-config.js`, and an immutable
`papers.lock.json`. User images are in `user/public/`; the design specification
is `dev/design.md`. Build output is `.papers/user/dist/` and `.papers/dev/dist/`.
Existing rendered `/docs/...` paths are retained. Repository links now point at
the canonical files instead of compatibility stubs.

Requires Node.js 24+. The wrapper can bootstrap each runtime independently from
the exact locked Papers commit using its supported generator, `runtime.patch`
for Autoloot customizations, and the shared locked dependency manifests. A first
run requires network access. Neither site is deployed.

```sh
npm run docs:check
npm run dev-docs:check
```
