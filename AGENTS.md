# Documentation ownership

Keep documentation changes in the same change as the behavior they describe.
User guides belong in `docs/user/content/`; developer and operational references
belong in `docs/dev/content/`. The canonical design system is `docs/dev/design.md`.
Update the respective `docs/user/documentation-config.js` or
`docs/dev/documentation-config.js` when adding pages.

Run `npm run docs:check` and `npm run dev-docs:check` after changing the sites.
Papers runtimes and output live under ignored `docs/.papers/`; do not edit their
generated content or framework code. Change tracked source and use the wrapper
or supported Papers updater.
