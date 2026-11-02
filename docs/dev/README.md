# Developer guides

Edit Markdown in `content/`, navigation in `documentation-config.js`, and the
canonical design specification in `design.md`. Deployment, backup/recovery,
audits, and demo production notes belong here. Seller workflows belong in
`../user/content/`.

Run `npm run dev-docs:dev`, `npm run dev-docs:build`, or `npm run dev-docs:check`
from the repository root. The ignored runtime is `../.papers/dev/`; it builds
independently from the user runtime. Both are pinned to Papers v0.3.0.
