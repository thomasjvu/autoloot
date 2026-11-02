<p align="center">
  <img src="public/icon-192.png" width="80" alt="Autoloot icon">
</p>

<h1 align="center">Autoloot</h1>

![Autoloot — live selling with Munny](creative/marketing/autoloot-cover-hands-fixed.png)

A Twitch selling workspace for auctions, buy-now lots, inventory, and private buyer orders. **Munny**, your optional AI cohost, helps run the show.

**Pre-beta.** Live sales require configured integrations and real-account rehearsals. Demo video coming soon.

## What’s inside

- **Studio:** manage your lineup, run auctions, and publish OBS overlays.
- **Inventory:** list stock, search the catalog, and review AI-assisted card reveals.
- **Orders:** collect payments, manage shipping, and track sales.
- **Companion:** customize Munny’s personality, avatar, voice, and AI provider.

Buyers visit `/shop`; OBS uses `/overlay`. Keep local streamer access on localhost.

## Run locally

Requires **Node.js 22.16+**.

```sh
git clone https://github.com/thomasjvu/autoloot.git
cd autoloot
npm ci
npm start
```

Open [localhost:4173](http://localhost:4173) and create your administrator account. To try a credential-free show, choose **Settings → Practice show → Load sample lots**.

Copy `.env.example` to `.env` to configure integrations. The example enables production mode. Keep credentials and `.data/` private; one server owns one local SQLite data directory. Twitch, payments, shipping, and AI providers require your own accounts. Review the [deployment guide](docs/dev/content/operations/production.md) before live use.

## Deployment

Use [deployment targets](docs/dev/content/developers/deployment.md) for Railway
(Node with persistent SQLite), self-hosted Node, or Cloudflare Workers. Hosted
Node requires `AUTOLOOT_NODE_MODE=hosted` and a configured Twitch owner.

## Documentation

The repository separates the marketing site (`apps/marketing/`), shared backend
code (`lib/`), shipped browser assets (`public/` and `browser/`), creative
production (`creative/`), and purpose-based tooling (`scripts/`).

All documentation lives in [`docs/`](docs/README.md):

- [`docs/user/`](docs/user/README.md): setup, selling, bidding, payments and shipping.
- [`docs/dev/`](docs/dev/README.md): architecture, APIs, deployment, operations and audits.
- [`docs/dev/design.md`](docs/dev/design.md): the canonical design system.

Guide sources, navigation and branding are tracked in Git. Papers runtimes and
build output stay ignored under `docs/.papers/`. Preview with `npm run docs:dev`
(port 3333) or `npm run dev-docs:dev` (port 3334).

See [release checks](docs/dev/content/developers/release.md) before shipping and
[marketing deployment](apps/marketing/README.md) for the standalone site.

```sh
npm run check
npm test
npm run demo:check
```

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for project conventions and pull request checks.

Licensed under [MIT](LICENSE). Bundled fonts and third-party assets retain their own licenses; see [Maple Mono](public/fonts/OFL.txt) and [Autoloot Display](public/fonts/AutolootDisplay-OFL.txt).
