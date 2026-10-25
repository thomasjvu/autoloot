# Autoloot roadmap

The hackathon demo is a Twitch-native TCG show: chat vote → creator-approved lot → standard or sudden-death auction → private winner order → checkout. Show the rip assistant as a prototype: capture → visible identity → Metadata candidates → streamer confirmation → host reaction. Separate simulated payments from provider-verified payment and observed text from confirmed card identity.

## Implemented auction formats

Standard: a bid accepted with less than 10 seconds remaining resets remaining time to 10 seconds. Sudden death: bids do not alter the fixed deadline. Server receipt time determines eligibility; bids at or after the deadline are rejected. Pause and cancellation remain explicit creator controls. Buy-now listings reserve inventory and use private order checkout.

## Phase 1: prove the demo

Verify Twitch with two real accounts, complete Stripe sandbox checkout and webhook delivery, restore Metadata API access, validate recognition against real packs/cards and check OBS audio. Capture one short end-to-end run before adding more commerce formats.

## Agent-led run direction

Autoloot remains standalone. A bounded runner for existing item auctions and fixed-price sales is implemented. Personal pack openings and inventory-backed card breaks with disclosed entitlements remain next. See [Agent-led runs](agent-led-runs.md) for planned formats, arming limits, deterministic allocation, payment/fulfillment boundaries and the build sequence. Only the bounded auction/buy-now runner is enabled; new break formats remain planned.

## Phase 2: private max bids

Introduce a private per-buyer ceiling in integer cents, visible only to its owner and the bid resolver. Resolve competition atomically by the existing increment schedule; never exceed a ceiling. Earliest accepted ceiling wins an equal-ceiling tie. Public events expose only the resulting payable bid, never private budgets. Specify raising/lowering, blocked bidders, cancellation and anti-sniping behavior before implementation. Verify concurrency, retries, deadline boundaries, privacy and order price snapshots.

## Phase 3: pre-bids

Add scheduled lots with explicit open/close times and immutable bidding terms. Accept verified registered buyers only. Carry eligible bids into the live auction through the same resolver; inventory cannot overlap with buy-now or another auction. Define cancellation, notification and unsold behavior. Test transition ordering and reconnection without double reservation.

## Phase 4: giveaways

Separate free entry from purchases/bids. Publish eligibility and entry window, deduplicate verified identities and freeze the eligible roster at close. Use cryptographic randomness and persist the roster digest, draw record and result. Specify reroll/disqualification and private winner contact before release. No payment required; no paid odds.

## Phase 5: offers and flash sales

Build expiring seller-approved offers and timed fixed prices on the existing reservation/payment engine. Handle simultaneous acceptance, checkout expiration, price snapshots and stock recovery idempotently. Validate provider payment and refunds before live use.

## Companion expansion

Continuous screen/camera reveal recognition, user-correctable identities, explicit physical-copy tracking, durable pull sessions and provenance-preserving collection export. Keep market guides distinct from sold comparisons and never infer grade, authenticity or guaranteed returns. Stage-test latency and false matches before enabling automatic public card/price announcements.

Whatnot synchronization is outside this roadmap. Twitch is the primary venue; Metadata supplies TCG identity and market data.

## Beta release communication

Defer the public changelog and its navigation entry until the beta is ready. At beta, publish the first release notes with verified shipped features and known limits.
