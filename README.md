# Autoloot

A local-first Twitch selling workspace with auctions, fixed-price lots, private buyer orders and **Munny**, an optional AI cohost. Current stage: pre-beta; real-account rehearsals and production configuration are still required before live sales.

## Run locally

Requires Node.js **22.16+**.

```sh
npm ci
npm start
```

Open **http://localhost:4173**. Fresh workspaces start empty in live mode. For a credential-free practice show, use **Settings → Practice show → Load sample lots**. Sample TCG images are reference assets, not seller-owned stock; see [image sources](public/demo/SOURCES.md).

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
