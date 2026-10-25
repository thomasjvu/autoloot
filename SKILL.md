---
name: autoloot-site
description: Connect to and operate the Autoloot Twitch commerce site as a creator, buyer, or scoped NFT delivery agent. Use for local setup, inventory, auctions, orders, companion proposals, and bounded agent-led sales runs in this repository.
---

# Autoloot site operations

Autoloot is a single-streamer application. Its server owns inventory, auction clocks, payment verification and fulfillment state. Operate through the site or HTTP API; do not edit SQLite to perform business actions.

## Connect

From the repository root, use Node.js 22.16+:

```sh
npm ci
npm start
```

The default creator dashboard is `http://localhost:4173`, the buyer storefront is `/shop`, and the public OBS browser source is `/overlay`. `PORT` changes the local port; `PUBLIC_URL` sets the public origin. Read `.env.example` for configuration names without exposing an existing `.env`. Credentials are optional for a local demo. The example environment sets `NODE_ENV=production`, so copying it also enables production behavior.

Before starting another process, check `GET /api/health` on the intended port. A healthy response is `{ "ok": true, "storage": "sqlite" }`. Reuse an existing server when appropriate: one process owns one data directory. Do not restart an active show casually; restart pauses auctions/runs and requires Twitch reconnection.

For browser operation, open the creator dashboard using localhost. It bootstraps admin access automatically. A public/tunneled URL is for viewers and cannot bootstrap creator access.

For direct API operation on the server machine:

1. Fetch `GET http://localhost:4173/api/bootstrap` in memory. The response contains `admin`, `state`, `viewerUrl` and `overlayUrl`.
2. Send that capability as `X-Autoloot-Admin` on creator requests. Use `Content-Type: application/json` for JSON POST bodies.
3. Read authenticated `GET /api/state` to inspect current creator state. Without the capability, this endpoint returns a sanitized public snapshot.
4. After a mutation, inspect the returned state or fetch state again. Consult the matching route in `server.mjs` for its current body schema and the engine guards in `lib/engine.mjs` before constructing a new command.

Keep the capability out of output, shared links and committed files. It changes on server restart. Bootstrap requires a loopback connection, a localhost/loopback Host header, and no forwarding headers. Do not spoof headers to bypass remote access restrictions. For browser-origin requests, Origin must match the request host; a 403 is an access/configuration failure to resolve, not a reason to disable checks.

Public updates stream from `GET /api/events` using SSE. Prefer ordinary state reads for short tasks; the browser already manages live subscriptions.

## Choose the operating role

- **Creator:** localhost dashboard/admin capability; can manage inventory, show terms, auctions, orders and runs within the user's requested scope.
- **Buyer:** `/shop`, with its own authenticated buyer session. Demo login is limited to demo purchases; Twitch login registers a real buyer. Preserve session cookies when using buyer APIs. Order mutations and receipts enforce ownership; an order ID alone grants no access.
- **NFT delivery agent:** use the separate `X-Autoloot-Nft-Agent` credential for authorized jobs. It does not grant general admin access. Read [NFT delivery](docs/nft-delivery.md) before handling transfers.

## Use the creator site

Inspect the mode, current auction, stock and any active run before changing sales state. Keep demo actions in Demo mode and describe simulated outcomes as simulated.

The public `/shop` includes the live drop countdown, accepted-bid feed, sold result and available-inventory lineup. Its timer follows the current auction deadline; it does not schedule future drops. Exercise start, bid/extension, pause/resume, result and disconnect states when changing this presentation.

1. **Inventory:** create or edit products with the operator's price, quantity and confirmed condition. A buy-now product needs a buy-now price and **List in storefront** enabled. Catalog selection does not authorize adopting a reference market price. Photo → listing creates a reviewable draft; it does not add inventory until applied.
2. **Live control / Studio:** start an eligible lot, inspect bids, pause/resume or finish/cancel it. Bid voiding requires a paused auction. The server decides accepted bids, anti-sniping extensions and winners.
3. **Orders:** inspect the order and payment status before fulfillment. Demo Test payment is a simulation. Live Stripe payment is established by verified provider events, never by a success URL or an agent assertion. Record real tracking only when shipment has occurred. NFT delivery uses its separate verified transfer flow.
4. **Companion:** select scripted Demo or locally authenticated Codex. Ask for a proposal, review every proposed field, then Apply when covered by the user's instruction. Pending proposals are not completed actions. The embedded Codex adapter cannot directly control payment or winner state.
5. **Connections / Settings:** configure Twitch, checkout and OBS as needed for the requested workflow. Share the public `/shop` URL with buyers; keep creator bootstrap local. An HTTPS tunnel must preserve its external Host header.

Useful creator POST routes include `/api/products`, `/api/products/edit`, `/api/auction/start`, `/api/auction/pause`, `/api/auction/resume`, `/api/auction/finish`, `/api/auction/cancel`, `/api/order`, `/api/show`, `/api/companion/ask` and `/api/companion/apply`. These are guarded business commands, not unrestricted object updates. Read their handlers for exact field names and constraints. Use stable request IDs on routes that support them; after an uncertain payment/transfer response, reconcile the existing operation before retrying.

## Bounded agent-led sales

Read [Agent-led runs](docs/agent-led-runs.md) when asked to host or automate a sales session. In Studio → Agent-led run → Configure run, select 1–20 existing single-unit products, Auction or Buy now per step, and a 1–240 minute arming window. Configure prices, shipping and auction terms before arming. Arming freezes the queue and terms.

Admin routes are `POST /api/run/arm` with `requestId`, `minutes`, and `steps` containing `productId` and `format`, plus `/api/run/pause`, `/api/run/resume`, and `/api/run/stop`. Resolve exact format values from `lib/runs.mjs`.

Operate within the user's armed inventory, formats and time limit. The runner waits for payment and recorded physical shipment or verified NFT delivery before advancing a sold item. Exceptions pause for review. Stop does not cancel/refund existing orders; a current auction remains paused for manual resolution. Inventory purchasing, physical opening and planned break formats are outside this runner's implemented abilities.

## CSV imports and fulfillment

Read [CSV and shipping](docs/csv-and-shipping.md) for inventory mapping, SKU updates, shipping exports and bulk tracking. Use `/api/import/preview` before `/api/import/apply`, preserving the preview fingerprint and identical inputs. Imports apply atomically and require every row to pass. Inventory imports unlist affected products; stock updates replace available quantity. `/api/fulfillment.csv` contains private customer addresses and requires creator access. Tracking import records actual shipment; never use it as evidence that a package was physically sent. CSV mapping is available; native Shopify/WooCommerce synchronization is not implemented.

For Shippo rate quotes, label purchase, reconciliation and dispatch, read [Shipping labels](docs/shipping.md). Use the seller's server-side token and the order's test/live environment. Before buying postage, present the saved rate and exact USD cost for the seller's authorization. Purchasing a label does not establish package handoff or complete physical fulfillment. Never issue another purchase for an uncertain attempt: use `/api/shipping/refresh`. Pirate Ship uses `/api/pirateship.csv` and reviewed tracking imports; there is no Pirate Ship API connection.

## Verify and troubleshoot

For a disposable demo journey, run `npm run demo:check`. It exercises voting, auction, simulated payment, tracking and private buyer orders without contacting providers or changing the active workspace. For source changes, use `npm run check` and relevant tests; `npm test` runs the application test suite.

- **403 bootstrap:** connect locally using the configured port; inspect proxy/Origin configuration.
- **Live controls blocked:** inspect Twitch connectivity, inventory eligibility, checkout configuration and active-run restrictions. Do not bypass engine guards.
- **Provider timeout or uncertain checkout:** inspect the existing order/session and reconcile before cancelling or creating another operation.
- **Storage unhealthy:** stop new sales and consult recovery documentation. Never delete runtime data to make startup succeed.

Runtime data lives in `.data` by default, including private orders, buyer sessions and images. Do not commit or publish it. Use the storage commands and documented stopped-server restore procedure.

Load further guidance only as needed:

- [README](README.md): demo walkthrough, Twitch/Stripe/Codex configuration and current features.
- [Storage and recovery](docs/storage.md): SQLite ownership, backup and restore.
- [Production](docs/production.md): supported deployment and launch checks.
- [Twitch and OBS](docs/twitch-widgets.md): widget URLs, buyer registration and stream setup.
- [Operator policies](docs/operator-policies.md): seller identity and published policies.
- [NFT delivery](docs/nft-delivery.md): authorization, scoped jobs, signing bridge and chain verification.
