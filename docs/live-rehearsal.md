# Release rehearsal and remaining gates

## Local verification completed

The automated suite covers engine and HTTP contracts, Stripe signed fixtures, inventory reservation expiry, attempted-checkout recovery, Twitch lifecycle/reconnect behavior and private buyer data. The disposable demo journey covers vote → auction → winner → simulated payment → shipping and direct-purchase → private receipt. Desktop browser checks cover setup controls, widget selection, public widgets, transparency, stale-state warnings and recovery.

These are not proof of real provider transactions, mobile behavior or OBS audio. Run `npm test`, `npm run check`, and `npm run demo:check` before a release.

## Reservation policy and upgrade check

New auction winner and buy-now orders hold stock for 15 minutes. The buyer must start checkout or the seller must confirm verified external payment before the deadline. Demo orders use the same deadline for simulated payment. Expired orders cannot be paid or silently revived; the buyer needs a new available listing or a new seller-arranged auction.

A Stripe request attempt records a durable marker before the network call. The local deadline no longer releases that stock. If the response is lost, retry checkout using the same order and idempotency key. Do not manually release stock while the provider outcome is unknown. Provider-confirmed expiry/failure, confirmed cancellation and successful refunds own their existing stock-release paths. Async processing keeps stock held.

Existing pending orders derive a deadline from their original createdAt value. Overdue orders with no checkout ID or attempted-checkout marker expire at the next engine tick. Back up `.data` while stopped and review pending orders before upgrading an active selling workspace. Orders without a valid creation timestamp receive a fresh 15-minute deadline when loaded.

## Twitch rehearsal — account access required

Use one broadcaster and a separate buyer on a second device. Configure the public HTTPS storefront and matching OAuth callback; preserve the public Host header through the tunnel. Keep the creator workspace on localhost.

1. Authorize the broadcaster. Register the buyer through Twitch sign-in.
2. Vote through chat, approve the next lot and place bids from verified identities.
3. Verify minimum increments, late-bid extension, winner announcement and private order access.
4. Disconnect and reconnect Twitch. Confirm bidding pauses and requires an explicit resume.
5. Interrupt the browser/server connection in a practice workspace. Confirm stale warnings, hidden clocks and recovery with a new snapshot.

Record outcomes and failures; do not substitute simulated chat for this gate.

## Stripe sandbox — sandbox credentials required

Configure a sandbox key and signed webhook delivery. Complete the payment steps yourself in Stripe's hosted sandbox UI.

1. Reserve an item, inspect the deadline and start checkout before expiry.
2. Verify amount, shipping, order ID and environment; confirm the signed event marks only that order paid.
3. Verify a return URL alone does not mark payment complete.
4. Test cancellation/expiration and stock release; replay events and confirm stock does not increase twice.
5. Test a full unshipped refund, delayed/async payment states where available and a declined payment.
6. Verify an untouched order expires, a new request can reserve released stock, and the old order cannot initiate checkout.

Use fictional buyer addresses and provider sandbox instructions. Record the order and event IDs, never API keys or full personal data.

## OBS and mobile — device checks required

Add each preset at its documented dimensions. Confirm transparency against a contrasting scene, updates during a live auction, vote-only and Munny-only isolation, and interruption warnings. Use one voice-enabled source and verify Control audio via OBS, voice activation, mute and reduced motion.

On a phone, check Twitch registration, readable price/deadline, bid-command copy, private orders and the complete hosted checkout return. Check portrait and landscape layouts and keyboard behavior.

## Metadata and recognition — provider access required

Verify the configured API with real catalog searches. Test a small labeled set of real cards under different lighting/crops. Record latency and incorrect matches. Confirm the streamer can reject/correct candidates and that no unreviewed identity or price is announced. Keep recognition labeled as a prototype until this passes.

## Deployment decisions still required

There is no configured production deployment. Choose either a local-first streamer installation with a public viewer tunnel, or a hosted viewer/payment service with a deliberately designed local Codex connection. Do not expose localhost admin bootstrap publicly.

Before real sales, choose persistent storage/backups, durable admin identity and buyer sessions, monitoring and restore procedures. Specify unpaid-winner handling, shipping, taxes, refunds and disputes. Multi-process hosting requires transactional persistence; the current SQLite store deliberately enforces a single writer; multi-process entity coordination is not implemented.

## Release housekeeping

Review the working diff, including pre-existing design changes, before committing. Do not commit local credentials, runtime data or buyer addresses. Update the outcome of each real-service/device gate above after performing it. Source changes alone do not satisfy these gates.
