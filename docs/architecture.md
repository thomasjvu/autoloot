# Autoloot state and trust boundaries

## Auctions

`ready → live ⇄ paused → sold | unsold | cancelled`

One active/paused auction per workspace. Money is integer USD cents. The initial bid meets the opening price; later bids meet highest + increment. The current leader cannot outbid themselves. Late accepted bids reset the clock to ten seconds when anti-sniping is on. Receipt at/after the deadline is rejected and closes the auction. Pausing stores remaining time and resuming sets a new deadline. A sale reserves one unit and creates one immutable pending order snapshot.

Live bids require verified, registered, unblocked Twitch identity. Shared-chat events from other channels cannot buy inventory. Bid voiding requires pause and marks the record voided, then selects the previous valid bid. Blocking the current leader requires cancelling the auction first. Restart and chat disconnect pause bidding; missing chat is not replayed.

## Purchases and orders

Direct purchases require a listed buy-now price, stock, registration in Live mode, and no current auction on that product. A buyer/request ID pair is idempotent. Stock is reserved synchronously when the pending order is created.

`pending → processing → paid → shipped`

`pending → test-paid | paid-external → shipped`

`pending → cancelled | expired`

`paid | test-paid → refunded` (before shipment only)

Demo identities cannot place live purchases. Buyer endpoints check server-side ownership. Shipping is private to the buyer and local creator. Receipt JSON excludes address/email. Cancellation/restock occurs once. Paid orders require a refund instead of cancellation.

## Payment adapter

Checkout sessions use server-owned order amount, currency, shipping and order ID, with a per-order API idempotency key. Per-order locks prevent competing checkout/cancel/refund operations within the single server process. Returning from checkout has no authority over payment status.

Signed raw-body Stripe events must match session/order ID, USD total and environment. Duplicate event IDs are persisted and ignored. Completed but unpaid sessions remain processing; async success marks paid; failed/expired sessions release stock once. Payment that completes during cancellation is reconciled and cannot be silently voided. Refunds restore stock only after provider success. The app requests full refunds for unshipped verified payments; it does not automate external-payment or shipped-order refunds.

Tests use real SDK signature verification with fixture events and mocked Stripe network methods. Real credentials/provider checkout have not been exercised here.

## Companion

Codex receives catalog, sanitized auction and order-status snapshots. It can propose start-next, pause, resume or a structured listing draft. The full proposed draft is shown before Apply. The server revalidates actual stock/state/fields at execution. Models cannot set winners or payment status. Shell execution tools are disabled and provider secrets are excluded from the subprocess environment. Authentication remains with the official local CLI.

## Runtime

Admin capabilities are random and regenerated at restart. Bootstrap is restricted to localhost Host names; a public tunnel must preserve its external hostname. Viewer cookies are HttpOnly and SameSite, and Secure with an HTTPS public URL. Origin checks and session-scoped mutation rate limits protect local/viewer endpoints. Every text field is escaped in UI rendering; photos are restricted to PNG/JPEG/WebP signatures and size-limited.

State uses transactional SQLite (WAL/full synchronization) with a single-writer guard, revisions and relational constraints. See [storage](storage.md). It is not a distributed transaction log. Data includes private order/address information and must not be published. Pending auction and buy-now orders receive a persisted 15-minute reservationExpiresAt deadline. The engine expires overdue untouched orders and restores stock exactly once. A checkout ID or persisted checkoutCreated marker prevents local expiry, including across restart or uncertain network responses. Reservation deadlines are persisted when orders are created and enforced across restart. Checkout entry and manual payment changes check expiry synchronously, so the periodic timer is not the enforcement boundary. A production service still needs preauthorization/anti-abuse, seller policies and operations beyond this hackathon implementation.

## NFT fulfillment

NFT orders complete at verified finalized transfer of the exact advertised asset to the buyer-confirmed wallet, rather than at physical shipping. Delivery intent and transaction evidence persist in SQLite; lost signer responses reconcile by stable ID. Actual signing uses an operator-configured constrained wallet bridge or scoped agent tools. See [NFT delivery](nft-delivery.md) for supported standards, authorization, finality checks and the boundary with provider redemption.

## Deployment and UI boundaries

`marketing/` is the independent static Cloudflare Pages target. Its build emits `marketing/dist`, copies only allowlisted brand assets, and has no backend runtime, API client or session handling. It owns its styles rather than consuming the workspace cascade. The workspace server no longer serves the marketing page. See [marketing setup](../marketing/README.md).

The workspace UI is a separate same-origin application served by server.mjs. `workspace-navigation.js` owns navigation/account presentation; `activity-feed.js` owns attention rules and compact semantic feed rendering; `tutorial.js` owns optional orientation. These presentation modules receive snapshots and emit markup or navigation callbacks. They do not create payment, shipping or wallet authority. Existing server/domain modules own those transitions and persistence. This remains an incremental separation; app.js still coordinates forms, snapshots and actions.
