# Documentation maintenance

User-facing guides live in `docs/user/content/`; developer and operational
references live in `docs/dev/content/`. Edit each site's `documentation-config.js`
for navigation. The canonical design specification is `docs/dev/design.md` and
the shared Papers theme and fonts live in `docs/theme/`.

Run `npm run docs:check` and `npm run dev-docs:check` after source changes.
`scripts/build/docs.mjs` copies tracked sources into ignored runtimes under
`docs/.papers/user/` and `docs/.papers/dev/`. Never edit generated content there.
Both sites are pinned by their respective `papers.lock.json` files.

The local Node application redirects docs requests to the user-docs dev server
on port 3333. Production reads built user docs from `docs/.papers/user/dist/`.
Developer docs preview independently on port 3334.
