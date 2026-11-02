---
lastUpdated: '2026-10-24'
---

# Configuration

Copy `.env.example` to `.env`, edit the values, and restart the app. Demo mode works with provider credentials left empty.

## Server

| Variable     | Default                   | Purpose                                             |
| ------------ | ------------------------- | --------------------------------------------------- |
| `PORT`       | `4173`                    | HTTP port                                           |
| `PUBLIC_URL` | `http://localhost:<PORT>` | Buyer links, OAuth callbacks, payment returns       |
| `DATA_DIR`   | `.data` in the app root   | Private state, app credentials, and uploaded photos |

## Integrations

| Variable                | Default                | Purpose                                                     |
| ----------------------- | ---------------------- | ----------------------------------------------------------- |
| `TWITCH_CLIENT_ID`      | Empty                  | Twitch app ID                                               |
| `TWITCH_CLIENT_SECRET`  | Empty                  | Twitch app secret                                           |
| `STRIPE_API_KEY`        | Empty                  | Server-side Stripe key; start with a restricted sandbox key |
| `STRIPE_WEBHOOK_SECRET` | Empty                  | Webhook signing secret                                      |
| `SHIPPING_COUNTRIES`    | `US`                   | Comma-separated destination country codes                   |
| `CODEX_BIN`             | `codex`                | Official CLI executable                                     |
| `CODEX_API_KEY`         | Unset                  | Optional API authentication for CLI requests                |
| `METADATA_API_URL`      | `https://metadata.fyi` | TCG metadata service                                        |
| `METADATA_SERVICE_KEY`  | Empty                  | Server-side Metadata credential                             |

See [Twitch](/docs/integrations/twitch), [Stripe](/docs/integrations/stripe), [Codex](/docs/integrations/codex), and [Catalog / Rip studio](/docs/streamer/catalog-and-rip) for setup.

## Dashboard settings

- **Edit show:** title, auction duration, bid increment, anti-sniping, and flat shipping. Shipping changes apply to new orders only.
- **Companion:** provider, avatar, and voice.
- **Demo / Live:** workspace mode. Close an open vote before switching.
- **Twitch setup:** optionally save the app ID and secret in the private data directory. OAuth tokens and login sessions reset after restart.

## Remote buyers

Use an HTTPS tunnel, set `PUBLIC_URL` to its external URL, and register the matching `/auth/twitch/callback` with Twitch. Preserve the external Host header through the tunnel. Open the creator dashboard on localhost.

## Coming-soon features

Rip Studio and giveaways are off by default and appear as **Coming soon** in navigation. To enable either preview, set `AUTOLOOT_RIP_STUDIO=1` or `AUTOLOOT_GIVEAWAYS=1` in the server environment and restart. Hosted workspaces use the same environment settings.

Disabling Rip Studio blocks its scan, search, selection, confirmation and provider endpoints. Catalog browsing and photo-assisted listings remain available. Disabling giveaways blocks new giveaways and all new entries, including `!enter` and practice entries. Existing giveaways can still be closed, cancelled or drawn; winner claims, history and prize dispatch remain available. Flags do not delete saved data.

NFT support is also off by default. Set `AUTOLOOT_NFT=1` and restart to enable NFT inventory and new sales. While disabled, NFT listings are hidden from the public catalog and new NFT inventory, edits and sales are rejected. Existing NFT orders retain their payment, destination and fulfillment workflows.
