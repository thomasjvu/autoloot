# Documentation ownership

Keep documentation changes in the same change as the behavior they describe. Developer references belong in `dev-docs/content/`, and the design system in `dev-docs/design.md`. Update navigation in `dev-docs/documentation-config.js` when adding pages. Run `npm run dev-docs:check` after changing this site.

User-facing Papers guides belong in the separate local `documentation/` checkout. The `docs/` directory retains operational guides and compatibility links. Do not edit generated content or framework code under `dev-docs/.papers/`.
