# Autoloot state and trust boundaries

## HTTP runtime and hosted direction

Both local Node and hosted Cloudflare editions use the same native Hono route
modules in `lib/http/`. Node-specific socket and asset handling lives in
`node-platform.mjs` and `node-assets.mjs`. SSE uses Fetch ReadableStreams.
The local listener retains connection/time limits and graceful shutdown.

The hosted entry `cloudflare/worker.mjs` uses owner-verified Twitch OAuth,
Durable Object SQLite as the authoritative workspace writer, D1 for queryable
revisioned projections/account ownership, R2 for uploads and an outbound local
Codex/vision bridge. Marketing remains a separate Pages/Workers static build.
See [hosted runtime](/docs/developers/hosted-migration) for configuration and verification.

## Auctions

`ready → live ⇄ paused → sold | unsold | cancelled`

One active/paused auction per workspace. Money is integer USD cents. The initial bid meets the opening price; later bids meet highest + increment. The current leader cannot place another direct bid, but may raise a private maximum (`bidding.md`) without raising the payable price. Late accepted bids reset the clock to ten seconds when anti-sniping is on. Receipt at/after the deadline is rejected and closes the auction. Pausing stores remaining time and resuming sets a new deadline. A sale reserves one unit and creates one immutable pending order snapshot.

Live bids require verified, registered, unblocked Twitch identity. Shared-chat events from other channels cannot buy inventory. Bid voiding requires pause and marks the record voided, then selects the previous valid bid. Auctions with private maximums require cancellation instead of bid voiding. Blocking the current leader requires cancelling the auction first. Restart and chat disconnect pause bidding; missing chat is not replayed.

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

Optional physical-order USDC checkout (`crypto-checkout.md`) verifies finalized Solana mainnet receipts and retains inventory holds until payment or safe cancellation is verified. Refunds are seller-managed.

## Companion

Codex receives catalog, sanitized auction and order-status snapshots. It can propose start-next, pause, resume or a structured listing draft. The full proposed draft is shown before Apply. The server revalidates actual stock/state/fields at execution. Models cannot set winners or payment status. Shell execution tools are disabled and provider secrets are excluded from the subprocess environment. Authentication remains with the official local CLI.

## Runtime

Administrator setup/login uses a username and salted scrypt password hash (legacy password-only accounts remain supported). HttpOnly SameSite=Strict sessions lasting 12 hours, or 30 days with Remember me, are stored hashed in memory and revoked at logout or restart. Creator requests require both a valid session and the random capability regenerated at restart. Bootstrap also requires a valid session and a loopback connection, a permitted localhost Host, no forwarding headers and valid origin context; a public tunnel must preserve its external hostname. Viewer cookies are HttpOnly and SameSite, and Secure with an HTTPS public URL. Origin checks and session-scoped mutation rate limits protect local/viewer endpoints. Every text field is escaped in UI rendering; photos are restricted to PNG/JPEG/WebP signatures and size-limited.

State uses transactional SQLite (WAL/full synchronization) with a single-writer guard, revisions and relational constraints. See [storage](/docs/developers/storage). It is not a distributed transaction log. Data includes private order/address information and must not be published. Pending auction and buy-now orders receive a persisted 15-minute reservationExpiresAt deadline. The engine expires overdue untouched orders and restores stock exactly once. A checkout ID or persisted checkoutCreated marker prevents local expiry, including across restart or uncertain network responses. Reservation deadlines are persisted when orders are created and enforced across restart. Checkout entry and manual payment changes check expiry synchronously, so the periodic timer is not the enforcement boundary. A production service still needs preauthorization/anti-abuse, seller policies and operations beyond this hackathon implementation.

## NFT fulfillment

NFT orders complete at verified finalized transfer of the exact advertised asset to the buyer-confirmed wallet, rather than at physical shipping. Delivery intent and transaction evidence persist in SQLite; lost signer responses reconcile by stable ID. Actual signing uses an operator-configured constrained wallet bridge or scoped agent tools. See NFT delivery (`nft-delivery.md`) for supported standards, authorization, finality checks and the boundary with provider redemption.

## Accounting

Seller cost annotations persist separately from buyer-visible orders. Creator snapshots derive report rows from payment/refund status and explicit costs; public snapshots omit them. See sales accounting (`accounting.md`) for formulas and limits.

## Deployment and UI boundaries

`apps/marketing/` is the independent static Cloudflare Pages target. Its build emits `apps/marketing/dist`, copies only allowlisted brand assets, and has no backend runtime, API client or session handling. It owns its styles rather than consuming the workspace cascade. The workspace server no longer serves the marketing page. See marketing setup (`../apps/marketing/README.md`).

The workspace UI is a separate same-origin application served by server.mjs. `workspace-navigation.js` owns navigation/account presentation; `activity-feed.js` owns attention rules and compact semantic feed rendering; `tutorial.js` owns optional orientation. These presentation modules receive snapshots and emit markup or navigation callbacks. They do not create payment, shipping or wallet authority. Existing server/domain modules own those transitions and persistence. This remains an incremental separation; app.js still coordinates forms, snapshots and actions.

## Public projection and reveal service

`lib/commerce/public-state.mjs` explicitly projects companion display fields and confirmed pull facts. Custom instructions remain creator-only. `lib/commerce/rip-session.mjs` owns observation revisions, selection IDs and confirmation. Late network results cannot overwrite newer reviews. Confirmed pulls and host messages share one workspace commit; no camera images are stored. The browser owns capture and disposes tracks on section exit.

A fresh live companion is offline until a real provider is selected. Scripted replies and sample inventory belong to opt-in practice. Sample products carry `practiceOnly` provenance, checked both when switching to live and at auction/buy-now entry.

Workspace VN speech is scoped to the visible Companion page or the companion drawer’s Chat tab. Initial login, opening a conversation and messages received while hidden establish a silent baseline. Only new replies while that conversation stays visible can speak, with companion and voice enabled and the live state connection healthy. Leaving the conversation cancels audio and mouth animation. OBS overlay voice has its own event/countdown lifecycle and remains independent.

Checkout requests persist their exact payload before the provider call. Definitive initial parameter/authentication rejection releases the attempt marker; uncertain outcomes keep stock reserved. Automatic retries stop before Stripe’s idempotency retention boundary. In Orders, “Reconcile with Stripe” accepts an existing session/refund ID and verifies ownership and amount against the provider. No unchecked “force paid” or “clear uncertain refund” path is added. Terminal provider-confirmed failed/canceled refunds release the fulfillment hold, retain attempt history and allow a new attempt-specific key. Successful refunds cannot regress from a late pending response.

## Admin audit

Authenticated admin POST actions, sensitive CSV downloads and streamer sign-in initiation are logged in the private SQLite `audit_events` table. Verified streamer sign-in completion and scoped NFT-agent submissions are also recorded. A request receives a started record before dispatch and a completed/rejected/interrupted outcome. Unfinished starts are marked interrupted on the next exclusive writer startup. This is a record of request execution, not proof of external payment/delivery success.

Audit records retain request ID, local actor, time, method/path, safe operation/known target identifiers where available, HTTP status and outcome. Bodies, query strings, prompts, passwords, API keys and addresses are excluded. They are separate from the capped domain activity feed and workspace snapshot commits; backups include the table. The admin-only cursor API `/api/audit?before=<id>` pages the full history. Activity → Audit history exposes it in the workspace. Public state/SSE omit audits. Writes fail closed by halting the backend on audit-storage failure. The log is append-only through application code, not cryptographically tamper-evident against someone who controls the local database. No automatic retention/deletion schedule is added.

## Module ownership

The executable composition/lifecycle root is `server.mjs`. Its common request policy lives in `lib/http/policy.mjs`: ingress and request accounting, admin identity, audit, diagnostics, halted guard, viewer session and rate policy precede domain dispatch. Route factories receive explicit services and return whether they handled the request. Authentication is not inferred from route-module imports. JSON/raw-body helpers, role projections, OAuth/viewer, media/static/exports and admin command groups have separate modules. The SSE hub revalidates admin sessions on broadcast, drain and keepalive, coalesces blocked writes and releases request accounting after subscription.

Only existing Engine/domain commands mutate authoritative orders, stock and payment/fulfillment state. This refactor does not introduce independent route-level commits for one domain transition. Provider credentials and live data stay outside source snapshots.

The browser shell coordinates state/navigation. Importable workspace views consume state; controls receive current-state accessors and explicit transport/dialog dependencies. Connection lifecycle versions asynchronous viewer refreshes, invalidates pending work on close, and replaces subscriptions after credential recovery. `pageshow` resumes a restored page. Product dialogs intentionally retain the product/draft reviewed at opening while reading current state for each new opening.

Styles load from one ordered entry. Base geometry, brand treatments, features and final surface refinements remain ordered as documented in `public/styles/README.md`. A source-cascade fingerprint guards this behavior-preserving migration; it does not replace rendered visual review. `npm run check` discovers new runtime modules and detects missing local imports. Tests use disposable data and provider fixtures.

## Buyer refresh invalidation

Public snapshots include an opaque process-keyed `viewerRevision`. The server computes it once per public projection from commerce sources, including orders, registrations, payment/provider availability and private giveaway state. It exposes no buyer fields or reusable unkeyed digest. Chat-only changes leave the token stable. The shop skips rebuilding identical public displays when only the server timestamp changes. Computing this token still scans the source data; this avoids one private-history request per shopper per chat event without changing the storage architecture. Add new buyer-visible private state to this invalidation input when extending the viewer response.

The shop applies public auction updates immediately using cached buyer state. One coalesced worker refreshes private data on a revision change, after reconnect, or on the next event after 30 seconds since the last read. Startup always reads private data; local buyer actions remain authoritative in the cache through an explicit accessor. Slow private requests cannot hold up public bidding displays, and stale connection responses are discarded. Server authorization and commerce checks continue to decide every action.

## Inline giveaway drafts

Giveaway setup, practice-entry, Channel Points and prize-dispatch forms opt into transient draft restoration during unrelated live updates. Each form has a stable key for its exact mode and entity; prize dispatch also includes the recipient revision. Text, textarea, selections and checked states are restored inside that form only. Different pages, modes, giveaway generations or recipients receive no old draft or consent. Password, file, hidden and credential fields are excluded. Modals and private maximum bids retain their own lifecycle rather than joining this snapshot mechanism.

Pending giveaway submissions remain disabled after a live rerender, reject duplicate clicks and recover when their request succeeds or fails. Successful submission resets the matching draft; drafts are not stored across reloads. Focused search inputs restore by their unique ID and, when present, their containing form ID. The helper never restores a field merely because another form has the same input name.

### Store access and draft mode

Settings → Store access configures an optional storefront password and independent draft flag. `lib/http/store-access.mjs` protects shop, public state/events and viewer APIs; authenticated administrators on an allowed admin host bypass the preview gate. Store passwords use salted scrypt hashes persisted in private state. Preview cookies are HttpOnly, process-signed, expire after 12 hours, and bind to the current password hash. The bounded unlock form rate-limits attempts. Changing store settings closes public SSE connections; clients must authenticate again on reconnect. Browser projections expose only `draft` and `passwordProtected`, never hashes.

Draft mode blocks new viewer mutations, auction/run starts, shipping purchases/dispatch and digital/prize fulfillment routes. Engine start/bid/buy/ship guards also reject draft activity, including chat-driven sales. Stop active auctions and runs before changing store access. Provider webhooks, checkout reconciliation and refunds stay enabled to account for existing payments. Draft mode does not revoke payment links already created or undo transfers/shipments already submitted to providers. Public preview renders a draft notice. Store password access does not grant buyer identity or administrator permissions.

### Twitch command settings

Settings → Chat commands lets the administrator enable or disable `!bid`, `!vote`, `!enter`, `!register` and `!lot`. Defaults preserve all commands enabled. The administrator-only `/api/chat/commands` action validates every toggle and persists `chatCommands`; Twitch's event handler checks it before executing a recognized command. This controls Twitch chat entry points, not separate storefront or administrator actions. Command names and argument formats remain fixed.

Munny's default response instruction is one direct sentence under 30 words, with no greeting or recap; explicitly requested detail may use up to 90 words. This is a model presentation instruction, not a transaction or authorization rule.

Local marketing preview: `npm run marketing:dev` serves the built static site at `http://localhost:4174`, rebuilding edited HTML/CSS on refresh. `MARKETING_PORT` overrides its port; `WORKSPACE_URL` sets the workspace destination at build time. This preview is separate from workspace (4173), user docs (3333) and developer docs (3334).

### Studio and show navigation

`createStudioViews()` exposes `studio()` for the persistent hero, workspace overview and setup checklist, and `showPage()` for the hosting controls. The `show` workspace destination is labeled **Your show** in desktop and mobile navigation. Adding inventory or loading practice lots does not replace Studio. Settings and the guided tour link to the hosting destination explicitly.

Practice listings use original vector placeholders. Third-party card scans are not bundled. Saved `/demo/cards/` image references fall back to placeholders; seller images remain intact. The live Metadata catalog supplies validated HTTPS image URLs, which browsers load directly from the provider host. The identity-only demo snapshot contains no artwork. API access does not establish publication rights for catalog artwork. Integration names use original functional icons rather than official logos.

### Chalkboard stream presets

The `chalk-auction` (960 × 500) and `chalk-vote` (1000 × 550) public overlay presets map to the same auction/vote state projection as the compact widgets. `overlayPreset` chooses styling while `overlayType` controls behavior, so decorative presets do not enable companion audio on otherwise silent widgets. The bundled Patrick Hand font is licensed under OFL in `public/fonts/chalk/`. `overlay-chalk.css` keeps panels transparent and uses yellow titles, blue bidder names, mint amounts and pink clocks. Accepted bids remain the authoritative price source.

Streamers can copy these URLs from Settings → Stream, add them as independent OBS Browser Sources, and layer them alongside a StreamElements overlay. This is browser-source interoperability, not an installed StreamElements account integration; third-party iframe framing remains blocked by the existing CSP. Setup and dimensions are in `creative/video/munny-shop/stream/STREAMER-SETUP.md`.


The local Munny shop relay exposes a minimal public auction snapshot (id, productId, status, bidCount, title, opening price) alongside companion display state. Its live room introduces newly started lots and plays local original WAV cues for increasing accepted bid counts and transitions to sold. It suppresses startup/reconnect replay; rejected bids, count decreases and cancellations do not trigger sale sounds. Only the room owns audio; the auction/vote browser widgets stay silent. `sound=1` enables audio and `sfx=0` independently disables event effects. The native OBS browser-source setup requires no StreamElements account.

The Munny live room uses the bundled VN-TTS synthesizer for dialogue. Accepted bid effects gate speech for 700ms (sale effects 1200ms), so the register cue precedes babble. Overlay timers sit above the price, bidder names share the price row, and listing metadata yields RAW or GRADED labels; unverified slab listings stay marked unverified.

Full-size Munny dialogue uses symmetric 170px screen margins. The native chalk widget places format metadata to the right of the title, uses a 98px timer, and offsets bidder text to visually center it against the price glyphs. The practice edit omits the corner banner; practice context remains in the spoken/text introduction.

## Coming-soon flags

Node and Cloudflare initialize immutable per-engine feature flags from the runtime environment: `AUTOLOOT_RIP_STUDIO=1` and `AUTOLOOT_GIVEAWAYS=1`. Only the exact string `1` enables a feature; both default off. Flags are configuration, not persisted workspace state or client-controlled settings. Public and administrator snapshots expose the resolved `features.ripStudio` and `features.giveaways` booleans.

HTTP middleware rejects all `/api/rip/*` endpoints when disabled, including frame upload and provider selection. Catalog and photo-listing endpoints remain independent. Engine guards reject giveaway creation and entry from both HTTP and Twitch; existing close, cancellation, draw, claim and dispatch operations remain available to preserve outstanding prize obligations. Navigation displays coming-soon pages and retains existing giveaway management there.

`AUTOLOOT_NFT=1` enables `features.nft` (default off). Engine guards cover NFT inventory creation, edits and new auction/direct sales, including agent-run and import callers. Import preview clones inherit the engine flags. Public product projections exclude NFT listings while disabled. Existing orders and delivery reconciliation remain available; switching this flag off does not cancel existing auctions, orders or authorized transfers.
