---
lastUpdated: '2026-10-24'
---

# Installation

Requires **Node.js 22.16+** and npm. From the app root:

```sh
npm ci
npm start
```

Open **http://localhost:4173** on the streamer machine. Fresh workspaces start empty in live mode. Load sample lots under Settings → Practice show for a credential-free demo.

## Configure integrations

```sh
cp .env.example .env
```

The example sets `NODE_ENV=production`. Edit `.env` using the [configuration reference](/docs/getting-started/configuration), then restart. Keep `.env` and `.data` private.

## Verify the app

```sh
npm test
npm run check
npm run demo:check
```

The demo check uses disposable data and simulated Twitch/payment flows. It leaves your saved show unchanged.

Next: [demo walkthrough](/docs/getting-started/quick-start). Developer documentation is maintained in the separate Autoloot Dev Docs site.
