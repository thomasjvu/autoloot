# Contributing to Autoloot

Autoloot is a pre-beta Twitch selling workspace. Keep contributions focused on reliable selling, private buyer orders, and an optional AI cohost. Open an issue before proposing a major feature, dependency, architecture change, or redesign so we can agree on scope.

## Get started

Use Node.js 22.16 or newer:

```sh
npm ci
npm start
```

Open http://localhost:4173, create a local administrator account, and use **Settings → Practice show → Load sample lots** for a credential-free rehearsal. Configure integrations through your own ignored `.env` file when needed. Never commit credentials, `.data/`, databases, customer information, or live-provider captures.

Read the [architecture guide](docs/dev/content/developers/architecture.md), [stylesheet ownership](public/styles/README.md), and [release checklist](docs/dev/content/developers/release.md) before changing the relevant area.

## Keep the project aligned

- Follow the existing JavaScript modules and naming conventions. Prefer small changes in the owning module over new abstractions, broad rewrites, or duplicate implementations. Explain new dependencies.
- Keep shared HTTP behavior in `lib/http/`. Node and Cloudflare adapters handle platform details; domain services own authoritative state transitions and persistence.
- Preserve server-side identity, authorization, order ownership, and private/public projections. Browser code, model output, redirects, and submitted transaction IDs cannot establish payment or fulfillment success.
- Keep money in integer cents, stock reservations atomic, and provider operations idempotent. Cover retries, duplicate events, failure, and restart behavior when changing commerce flows.
- Keep practice activity separate from live commerce. AI proposals require server validation and the existing review/approval boundaries; never give a companion independent payment or inventory authority.
- Use the existing UI components, design tokens, and ordered stylesheet entry. Edit the owning CSS rule. Check keyboard access, focus, reduced motion, and mobile layouts. Keep the standalone marketing site independent of workspace APIs and styles.
- Use synthetic fixtures and disposable data in tests. Keep live integrations opt-in and avoid requiring paid accounts for automated checks.

## Documentation

Update documentation in the same pull request as the behavior it describes.

Developer references belong in `docs/dev/content/`, and the design system in `docs/dev/design.md`. Add navigation entries in `docs/dev/documentation-config.js` for new pages. Do not edit generated content or framework code under `docs/.papers/dev/`.

User-facing Papers guides live in tracked `docs/user/content/`. Both sites use the shared `docs/theme/` and independent ignored runtimes under `docs/.papers/`. Edit source guides and run the corresponding docs check; never add framework build output.

## Validate your change

Run the standard checks before submitting:

```sh
npm run check
npm test
npm run demo:check
```

Add regression coverage for changed behavior, especially authorization, money, inventory, asynchronous work, and recovery. Do not update snapshots or the CSS cascade baseline just to silence a failure; review the underlying behavior and rendered result first.

For Cloudflare runtime changes, also run `npm run worker:check`. For developer documentation changes, run `npm run dev-docs:check` when the local Papers tooling is available. Report any unavailable check and its reason. UI changes need screenshots and a browser check of the affected desktop and mobile flows. Automated fixtures do not replace real-provider or OBS rehearsals.

## Submit a pull request

Target `main` from a focused branch. Describe the problem, the resulting behavior, and the checks you ran. Include relevant screenshots, documentation changes, and any migration or configuration steps. Keep unrelated cleanup separate. AI-assisted contributions follow the same review and validation requirements.

Report suspected security vulnerabilities through GitHub’s private vulnerability reporting when enabled. Otherwise, request a private reporting channel without posting exploit details, credentials, or customer data in a public issue.

By submitting a contribution, you agree to license your original contributions under the project’s [MIT license](LICENSE). Include attribution and compatible license notices for third-party material; bundled fonts retain their own licenses.
