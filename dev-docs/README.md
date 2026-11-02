# Autoloot developer documentation

A separate Papers site for architecture, HTTP APIs, lifecycle contracts, development and release, audits, and the design system. User-facing help stays in `documentation/`.

- Edit developer pages in `content/`.
- Edit the canonical design system in [design.md](design.md).
- Edit navigation and branding in `documentation-config.js`.

Use Node.js 24 or newer. From the application root:

```sh
npm run dev-docs:dev   # http://localhost:3334
npm run dev-docs:build
npm run dev-docs:check
```

The wrapper bootstraps the ignored `.papers/` runtime from the existing local Papers checkout at `../documentation/` and installs its locked dependencies. That checkout is required on a fresh machine; it is not included in the application repository. Papers framework files and generated artifacts stay out of application commits. Build output is `.papers/dist/`.

The wrapper copies tracked content before each command. Restart the command after editing content. This site is configured for local use; publishing requires an owned host and separate deployment configuration.

## Papers version

The runtime is pinned by `papers.lock.json` to Papers **v0.3.0**, commit
`960390afe16c017435c97931acec9f87140f396d`. The build wrapper verifies the
runtime pin and checks the local template before creating a fresh runtime.

Upgrade with the supported Papers updater, resolving its three-way merge report
before building. Do not hand-copy framework files. For this adopted local
runtime, use:

```sh
node documentation/scripts/papers-upgrade.mjs --site dev-docs/.papers --to v0.3.0 --allow-dirty
npm --prefix dev-docs/.papers install --ignore-scripts
npm run dev-docs:check
```

After a reviewed upgrade, copy the resulting runtime `papers.lock.json` to this
directory in the same commit. User guides record their separate pin in
`docs/papers.lock.json`. Framework sources, generated content and build output
remain ignored. Both documentation sites are local-only; the commerce Worker's
host is not a documentation deployment destination.
