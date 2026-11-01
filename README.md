# Autoloot

A Twitch selling workspace with auctions, fixed-price lots, private buyer orders and **Munny**, an optional AI cohost. Current stage: pre-beta; real-account rehearsals and production configuration are still required before live sales.

## Run locally

Requires Node.js **22.16+**.

```sh
npm ci
npm start
```

Open **http://localhost:4173**. Fresh workspaces start empty in live mode. For a credential-free practice show, use **Settings → Practice show → Load sample lots**. Sample lots use text and built-in placeholders; no third-party card scans or seller photographs are bundled.

Copy `.env.example` to `.env` when configuring integrations. The example enables production mode. Keep credentials and `.data/` private. One server owns one local SQLite data directory.

Metadata API access is optional: without a key, the app uses a bounded identity-only demo. See [Metadata modes and credentials](docs/metadata.md) for full access and production setup.

## Workspace

- **Studio:** current sale, lineup, setup checklist and bounded agent-led runs.
- **Companion:** customize name, tone, avatar and voice; [connect Codex](docs/codex-connection.md) or select a provider. Live companions start offline until configured. Her floating panel contains chat, notifications and activity.
- **Inventory / Rip studio:** add owned stock, browse provider data in Inventory’s catalog tab, or review a captured card reveal. AI drafts and matches need review; catalog prices are not automatically adopted.
- **Orders:** private payment and fulfillment records, shipping labels and CSV workflows.
- **Sales & numbers:** collected funds, refunds, outstanding payments and seller-recorded costs. Practice/test orders are separate; contribution is an estimate, not reconciled profit.
- **Settings:** Twitch, Stripe, shipping, seller details, automation style and OBS widgets. An optional Munny-led tour can be replayed here.

Desktop uses a sidebar; mobile uses a navigation drawer. Buyers use `/shop`; OBS uses `/overlay`. Keep streamer access on localhost. Buyer identity and order ownership are checked by the server.

## Supported workflows

Standard auctions extend late bids to ten seconds; sudden-death auctions keep a fixed deadline. Buy-now orders reserve one unit. Untouched reservations expire after 15 minutes; attempted provider checkouts hold stock until reconciled.

Stripe Checkout uses server prices and signed payment events. Optional [USDC checkout](docs/crypto-checkout.md) supports physical orders on Solana mainnet. Shippo provides quotes, labels, tracking and explicit dispatch; Pirate Ship uses CSV. NFT orders complete at verified digital transfer, with provider redemption separate. Agent-led runs sell a preapproved queue and can ask for review before each lot; they do not purchase inventory or implement new break-allocation formats.

All live integrations require the operator's accounts/configuration. A success URL, AI response or submitted transaction ID is not proof of payment or fulfillment.

## Documentation

Start with the [documentation index](docs/README.md) for setup, selling, payments, shipping and development guides.

`docs/` contains the tracked operational guides. `documentation/` is an ignored, separate Papers checkout; its content and builds are not included in this repository's commits. When available, use Node 24+ and `npm run docs:dev` to preview it at http://localhost:3333. Help and FAQ use its built pages when present, otherwise a bundled quick guide.

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

## Administrator access

Create an administrator username and password on first use at localhost. Usernames use 3–32 letters, numbers, underscores or hyphens. Passwords require at least 12 characters with uppercase, lowercase, a number and a symbol. Existing password-only accounts retain their sign-in.

Sessions last up to 12 hours, or 30 days with **Remember me**, and end on sign-out or server restart. Passwords are salted scrypt hashes in private `.data/admin-auth.json`; session cookies are HttpOnly and SameSite Strict. Twitch and buyer sign-in are separate. See [administrator recovery](docs/production.md#administrator-access) for lost passwords and automation access.

## Maintaining the app

See [architecture](docs/architecture.md) for module ownership and trust boundaries, [stylesheet ownership](public/styles/README.md) for CSS changes, and [release checks](docs/release.md) before shipping.

`npm run check` builds the wallet bundle, checks runtime JavaScript syntax and lexical bindings, and validates local imports and stylesheet entry points. Automated checks use disposable data and provider fixtures; browser, OBS and real-provider rehearsals remain separate release gates.

Settings groups Twitch, Stripe, Reown and Codex in connection cards. Companion run, Show and Stream cards open their controls in drawers. Sign out is available beside Take a tour in the Settings header and in the sidebar account row.

Sales & numbers includes a daily collections chart (7 or 30 UTC days) using the selected real/practice activity. All-time totals retain a trailing 30-day chart. Orders includes an all-time real-order status overview; practice and Stripe test payments are excluded. Chart bars expose daily totals on keyboard focus or hover. Add product offers Metadata catalog search alongside manual listing. The self-hosted Powered by Metadata attribution uses Metadata's current spiral (`brand/kit/logos/portal-ink.svg`) with plain text and no surrounding frame. The upstream v1 badge exports still carry the previous framed treatment.

The local Node app and Cloudflare hosted runtime share native Hono routes. See [Cloudflare setup](docs/hosted-migration.md) for Durable Objects, D1, R2, owner sign-in and the local Codex companion. Run `npm run worker:check` to verify the hosted runtime locally.
