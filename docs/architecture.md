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

`paid | test-paid → refunded` (before shipment or NFT authorization only)

NFT orders use `paid | paid-external → delivered`; demo NFT fulfillment is `test-delivered`.

Demo identities cannot place live purchases. Buyer endpoints check server-side ownership. Shipping is private to the buyer and local creator. Receipt JSON excludes address/email. Cancellation/restock occurs once. Paid orders require a refund instead of cancellation.

## Payment adapter

Checkout sessions use server-owned order amount, currency, shipping and order ID, with a per-order API idempotency key. Per-order locks prevent competing checkout/cancel/refund operations within the single server process. Returning from checkout has no authority over payment status.

Signed raw-body Stripe events must match session/order ID, USD total and environment. Duplicate event IDs are persisted and ignored. Completed but unpaid sessions remain processing; async success marks paid; failed/expired sessions release stock once. Payment that completes during cancellation is reconciled and cannot be silently voided. Refunds restore stock only after provider success. The app requests full refunds for unshipped verified payments; it does not automate external-payment or shipped-order refunds.

Tests use real SDK signature verification with fixture events and mocked Stripe network methods. Real credentials/provider checkout have not been exercised here.

## Companion

Codex receives catalog, sanitized auction and order-status snapshots. It can propose start-next, pause, resume or a structured listing draft. The full proposed draft is shown before Apply. The server revalidates actual stock/state/fields at execution. Models cannot set winners or payment status. Shell execution tools are disabled and provider secrets are excluded from the subprocess environment. Authentication remains with the official local CLI.

## Runtime

Admin capabilities are random and regenerated at restart. Bootstrap requires a loopback connection, a permitted localhost Host, no forwarding headers and valid origin context; a public tunnel must preserve its external hostname. Viewer cookies are HttpOnly and SameSite, and Secure with an HTTPS public URL. Origin checks and session-scoped mutation rate limits protect local/viewer endpoints. Every text field is escaped in UI rendering; photos are restricted to PNG/JPEG/WebP signatures and size-limited.

State uses transactional SQLite (WAL/full synchronization) with a single-writer guard, revisions and relational constraints. See [storage](storage.md). It is not a distributed transaction log. Data includes private order/address information and must not be published. Pending auction and buy-now orders receive a persisted 15-minute reservationExpiresAt deadline. The engine expires overdue untouched orders and restores stock exactly once. A checkout ID or persisted checkoutCreated marker prevents local expiry, including across restart or uncertain network responses. Reservation deadlines are persisted when orders are created and enforced across restart. Checkout entry and manual payment changes check expiry synchronously, so the periodic timer is not the enforcement boundary. A production service still needs preauthorization/anti-abuse, seller policies and operations beyond this hackathon implementation.

## NFT fulfillment

NFT orders complete at verified finalized transfer of the exact advertised asset to the buyer-confirmed wallet, rather than at physical shipping. Delivery intent and transaction evidence persist in SQLite; lost signer responses reconcile by stable ID. Actual signing uses an operator-configured constrained wallet bridge or scoped agent tools. See [NFT delivery](nft-delivery.md) for supported standards, authorization, finality checks and the boundary with provider redemption.

## Accounting

Seller cost annotations persist separately from buyer-visible orders. Creator snapshots derive report rows from payment/refund status and explicit costs; public snapshots omit them. See [sales accounting](accounting.md) for formulas and limits.

## Deployment and UI boundaries

`marketing/` is the independent static Cloudflare Pages target. Its build emits `marketing/dist`, copies only allowlisted brand assets, and has no backend runtime, API client or session handling. It owns its styles rather than consuming the workspace cascade. The workspace server no longer serves the marketing page. See [marketing setup](../marketing/README.md).

The workspace UI is a separate same-origin application served by server.mjs. `workspace-navigation.js` owns navigation/account presentation; `activity-feed.js` owns attention rules and compact semantic feed rendering; `tutorial.js` owns optional orientation. These presentation modules receive snapshots and emit markup or navigation callbacks. They do not create payment, shipping or wallet authority. Existing server/domain modules own those transitions and persistence. This remains an incremental separation; app.js still coordinates forms, snapshots and actions.

## Public projection and reveal service

`lib/public-state.mjs` explicitly projects companion display fields and confirmed pull facts. Custom instructions remain creator-only. `lib/rip-session.mjs` owns observation revisions, selection IDs and confirmation. Late network results cannot overwrite newer reviews. Confirmed pulls and host messages share one workspace commit; no camera images are stored. The browser owns capture and disposes tracks on section exit.

A fresh live companion is offline until a real provider is selected. Scripted replies and sample inventory belong to opt-in practice. Sample products carry `practiceOnly` provenance, checked both when switching to live and at auction/buy-now entry.

Checkout requests persist their exact payload before the provider call. Definitive initial parameter/authentication rejection releases the attempt marker; uncertain outcomes keep stock reserved. Automatic retries stop before Stripe’s idempotency retention boundary. In Orders, “Reconcile with Stripe” accepts an existing session/refund ID and verifies ownership and amount against the provider. No unchecked “force paid” or “clear uncertain refund” path is added. Terminal provider-confirmed failed/canceled refunds release the fulfillment hold, retain attempt history and allow a new attempt-specific key. Successful refunds cannot regress from a late pending response.

## Admin audit

Authenticated admin POST actions, sensitive CSV downloads and streamer sign-in initiation are logged in the private SQLite `audit_events` table. Verified streamer sign-in completion and scoped NFT-agent submissions are also recorded. A request receives a started record before dispatch and a completed/rejected/interrupted outcome. Unfinished starts are marked interrupted on the next exclusive writer startup. This is a record of request execution, not proof of external payment/delivery success.

Audit records retain request ID, local actor, time, method/path, safe operation/known target identifiers where available, HTTP status and outcome. Bodies, query strings, prompts, passwords, API keys and addresses are excluded. They are separate from the capped domain activity feed and workspace snapshot commits; backups include the table. The admin-only cursor API `/api/audit?before=<id>` pages the full history. Activity → Audit history exposes it in the workspace. Public state/SSE omit audits. Writes fail closed by halting the backend on audit-storage failure. The log is append-only through application code, not cryptographically tamper-evident against someone who controls the local database. No automatic retention/deletion schedule is added.
