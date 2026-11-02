# Documentation maintenance

Developer references live in `dev-docs/content/`; the canonical design specification is `dev-docs/design.md`. Navigation and branding live in `dev-docs/documentation-config.js`. User guides belong in the separate `documentation/` Papers site.

From the app root, run `npm run dev-docs:dev` for port 3334, `npm run dev-docs:build` for a static build, or `npm run dev-docs:check` for a build and content checks. Node.js 24+ is required.

The wrapper prepares an ignored Papers runtime in `dev-docs/.papers/`. Edit tracked sources, then restart or rebuild to refresh the runtime. Do not edit generated pages there. See `dev-docs/README.md` for bootstrap requirements.

No production developer documentation host is configured.
