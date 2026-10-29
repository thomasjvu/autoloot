# Autoloot

A local-first Twitch selling workspace with auctions, fixed-price lots, private buyer orders and **Munny**, an optional AI cohost. Current stage: pre-beta; real-account rehearsals and production configuration are still required before live sales.

## Run locally

Requires Node.js **22.16+**.

```sh
npm ci
npm start
```

Open **http://localhost:4173**. Fresh workspaces start empty in live mode. For a credential-free practice show, use **Settings → Practice show → Load sample lots**. Sample lots use text and built-in placeholders; no third-party card scans or seller photographs are bundled.

Copy `.env.example` to `.env` when configuring integrations. The example enables production mode. Keep credentials and `.data/` private. One server owns one local SQLite data directory.

## Workspace

- **Studio:** current sale, lineup, setup checklist and bounded agent-led runs.
- **Companion:** Choose a custom name, tone, preferences and avatar or restore Munny; configure provider and voice settings. Live companions start offline until configured. Her floating panel contains chat, notifications and activity.
- **Inventory / Rip studio:** add owned stock, browse provider data in Inventory’s catalog tab, or review a captured card reveal. AI drafts and matches need review; catalog prices are not automatically adopted.
- **Orders:** private payment and fulfillment records, shipping labels and CSV workflows.
- **Sales & numbers:** collected funds, refunds, outstanding payments and seller-recorded costs. Practice/test orders are separate; contribution is an estimate, not reconciled profit.
- **Settings:** Twitch, Stripe, shipping, seller details, automation style and OBS widgets. An optional Munny-led tour can be replayed here.

Desktop uses a sidebar; mobile uses a navigation drawer. Buyers use `/shop`; OBS uses `/overlay`. Keep streamer access on localhost. Buyer identity and order ownership are checked by the server.

## Supported workflows

Standard auctions extend late bids to ten seconds; sudden-death auctions keep a fixed deadline. Buy-now orders reserve one unit. Untouched reservations expire after 15 minutes; attempted provider checkouts hold stock until reconciled.

Stripe Checkout uses server prices and signed payment events. Shippo provides quotes, labels, tracking and explicit dispatch; Pirate Ship uses CSV. NFT orders complete at verified digital transfer, with provider redemption separate. Agent-led runs sell a preapproved queue and can ask for review before each lot; they do not purchase inventory or implement new break-allocation formats.

All live integrations require the operator's accounts/configuration. A success URL, AI response or submitted transaction ID is not proof of payment or fulfillment.

## Documentation

Start with the [documentation index](docs/README.md). Key guides:

- [Production deployment](docs/production.md) and [release rehearsal](docs/live-rehearsal.md)
- [Twitch and OBS](docs/twitch-widgets.md), [shipping](docs/shipping.md), [CSV workflows](docs/csv-and-shipping.md)
- [Agent-led runs](docs/agent-led-runs.md), [NFT delivery](docs/nft-delivery.md), [sales accounting](docs/accounting.md)
- [Storage and recovery](docs/storage.md), [architecture](docs/architecture.md), [seller policies](docs/operator-policies.md)
- [Design](design.md), [roadmap](docs/roadmap.md), [hackathon demo](docs/hackathon.md)

`documentation/` is an ignored, separate Papers checkout. Its content/build is not included in this repository's commits. When present, use Node 24+ and `npm run docs:dev` to preview it at http://localhost:3333. The tracked guides in `docs/` are the portable source of operational guidance.

## Separate marketing site

```sh
npm run marketing:build
```

Deploy **only `marketing/dist`** to Cloudflare Pages. Set `WORKSPACE_URL` to the intended workspace origin. The marketing site owns its HTML/CSS and has no workspace API, login or database dependency. The Node app does not serve `/welcome`. See [marketing deployment](marketing/README.md).

## Verify

```sh
npm run check
npm test
npm run demo:check
npm run storage:check
npm run production:check
```

Automated tests use disposable data and provider fixtures. The production check identifies local configuration gaps; it does not certify real accounts, custody, signer security, taxes or dispute handling. See [deployment](docs/production.md) for operational gates. Public changelog publication is deferred until beta.

Maple Mono is bundled under SIL OFL; retain [font licensing](public/fonts/OFL.txt). Service marks and reference imagery retain their own ownership. The application has no open-source license grant; the separate icon package is MIT.

Rip Studio supports Prime Inference and local Photon inference. See [livestream vision setup](docs/vision.md).

OBS presets include confirmed-pull spotlight and a recent-pulls ribbon. They use saved, streamer-confirmed identities and do not expose buyer details or market prices.

## Giveaways and Channel Points

Giveaways → open a prize with eligibility/claim rules → viewers type `!enter` → close entries (or wait for the timer) → draw. One equal entry per verified Twitch user; no buyer registration, purchase, subscription or points required. Blocked users cannot enter. Draws use Node cryptographic randomness and persist winner, count, selected index and roster SHA-256 alongside the private entry roster. Drawing does not create inventory, reserve stock, charge payment or ship a prize. The streamer handles claims and fulfillment separately. Practice entrants are available only in practice mode. The active giveaway holds the most recent draw record; export/back up show data before replacing it.

For on-stream hype interactions, create a custom reward in Twitch Creator Dashboard, link its reward ID on Giveaways, then reauthorize Twitch. The app requests `channel:read:redemptions` and listens to the configured reward through EventSub. This triggers a cohost message only: it does not buy entries or change giveaway odds. Redemption fulfillment/refunds are managed in Twitch. Twitch eligibility and live reward delivery require verification with your broadcaster account. See https://legal.twitch.com/en/legal/channel-points-acceptable-use-policy/ and https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/ .

## Administrator password

Open the local dashboard to create an administrator username and password on first use. Usernames use 3–32 letters, numbers, underscores or hyphens. The server requires passwords of at least 12 characters including uppercase, lowercase, a number and a symbol. Existing password-only accounts keep their password-only sign-in. Sign-in uses a 12-hour HttpOnly SameSite session; passwords are stored as salted scrypt hashes in the private `.data/admin-auth.json` file. Restarting the server ends admin sessions. The existing local-only boundary remains in place; buyer sign-in and the public shop are separate. Sign out from the dashboard footer to revoke the current administrator session. If you lose the password, stop the server and move `.data/admin-auth.json` to a private backup, restart and create a new administrator account locally. Keep access to the data folder restricted. Existing automation/test clients must authenticate through `/api/admin/setup` or `/api/admin/login`, retain the session cookie, then request `/api/bootstrap`; an admin token alone is no longer sufficient.

## Maintaining the app

`server.mjs` wires providers, timers and shutdown. `lib/http/policy.mjs` owns ordered ingress/auth/audit/rate policy; the other `lib/http/` modules own route groups, role projections, HTTP bodies and SSE transport. Domain modules such as Engine, Payments and Shipping retain authoritative sale transitions. Route modules run behind the common policy.

`public/app.js` coordinates workspace navigation and remaining show dialogs. `public/workspace/` owns page views and product, order and companion controls; `public/shared/presenters.js` owns escaping/formatting and common visuals. `public/lifecycle/` owns connection recovery and draft focus. `public/storefront.js` owns buyer actions. State reaches extracted controllers through explicit accessors. See [stylesheet ownership](public/styles/README.md) and [architecture](docs/architecture.md).

`npm run check` recursively discovers runtime JavaScript, checks syntax and lexical bindings, and validates local imports and stylesheet entry points. Tests cover extracted policy, SSE backpressure/session revocation, connection races, presenter escaping/payment visibility and the preserved CSS cascade. Browser and real-provider rehearsal remain separate release checks.

The binding gate uses development-only Acorn and eslint-scope dependencies. It checks unresolved names with separate browser/Node globals and direct self-initialization of `let`/`const` bindings. This is a focused lint check, not a type checker or a substitute for runtime tests. Forgejo runs it through `npm run check`.
