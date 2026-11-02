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
