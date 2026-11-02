# Papers upgrades

Both sites pin Papers in `docs/user/papers.lock.json` and `docs/dev/papers.lock.json`.
Their ignored runtimes live in `docs/.papers/user/` and `docs/.papers/dev/`.

Use the supported `scripts/papers-upgrade.mjs` inside a runtime for three-way
upgrades. Review conflicts and run both site checks before updating tracked pins.
Keep `docs/runtime.patch` and the shared dependency manifests aligned with the
target release so fresh bootstraps reproduce the reviewed result.

```sh
node docs/.papers/user/scripts/papers-upgrade.mjs --site docs/.papers/user --to v0.3.0 --allow-dirty
npm run docs:check
npm run dev-docs:check
```

Both sites are local-only. Commerce deployments do not publish the docs.
