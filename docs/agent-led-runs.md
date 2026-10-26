# Agent-led runs

Status: the bounded runner for existing item auctions and fixed-price sales is implemented. Break allocation and new payment providers remain planned. A constrained wallet bridge is implemented; the operator supplies and verifies the signer. See the operator guide below for the implemented limits.

## Product boundary

Autoloot is a standalone Twitch live-commerce application. Its engine owns inventory, prices, orders and payment verification. An agent can host and schedule a run through bounded commands; it cannot bypass the engine or change a buyer's entitlement. Existing standard/sudden-death auctions and buy-now sales remain the implemented commerce formats.

Support autonomous operation of defined purchases, with published allocation rules and a purchased entitlement for every buyer. Format availability must reflect the actual platform, provider and jurisdiction. A format being supported by another marketplace is not authorization for this application. Whatnot integration is outside this scope.

## Format roadmap

| Format | Buyer entitlement | Delivery condition | Implementation status |
| --- | --- | --- | --- |
| Item auction | The exact listed item | Verified payment | Implemented, including bounded automated sequencing |
| Fixed-price sale | The listed item and quantity | Verified payment | Implemented, including bounded automated sequencing |
| Personal pack opening | All disclosed contents of the purchased sealed pack | Confirmed payment and continuous opening visibility | Planned; physical opening requires an operator |
| Pick-your-team/character break | Every included card matching the purchased criterion, with a disclosed minimum-card fulfillment rule | All allocations accounted for, payment settled and product opened under published rules | Planned |
| Random-assignment break | A purchased break entitlement assigned under a fixed, published algorithm; each purchase receives its required card allocation | Frozen paid roster, recorded assignment and complete fulfillment mapping | Planned; requires separately validated randomness and format policy |
| Hit draft | A guaranteed card selection under a published draft order and timeout rule | No more spots than distributable cards; paid roster frozen before reveal | Planned; requires interaction/timeout design |
| Disclosed surprise set | One complete eligible product from a finite, disclosed pool per purchase | Inventory-backed allocation without replacement; no rerolls | Later policy/provider-specific investigation |

A physical break is not automatically fulfilled by sending an unrelated digital token. Digital fulfillment can close an order only when the delivered asset represents the purchased entitlement and its provider terms support the promised ownership/redemption rights. Otherwise physical fulfillment remains outstanding.

## Run policy

An approved run definition freezes:

- Format, eligible inventory, sealed product identity and ownership/custody evidence.
- Price/opening price, slot count, increments and sales deadline.
- Each slot's entitlement, minimum delivery, bulk/base allocation, unmatched-card and multi-team-card handling.
- Assignment algorithm, randomness source if needed, draft ordering and disconnection/timeout behavior.
- Payment settlement requirement, cancellation/refund rules and fulfillment method.
- Cost basis, spending limit, minimum net proceeds, fee assumptions and contingency.

Rules become immutable when the first purchase is accepted. Unsold inventory is not silently assigned to the operator. Do not open a multi-buyer break until all contents are accounted for and the stated payment conditions hold. Missed funding deadlines follow the disclosed cancellation/refund path. A fixed-price run may enforce a minimum proceeds threshold; an auction cannot promise a margin unless the enforceable reserve/commitment conditions actually cover costs. Never change slot count, odds or entitlements mid-run to improve margin.

## Execution model

`draft → validated → armed → selling → sales-closed → payment-settled → allocation-locked → revealing → fulfilling → reconciled → completed`

Failure paths enter `paused`, `refund-pending` or `manual-review`; they do not silently skip settlement or delivery. Ordinary item sales can omit allocation/reveal stages when their format requires neither. Terminal failed/cancelled runs must reconcile money and inventory before completion.

The agent can propose run creation, choose from eligible inventory, start an armed run, announce verified events, request the next permitted transition and produce a recap. Engine commands enforce the armed policy and use stable request IDs. Randomness/allocation outcomes are recorded once and cannot be rerolled. The agent cannot fabricate a reveal, authenticate a physical item, choose an allocation outcome or assert delivery from a submitted transaction alone.

## Autonomous operating limits

The operator arms a bounded session with permitted formats, inventory, spending limits, expiry time and stop conditions. Subsequent runs can proceed without per-action approval while those limits hold. A policy change requires re-arming. The emergency stop blocks new sales and new spending while preserving refund/reconciliation paths.

Require durable run/event storage, exclusive inventory reservations, a persistent job queue/outbox and idempotent payment/fulfillment adapters before unattended operation. The implemented single-writer SQLite store persists workspace, order and transfer intents transactionally; it is not a distributed execution system. Provider outages, ambiguous payment outcomes, missing custody proof, unsupported transactions and unexpected losses pause the run. Keep buyer funds/refund liabilities distinct from available operating capital. Budget only settled, reconciled proceeds for subsequent purchases.

Physical pack opening and condition verification remain operator tasks unless a verified external service supplies them. Agent-led hosting is not evidence that physical steps can happen unattended.

## Build sequence

1. Add persisted run definitions and an operator arming policy. Reuse current auction/buy-now commands with no new monetary mechanism.
2. Add a durable runner for existing item auctions and fixed-price listings, with bounded sequencing, pause/restart recovery and a visible audit timeline.
3. Add personal openings and deterministic break entitlements. Verify inventory/card conservation, exclusive assignment, every purchase's minimum fulfillment and unfilled-run refunds.
4. Add validated random-assignment and hit-draft formats. Publish assignment receipts and test replay, interruption and no-reroll behavior.
5. Add optional digital fulfillment adapters only after provider identity, custody, supported assets, finality and redemption terms are verified.

Use end-to-end fixtures with test payments and a physical-operator simulation for the hackathon demo. Label simulated provider outcomes. Show chat participation, the agent hosting, deterministic engine decisions and fulfillment evidence; do not describe planned formats as implemented.

## Reference policies

Reviewed October 25, 2026. These are reference constraints for product design, not legal approval or a claim of marketplace integration:

- [Whatnot Card Breaks Policy](https://help.whatnot.com/hc/en-us/articles/34107485220237-Card-Breaks-Policy): purchased card allocations, visibility, published rules, minimum card delivery and restrictions on prizes/randomizer wheels.
- [Whatnot Gambling and Purchase-Based Prize Policy](https://help.whatnot.com/hc/en-us/articles/4410443596813-Gambling-and-Purchase-Based-Prize-Policy): paid prize chances and purchase-triggered prizes are distinct from permitted purchases.
- [Whatnot Surprise Set tooling](https://help.whatnot.com/hc/en-us/articles/34545407302797-Create-and-run-a-Surprise-Set): finite product allocation and no re-randomization; tooling documentation is not a complete format policy.
- [Twitch Extension policies](https://dev.twitch.tv/docs/extensions/guidelines-and-policies/): the current app uses chat/EventSub and OBS; no commerce/NFT Extension is planned.

## Implemented operator guide

In Studio, open Agent-led run → Configure run. Select 1–20 products with exactly one unit in stock, choose Auction or Buy now for each, and arm for 1–240 minutes. Products run in inventory order. Set their prices/condition and the show auction timer, increments and shipping before arming. Fixed-price products need a buy-now price. Live runs require Twitch, owned inventory rather than sample listings, and configured checkout for fixed-price steps.

Arming snapshots the queue and show terms. Run inventory cannot be edited/removed, show mode/terms cannot change and demo inventory cannot be reset until the run stops. Queued run listings are unpublished and cannot be purchased early. Only the current fixed-price item is listed. Non-run inventory remains independent.

Auctions use the normal bid engine and its existing clock. An unsold auction advances; a sold auction or fixed-price order waits for payment, then waits for recorded physical dispatch or verified NFT delivery before advancing. Payment alone never completes fulfillment. Expired/cancelled/refunded orders and unexpected auction outcomes pause for operator review rather than automatically reselling the step. Physical shipment remains a human action.

Pause unpublishes run listings and pauses a current run auction. Resume requires a still-valid arming window and healthy live prerequisites. Stop leaves a current auction paused for manual resolution and retains orders; it does not pretend to cancel or refund them. Run deadlines stop new sales, while existing orders remain actionable. Restart always pauses an active run; explicit resume continues its existing auction/order rather than replaying it.

The run has zero inventory-purchasing allowance. Separately authorized NFT deliveries can instruct a configured wallet service under a native fee cap; this server does not hold signing keys. These limits authorize only selling existing inventory. Completed/stopped runs retain their audit; the last 20 previous runs are archived when a new run is armed. This is bounded automation inside the existing single-process app, not a distributed job queue or a new LLM execution service. The cohost speaks engine-generated sale events; open-ended AI proposals still require their existing review/apply flow.

Admin-only endpoints: POST /api/run/arm (requestId, minutes, steps containing productId and format), /api/run/pause, /api/run/resume and /api/run/stop. Public snapshots omit run definitions, histories and private orders.

Verification: npm test includes domain interruption/guard tests and a disposable HTTP journey through auction → fixed-price sale → simulated payment → recorded shipping → restart/recovery → completion. No provider credentials or external payment requests are used for that test.

See [NFT delivery](nft-delivery.md) for the implemented digital terminal state, wallet-agent protocol, supported chain verifiers and remaining provider/signing prerequisites.

## Optional per-lot review

Settings saves a next-run automation style: manual operation, review each lot, or continue an approved queue. Starting a queue still requires its explicit authorization. The run dialog snapshots `reviewEachLot` and can override the saved preference. Active runs reject preference changes.

Review runs wait in `waiting-review` before each new sale; no auction or listing opens until the operator approves that run ID and step index through `/api/run/approve`. Stale approvals fail. Approval never marks payment or fulfillment complete and does not authorize wallet spending. Restart recovery still pauses the run; resuming a pending review leaves it waiting for approval. Manual companion suggestions still require Apply.

## Companion presentation

Companion → Customize companion changes its name, tone, response preferences and optional uploaded avatar. Restore Munny restores the default profile without changing the provider or voice switches. Preferences affect Codex presentation; scripted demo replies remain rule-based. Profile settings do not grant automation, wallet or payment permissions.
