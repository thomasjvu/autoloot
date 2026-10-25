# Autoloot

Twitch commerce control: live auctions, buy-now listings, private buyer orders, Stripe Checkout and an optional Codex cohost. A local-first entry for the Codex × TwitchCon Hackathon.

## Documentation

The [Papers documentation site](documentation/README.md) includes setup, streamer and buyer guides, integrations, troubleshooting, and developer reference. With Node.js 24+, run `npm --prefix documentation ci` and `npm run docs:dev`, then open **http://localhost:3333**.

## Start

Node.js **22+**:

```sh
npm ci
npm start
```

Open **http://localhost:4173**. Demo mode runs without credentials. Sample inventory uses original SVG illustrations; upload your own product photos in Inventory.

```sh
npm test
npm run check
npm run demo:check
```

The interface uses bold solid-color sections, rounded geometry, heavy display headlines and self-hosted Maple Mono interface typography, with a top navigation on desktop and a labeled bottom navigation on mobile. The current auction comes first, with a short lineup below and bid history/logs available on demand. Product and auction forms keep optional settings in disclosures. Companion art appears on its own page and, optionally, the OBS overlay.

## Demo loop

1. In Live control, start a lot. Place a simulated bid in Test chat. Pause/resume, void a bid while paused, or close the lot.
2. Open Orders. The winner has a pending order and inventory is reserved. Use Test payment, then add a tracking reference.
3. In Inventory, set an optional buy-now price and enable **List in storefront**. Save the product.
4. Open **Storefront** (`/shop`), enter as a demo buyer, and purchase a listed item. The order appears privately under that demo identity. Add a **fictional** test address and simulate payment.
5. Return to the streamer’s Orders page to ship or simulate a refund before shipping.
6. In Companion, ask for the next lot. Review its proposal, then Apply. Select Codex to use real AI instead of local scripted replies.

## Implemented

- Inventory CRUD, search, product photos, condition, stock, buy-now prices and storefront listing controls.
- Ordered auction lineup with reordering, configurable opening duration/increment, 10-second anti-sniping, pause/resume, early close, cancel and server-authoritative bidding.
- Integer-cent validation, duplicate bid handling, winner selection, inventory reservation and order snapshots.
- Twitch OAuth/EventSub chat, `!bid 25.00`, `!register`, `!lot`, result announcements, token refresh/reconnection and pause on chat disconnect.
- Twitch-verified buyer registration, bidder blocking and audited bid voiding while paused.
- Idempotent direct purchases, private buyer order lookup, demo identities limited to demo purchases, owner-checked receipts and shipping details.
- Stripe-hosted Checkout, signed raw-body webhooks, exact order/amount/currency/environment checks, async payment states, checkout expiration, stock release and full unshipped refunds.
- Manual external payment confirmation only when there is no active Stripe checkout; explicit simulated payment in demo mode.
- Shipping collection through Stripe, per-order flat shipping price, tracking entry, CSV totals and authenticated receipt JSON.
- Structured Codex action proposals: draft a product listing, start next lot, pause, resume. Reviewable listing drafts show every field before Apply. Payment and winner state are controlled by code.
- Transparent OBS output, optional Mochi avatar and opt-in browser speech in the dashboard.
- Atomic JSON persistence, restart-paused auctions, capability-protected admin operations, origin checks, request limits and sanitized public snapshots.

## Twitch

1. Copy `.env.example` to `.env`.
2. Create a server application in the [Twitch developer console](https://dev.twitch.tv/console/apps), and register `http://localhost:4173/auth/twitch/callback` as a redirect.
3. Set `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`, then restart Autoloot.
4. Connect Twitch from Connections. Sign in as the broadcaster. Autoloot requests `user:read:chat` and `user:write:chat` and sends announcements as that broadcaster.
5. For viewers on other devices, expose the local server through an HTTPS tunnel, set `PUBLIC_URL`, and register that URL’s `/auth/twitch/callback` redirect as well. Keep the creator dashboard at localhost. **The tunnel must preserve its external Host header**, because localhost admin bootstrap is intentionally unavailable through the public hostname.
6. Share `<PUBLIC_URL>/shop`. Viewers sign in with Twitch to register, then bid in the connected channel. Switch the creator workspace to Live to accept real Twitch bids.

Twitch credentials and sessions are memory-only and reconnecting is required after server restart. Registered buyer IDs persist with orders. Chat disconnects pause live bidding; the creator explicitly resumes after reconnecting. Messages missed during an outage are not replayed by Twitch.

## Stripe Checkout

Autoloot uses the **individual streamer’s Stripe account**. It is not a platform that routes payments for multiple sellers. No Connect account or platform fee is configured.

Use a Stripe sandbox first. Set an appropriately scoped **restricted API key** in `STRIPE_API_KEY` and the endpoint signing secret in `STRIPE_WEBHOOK_SECRET`. Both are required to enable checkout. Keep keys in the ignored local `.env` or a deployment secret store; never in source/browser code.

Required API access covers Checkout Sessions (create, retrieve, expire), Payment Intents and Refunds. Use the Stripe Dashboard to grant only the permissions required by your deployment.

For local webhook forwarding with an authenticated Stripe CLI:

```sh
stripe listen --forward-to localhost:4173/api/stripe/webhook
```

Copy the printed signing secret into your local `.env`, then restart Autoloot. Subscribe the deployed endpoint to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `refund.updated`

Configure `SHIPPING_COUNTRIES` as comma-separated ISO codes, such as `US,CA`. Set the flat shipping amount in **Edit show**. Shipping is snapshotted into each order and included in its immutable checkout total. Stripe collects the buyer’s address and returns it through a signed payment event. There is **no automatic tax calculation** in this build.

Checkout success/cancel return URLs do not mark an order paid. The signed webhook verifies the session ID, order ID, USD amount and payment environment. Unpaid async sessions remain processing. Failed/expired checkout releases stock once. Cancellation first expires an open session; if payment already completed, it is reconciled rather than cancelled. Refunds restore stock only after successful provider confirmation. Shipped and externally-paid refunds remain outside this app.

**Verification boundary:** tests use the real Stripe SDK’s signature verifier with signed fixtures and a mocked API client. No real Stripe sandbox purchase/refund has been executed in this environment. Add your keys and verify the full provider flow before enabling real payments. Live auctions do not require Stripe, so an external-payment fallback exists; buy-now purchases in Live mode require configured checkout.

[Checkout documentation](https://docs.stripe.com/api/checkout/sessions/create) · [Webhook operations](https://docs.stripe.com/events/manage-webhook-endpoints)

## Codex

Install and authenticate the official CLI on the streamer’s machine:

```sh
npm install -g @openai/codex
codex login
codex login status
```

Select Codex in Companion. The adapter reuses the CLI’s local ChatGPT-plan or API authentication. For invocation-scoped API billing, provide `CODEX_API_KEY` in the server environment. API usage is billed separately from a ChatGPT plan. Autoloot does not collect a ChatGPT password or ship its own hosted subscription OAuth client.

Codex runs in a temporary directory with strict structured output, ignored user config, ephemeral sessions, read-only sandboxing and execution tools disabled. Twitch/Stripe secrets are excluded from the child environment. It sees product and order-status data, not shipping addresses. The server validates every proposed action on Apply. Listing draft prices are decimal USD strings and must come from the streamer’s request; the companion has no verified market-comparison feed.

Real local CLI replies and a structured listing draft were verified during development. Current requests are independent, not a persistent companion chat history. The avatar is original SVG art rather than a Live2D/VRM rig. The overlay now has optional browser speech and event-driven avatar reactions; OBS voice/audio availability must be checked on the actual streamer machine.

[Official Codex automation documentation](https://learn.chatgpt.com/docs/non-interactive-mode)

## OBS

Copy the overlay URL in Connections. Create an OBS Browser Source at **1280 × 720** and paste the URL. The background is transparent and it uses public show state only. The companion can be disabled independently of the auction display. Enable **Overlay voice** in Companion, then use the overlay’s **Enable / test voice** control if the browser requires a gesture. In OBS use the Browser Source interaction panel for that control and enable **Control audio via OBS**. Browser speech availability depends on the installed runtime and voices; actual OBS audio has not been verified here. Reduced motion disables avatar movement. Voice skips initial history and stale events; the final three-second countdown follows the authoritative end time. A late bid resets countdown eligibility.

## Architecture

```
public/                 Studio, storefront, overlay, original SVG assets
lib/engine.mjs          Deterministic inventory/auction/order state machine
lib/twitch.mjs          OAuth, EventSub, chat parsing and announcements
lib/payments.mjs        Stripe sessions, webhook verification, refunds
lib/companion.mjs       Scripted demo + schema-constrained Codex adapter
server.mjs              HTTP API, sessions, access checks, SSE, persistence
tests/                  Engine, commerce, Twitch and HTTP integration tests
docs/                   Architecture + hackathon demo guidance
.data/show.json         Local runtime data (ignored)
.data/images/           Uploaded product photos (ignored)
```

One process owns one workspace. Engine transitions are synchronous and persisted with temporary file + rename, then broadcast over SSE. Prices are integer cents. Server receive time decides bid acceptance. Existing runtime data migrates default settings in memory and is preserved.

The localhost creator page obtains a random admin capability. Remote viewers never receive it. Every viewer-order mutation checks the authenticated owner. Public state excludes orders, shipping, registrations and bidder IDs. Uploaded product photos are public catalog assets. Back up `.data` while stopped; it contains private order/shipping data, so do not commit or publish it.

This remains a single-streamer hackathon build, not a production multi-tenant marketplace. Production work still includes database transactions across multiple processes, durable sessions, card preauthorization/bid eligibility, purchase reservation timeouts before checkout begins, verified shipping-label purchase, tax configuration, disputes, deployment/admin identity and operational monitoring. Pending reservations without a checkout remain held until cancelled. No marketplace synchronization is planned: Twitch is the product’s platform.

## Submission

[Demo and submission guide](docs/hackathon.md). The submission needs an actual Twitch demo and your primary development Codex session ID. Creating this workspace does not register or submit a Devpost entry.

Maple Mono is bundled locally under the SIL Open Font License; see `public/fonts/OFL.txt` and the pinned upstream source in `public/fonts/SOURCE.md`.

## New: the live-drop demo

### Photo → listing

Choose **Photo → listing** in Inventory, upload a product photo, and provide the opening price, quantity, confirmed condition and notes. Select Codex in Companion first. The photo and notes are passed to the official CLI with `--image`; model image support is verified on the development account, but can vary by account/model availability. The server enforces the creator’s price, quantity, condition and unlisted state, then retains the image on the proposed product. Review the complete draft in Companion. Use **Edit draft** to change it before adding, or Apply to accept. Nothing is added until that explicit action. Only visible features should be described; the model must not infer authenticity or working condition.

A real Codex image request using the console visible in the project’s demo screenshot produced a valid draft. HTTP tests use a fixture CLI to verify image forwarding, enforced creator values, retained photo, edit/apply and replay rejection without spending model allowance.

### Chat picks the next drop

In Studio, choose two or three in-stock products outside the current auction and start a timed vote. Twitch viewers type `!vote 1`, `!vote 2` or `!vote 3`. Each verified Twitch event identity has one ballot and may change it; purchase registration is not required for voting. Blocked accounts cannot vote. Public vote snapshots contain totals but never account IDs. Ties go to the earliest listed option; an empty vote has no winner. The timer closes voting, but never automatically starts bidding. The streamer reviews the result and clicks **Auction the winner**. The engine revalidates stock and auction availability at start. Demo voting controls exercise the same state machine.

The public storefront and OBS overlay show vote products, counts and countdown. An open vote prevents mode changes. Voting does not charge, reserve stock or place bids.

### Event-driven Mochi and recap

New bid/product/winner messages have unique IDs and timestamps. The overlay offers excited/winner motion, pause pose and speech-mouth feedback, with explicit voice and reduced-motion controls. Speech is browser synthesis, not generated voice audio; it may require activation. The overlay does not replay the prior message on load or speak events older than 15 seconds. A 20-second watchdog clears visual speech feedback.

Studio’s Show recap displays sold lots, recorded/verified funds, pending orders and unique auction winners, and links to fulfillment. `npm run demo:check` walks through voting → creator choice → auction → bid → simulated payment → tracking, plus a separate private buyer purchase/address/payment/receipt loop in a disposable workspace. It never contacts Twitch or Stripe or changes your workspace data.

## Rip studio

Open **Rip studio**, share a screen/window or select a camera, then hold up a single Pokémon card and scan. Screen/camera capture starts only from your button click and browser permission picker. Choose the whole source or a center crop; the preview shows the source. Only the selected crop is sent as a JPEG to the local server and Codex CLI. Frames are private temporary files deleted after each analysis; they are not published to viewers. Stop sharing ends the browser tracks. Codex's own data handling follows your account configuration.

Codex transcribes visible card/pack identity. Metadata resolves candidates at `https://metadata.fyi`; set `METADATA_SERVICE_KEY` in `.env` for API access and restart. The service key never goes to the browser or Codex. Production returned an origin-unreachable error during development; recognition can still report an observation, but matching/prices require a healthy authorized Metadata API.

Review collector number/set, select the correct raw quote variant (or leave unpriced), and confirm. Mochi announces the pull using canonical data; optional companion voice reads it on the dashboard/OBS overlay. No grade, authenticity, pull odds or guaranteed resale value is inferred. Pack scans return set candidates, not exact sealed SKU appraisals. Quotes retain date, stale status and source records in JSON export. Every confirmation represents one physical card; confirm another copy explicitly.

Auto scan currently reads the next reveal then pauses for review. Codex CLI image analysis can take up to 90 seconds, so this is a deliberate reveal workflow rather than frame-rate tracking. Session pull history is held in server memory (200 latest pulls); export before restart. Capture is not automatically enabled and no frames are broadcast.

## Metadata catalog selection

**Catalog** (also linked from Inventory → Browse Metadata) searches the hosted TCG catalog across games, with an optional game ID filter and paginated results. Choose a canonical card, review its set/number/reference image, and supply your own opening price, quantity and actual condition. Adding creates an unlisted auction lot with its Metadata identity attached; it does not start an auction or copy a market guide price. The picker currently supports card records, not every Metadata vertical or sealed-product SKUs.

With Codex selected, ask “find Pikachu in the catalog,” then “choose the [name/set/number] result.” The companion uses server-controlled catalog search and selection and cannot invent a catalog ID. Search/selection do not create inventory; the creator reviews the selected card in Catalog and adds it. Demo scripted replies do not perform catalog searches. Live Metadata access requires a healthy origin and server-side credentials; provider failures are displayed, never replaced with sample matches. HTTPS catalog reference images load from their original image hosts; API credentials remain on the server.
