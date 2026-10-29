# Latest implementation audit: bounded-run expiry

Audited283f098 on codex/rip-draft-fixes at /Users/area/.codex/worktrees/rip-draft-fixes/live-shopping-companion. This is the latest implementation, not yet merged into main49c7c59. Standard read-only improve pass; prior plans020–021 reconciled. Focus expanded to agent runs, Twitch scheduling, NFT verification/wallet reconciliation and latest form lifecycle. No source edits.

## Vetted finding RUN-01

Enforce bounded-run expiry synchronously on auction bid entry.

Evidence: lib/runs.mjs110 pauses expired runs only from Runs.tick; server.mjs125–130 calls that after Engine.tick in a200ms loop. lib/engine.mjs277–281 direct bids and lib/max-bids.mjs49–58 private maxima check live auction/deadline, not owning run expiry. Buy-now (engine525–527) and auction resume already check run expiry synchronously. docs/agent-led-runs.md48,81 states bounded authorization/deadlines stop new sales and preserve existing orders.

Impact: a run auction whose own duration exceeds the arming window accepts bids after operator authorization expires until the next runner poll. Slow/event-loop-delayed polling enlarges the gap. Accepted public bid/ceiling state changes before the runner pauses it. This is an input-boundary correctness defect, not an assertion of unauthorized transfer/payment completion.

Reproduction: isolated in-memory Engine+Runs fixture, show.bidDuration3600, arm minutes1, one-unit product auction. Start run, set injected now=run.expiresAt+1 without polling. Direct bid$5 accepts highest500; separate identical fixture private max$10 also accepts highest500. Calling Runs.tick afterward sets both run and auction paused. Reviewer independently reproduced both paths; agent also checked registered live identities.

Effort S–M; risk MED; confidence HIGH. Fix sketch: common authoritative owning-run guard at bid resolution boundary, preserving accepted bids and paid order actions; test exact expiry, before/after expiry, direct/max path, paused/stopped/mismatched runs and unchanged bid/ceiling state after rejection. Do not rely solely on shortening timer interval. Define ordering with auction end and operator finish explicitly.

## Verification and rejected candidates

npm run check82 passed; npm test258/258 passed; npm audit zero advisories. Reviewers ran18 draft/Rip tests,21 run/Twitch tests and8 NFT tests. Existing tests do not cover late run-owned auction bids.

No additional high-confidence issue in exact NFT asset/source/recipient/finality checks, fee limits, stable transfer lookup, current draft scope/secret exclusions, pending form recovery or fixed pull confirmation. Previously resolved Help, ghost pulls, tracking-form mixing and search regressions not re-reported. Trusted local signer/RPC configuration, sync SQLite, raise-only maxima and proxy-auction cancellation remain deliberate documented boundaries, not findings.

## Direction / next investments

Prioritize deadline guard before new runner formats. Two separate validation investments remain grounded: automated browser regressions (current CI .forgejo/workflows/check.yml13–16 runs syntax/Node/demo only) and real-account/device rehearsal (docs/live-rehearsal.md17–50). Neither is evidence of a new source defect. No architecture rewrite or dependency migration justified.

Not audited: real RPC/signer/provider behavior, funded-wallet operations, live Twitch/Stripe/Shippo accounts, production load/proxy setup, all marketing assets or full accessibility. Await user selection before implementation plan/source changes; recommended next plan is RUN-01.
