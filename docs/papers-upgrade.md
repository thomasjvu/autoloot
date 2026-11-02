# User-guide Papers runtime

The ignored `documentation/` site is pinned by [papers.lock.json](papers.lock.json)
to Papers v0.3.0 (`960390afe16c017435c97931acec9f87140f396d`). Its own
`documentation/papers.lock.json` must match this record.

Use the supported updater from the local site, preserving its content and
Autoloot theme. Review and resolve the three-way merge report before building:

```sh
node documentation/scripts/papers-upgrade.mjs --site documentation --to v0.3.0 --allow-dirty
npm --prefix documentation install --ignore-scripts
npm run docs:build
npm run docs:check
```

After a reviewed upgrade, update this lock record in the same commit. Do not add
the ignored framework or generated output to the application repository.
Developer documentation has its own tracked pin and setup in
[dev-docs/README.md](../dev-docs/README.md).

Both sites are local-only. The commerce deployment does not deploy these docs;
publishing requires a separately verified owned host and deployment workflow.
