# Plan 004: Keep auction shipping fixed from auction start

## Status
Priority P1; effort S-M; risk MED; category correctness/security; dependencies none.
Planned at `2d23cf8` plus the full uncommitted workspace on 2026-10-26.

## Why this matters
Keep auction shipping fixed from auction start. The current boundary permits a commerce or identity outcome inconsistent with the operator/buyer intent described below.

## Current state and drift check
Repository: /Users/area/live-shopping-companion. lib/commerce/engine.mjs:241-254 snapshots product and bidding terms but no shipping price. finish at lines 350-351 uses this.state.show.shippingPrice. server.mjs:766-790 permits /api/show edits during ordinary active auctions (armed runs are blocked). In-memory reproduction: start with 500 shipping, bid, change show to 2500, finish creates order shipping 2500.
Run `git diff --stat 2d23cf8..HEAD -- lib/commerce/engine.mjs server.mjs public/app.js tests/engine.test.mjs tests/commerce.test.mjs tests/server.test.mjs` and `git diff -- lib/commerce/engine.mjs server.mjs public/app.js tests/engine.test.mjs tests/commerce.test.mjs tests/server.test.mjs`. The baseline explicitly includes dirty/untracked work copied into the executor worktree; compare these anchors before editing and stop on mismatch. Preserve all existing changes.

## Conventions
Plain Node ES modules, single-host SQLite, integer USD cents, synchronous authoritative engine transitions and explicit thrown Error messages. Match node:test and strict assertions in tests/commerce.test.mjs and tests/runtime.test.mjs. Provider transports are fixture-mocked; never use real funds, account messages or credentials. docs/dev/content/developers/architecture.md states that buyer identity and server-side order ownership are authoritative. Keep local admin access distinct from buyer identity.

## Scope
Only these files may change: lib/commerce/engine.mjs server.mjs public/app.js tests/engine.test.mjs tests/commerce.test.mjs tests/server.test.mjs.
All other source files, dependencies, storage layout, unrelated UI, marketing and design are out of scope. Report if another file is required.

## Git workflow
Work only in the isolated supplied worktree on codex/commerce-auth-fixes. Commit each logical plan there with imperative commit messages; never merge, push or commit to the original checkout. Reviewer maintains plans/README.md.

## Steps and verification
1. Confirm the current-state anchors and read relevant existing tests. Run `node --test tests/engine.test.mjs tests/commerce.test.mjs tests/server.test.mjs` (skip a named new file until created); expect existing tests pass.
2. Snapshot shippingPrice in the auction when started (zero for NFTs), derive order shipping/total from that immutable value, and make active auction buyer display use that value wherever it currently reads show shipping. Show edits should affect later sales. Choose explicit safe recovery for legacy active/paused auctions without the field (do not invent previously agreed terms; block completion pending operator cancellation/restart or a documented conservative migration). Preserve buy-now order snapshots, run authorization and integer cents. Test edits before/after bidding, paused/resumed and serialized/restarted auctions, NFTs and next-auction adoption.
3. Run `node --test tests/engine.test.mjs tests/commerce.test.mjs tests/server.test.mjs`; expect all old and new regression tests pass. Run `npm run check` and `npm test`; expect exit 0. Inspect `git diff --check`; expect no errors.

## Commands
Node >=22.16. `npm ci` in isolated worktree if dependencies absent (exit 0). `npm run check` checks JS syntax; there is no separate lint/typecheck. `npm test` uses disposable fixtures. `npm run demo:check` must pass for the final combined change.

## Done criteria
All focused/full tests, syntax and diff checks exit 0; named regression scenarios exist and assert state/provider-call outcomes; only in-scope source paths changed. Each public/server path must enforce the authoritative rule rather than UI alone.

## STOP conditions
Stop and report if anchors mismatch, a required edit is outside scope, verification fails twice after reasonable correction, real provider access is required, or safe backwards compatibility cannot be specified. Never loosen authority checks just to make a fixture pass.

## Maintenance
Future fulfillment/login/auction/proxy entry points must use the same server rule. Preserve recorded payment uncertainty, HttpOnly sessions, immutable order totals and local-only bootstrap. Real Twitch/browser/Caddy rehearsal remains an explicit release gate; automated fixtures cannot certify it.

## Execution review refinements
Legacy recovery requirements: check missing snapshot before changing auction status or stock; permit explicit cancellation. tick must pause a legacy live auction for cancellation/restart rather than throwing into the global backend halt path. Test no order, no inventory mutation and engine remains available.

## Completion review
DONE — APPROVED 2026-10-26. Implemented on codex/commerce-auth-fixes in `/Users/area/.codex/worktrees/commerce-auth-fixes/live-shopping-companion`; baseline 8921741, final 1f0c315. Independent reviewer syntax/full tests (156 passed), demo and diff checks passed. See canonical original checkout plans/README.md for review and release limits.
