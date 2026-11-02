<p align="center">
  <img src="public/icon-192.png" width="80" alt="Autoloot icon">
</p>

<h1 align="center">Autoloot</h1>
<p align="center">Your stream. Your shop. Your pace.</p>

![Autoloot — live selling with Munny](marketing/submission/autoloot-cover-hands-fixed.png)

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

Copy `.env.example` to `.env` to configure integrations. The example enables production mode. Keep credentials and `.data/` private; one server owns one local SQLite data directory. Twitch, payments, shipping, and AI providers require your own accounts. Review the [deployment guide](docs/production.md) before live use.

## Documentation

Start with the [documentation index](docs/README.md) for setup, selling, payments, shipping, and development. The separate local `documentation/` Papers checkout contains the user guides; developer references are maintained in `dev-docs/`.

See [release checks](docs/release.md) before shipping and [marketing deployment](marketing/README.md) for the standalone site.

```sh
npm run check
npm test
npm run demo:check
```

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for project conventions and pull request checks.

Licensed under [MIT](LICENSE). Bundled fonts and third-party assets retain their own licenses; see [Maple Mono](public/fonts/OFL.txt) and [Autoloot Display](public/fonts/AutolootDisplay-OFL.txt).
