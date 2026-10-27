# Plan 002: Block live physical fulfillment funded by Stripe test payments

## Status
Priority P1; effort S; risk LOW; category correctness/security; dependencies none.
Planned at `2d23cf8` plus the full uncommitted workspace on 2026-10-26.

## Why this matters
Block live physical fulfillment funded by Stripe test payments. The current boundary permits a commerce or identity outcome inconsistent with the operator/buyer intent described below.

## Current state and drift check
Repository: /Users/area/live-shopping-companion. lib/shipping.mjs:37 checks paid status and order.mode but not paymentLive. lib/engine.mjs:448-458 allows shipping all paid statuses. lib/nft.mjs:47 already rejects live paid orders unless paymentLive===true. lib/csv.mjs:69 uses orderUpdate for tracking, while lines 87-93 independently choose export rows.
Run `git diff --stat 2d23cf8..HEAD -- lib/engine.mjs lib/shipping.mjs lib/csv.mjs public/app.js tests/commerce.test.mjs tests/shipping.test.mjs tests/csv.test.mjs` and `git diff -- lib/engine.mjs lib/shipping.mjs lib/csv.mjs public/app.js tests/commerce.test.mjs tests/shipping.test.mjs tests/csv.test.mjs`. The baseline explicitly includes dirty/untracked work copied into the executor worktree; compare these anchors before editing and stop on mismatch. Preserve all existing changes.

## Conventions
Plain Node ES modules, single-host SQLite, integer USD cents, synchronous authoritative engine transitions and explicit thrown Error messages. Match node:test and strict assertions in tests/commerce.test.mjs and tests/runtime.test.mjs. Provider transports are fixture-mocked; never use real funds, account messages or credentials. docs/architecture.md states that buyer identity and server-side order ownership are authoritative. Keep local admin access distinct from buyer identity.

## Scope
Only these files may change: lib/engine.mjs lib/shipping.mjs lib/csv.mjs public/app.js tests/commerce.test.mjs tests/shipping.test.mjs tests/csv.test.mjs.
All other source files, dependencies, storage layout, unrelated UI, marketing and design are out of scope. Report if another file is required.

## Git workflow
Work only in the isolated supplied worktree on codex/commerce-auth-fixes. Commit each logical plan there with imperative commit messages; never merge, push or commit to the original checkout. Reviewer maintains plans/README.md.

## Steps and verification
1. Confirm the current-state anchors and read relevant existing tests. Run `node --test tests/commerce.test.mjs tests/shipping.test.mjs tests/csv.test.mjs` (skip a named new file until created); expect existing tests pass.
2. Add a reusable physical fulfillment eligibility rule: live Stripe-paid orders require paymentLive===true; live paid-external and demo test-paid remain supported. Enforce before rates, label buying, dispatch and manual ship; use the rule to exclude unpaid-by-real-funds rows from fulfillment/Pirate Ship exports and ready-to-ship UI. Preserve refund and shipping-liability checks. Regression tests must reject live paymentLive false/missing before any provider call or mutation and accept live true, external and demo; CSV imports must inherit the guard.
3. Run `node --test tests/commerce.test.mjs tests/shipping.test.mjs tests/csv.test.mjs`; expect all old and new regression tests pass. Run `npm run check` and `npm test`; expect exit 0. Inspect `git diff --check`; expect no errors.

## Commands
Node >=22.16. `npm ci` in isolated worktree if dependencies absent (exit 0). `npm run check` checks JS syntax; there is no separate lint/typecheck. `npm test` uses disposable fixtures. `npm run demo:check` must pass for the final combined change.

## Done criteria
All focused/full tests, syntax and diff checks exit 0; named regression scenarios exist and assert state/provider-call outcomes; only in-scope source paths changed. Each public/server path must enforce the authoritative rule rather than UI alone.

## STOP conditions
Stop and report if anchors mismatch, a required edit is outside scope, verification fails twice after reasonable correction, real provider access is required, or safe backwards compatibility cannot be specified. Never loosen authority checks just to make a fixture pass.

## Maintenance
Future fulfillment/login/auction/proxy entry points must use the same server rule. Preserve recorded payment uncertainty, HttpOnly sessions, immutable order totals and local-only bootstrap. Real Twitch/browser/Caddy rehearsal remains an explicit release gate; automated fixtures cannot certify it.

## Execution review refinements
Review requirements: hiding fulfillment must preserve Refund/Check refund controls for Stripe test payments. Persist explicit external payment provenance through shipping so shipped external orders remain exportable; test serialization/restart. Legacy shipped external records without Stripe evidence must not disappear from historical fulfillment export.

## Completion review
DONE — APPROVED 2026-10-26. Implemented on codex/commerce-auth-fixes in `/Users/area/.codex/worktrees/commerce-auth-fixes/live-shopping-companion`; baseline 8921741, final 1f0c315. Independent reviewer syntax/full tests (156 passed), demo and diff checks passed. See canonical original checkout plans/README.md for review and release limits.
