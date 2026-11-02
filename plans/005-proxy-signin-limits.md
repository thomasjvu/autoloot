# Plan 005: Separate anonymous client rate limits behind Caddy

## Status
Priority P2; effort S-M; risk MED; category correctness/security; dependencies none.
Planned at `2d23cf8` plus the full uncommitted workspace on 2026-10-26.

## Why this matters
Separate anonymous client rate limits behind Caddy. The current boundary permits a commerce or identity outcome inconsistent with the operator/buyer intent described below.

## Current state and drift check
Repository: /Users/area/live-shopping-companion. server.mjs:284-298 chooses session.id || req.socket.remoteAddress for anonymous sign-in, with 60/minute. deploy/Caddyfile:6 reverse-proxies all buyers from loopback. lib/platform/runtime.mjs localAdminRequest rejects all forwarding headers and must remain restrictive.
Run `git diff --stat 2d23cf8..HEAD -- lib/platform/runtime.mjs server.mjs deploy/Caddyfile docs/dev/content/operations/production.md .env.example tests/runtime.test.mjs tests/server.test.mjs tests/production-http.test.mjs` and `git diff -- lib/platform/runtime.mjs server.mjs deploy/Caddyfile docs/dev/content/operations/production.md .env.example tests/runtime.test.mjs tests/server.test.mjs tests/production-http.test.mjs`. The baseline explicitly includes dirty/untracked work copied into the executor worktree; compare these anchors before editing and stop on mismatch. Preserve all existing changes.

## Conventions
Plain Node ES modules, single-host SQLite, integer USD cents, synchronous authoritative engine transitions and explicit thrown Error messages. Match node:test and strict assertions in tests/commerce.test.mjs and tests/runtime.test.mjs. Provider transports are fixture-mocked; never use real funds, account messages or credentials. docs/dev/content/developers/architecture.md states that buyer identity and server-side order ownership are authoritative. Keep local admin access distinct from buyer identity.

## Scope
Only these files may change: lib/platform/runtime.mjs server.mjs deploy/Caddyfile docs/dev/content/operations/production.md .env.example tests/runtime.test.mjs tests/server.test.mjs tests/production-http.test.mjs.
All other source files, dependencies, storage layout, unrelated UI, marketing and design are out of scope. Report if another file is required.

## Git workflow
Work only in the isolated supplied worktree on codex/commerce-auth-fixes. Commit each logical plan there with imperative commit messages; never merge, push or commit to the original checkout. Reviewer maintains plans/README.md.

## Steps and verification
1. Confirm the current-state anchors and read relevant existing tests. Run `node --test tests/runtime.test.mjs tests/server.test.mjs tests/production-http.test.mjs` (skip a named new file until created); expect existing tests pass.
2. Implement an explicit trusted-proxy policy (disabled by default), using a dedicated proxy-overwritten client address header only when the immediate peer is explicitly trusted; validate address syntax and ignore caller-supplied forwarding headers from untrusted peers. Configure Caddy to overwrite that header from its observed client address and document deployment configuration. Use effective address only for anonymous rate limits, retaining authenticated session limits and existing admin bootstrap rules. Test separate proxy clients, same-client throttling, malformed/missing headers, spoofed direct headers and unchanged admin rejection. Do not trust arbitrary X-Forwarded-For chains.
3. Run `node --test tests/runtime.test.mjs tests/server.test.mjs tests/production-http.test.mjs`; expect all old and new regression tests pass. Run `npm run check` and `npm test`; expect exit 0. Inspect `git diff --check`; expect no errors.

## Commands
Node >=22.16. `npm ci` in isolated worktree if dependencies absent (exit 0). `npm run check` checks JS syntax; there is no separate lint/typecheck. `npm test` uses disposable fixtures. `npm run demo:check` must pass for the final combined change.

## Done criteria
All focused/full tests, syntax and diff checks exit 0; named regression scenarios exist and assert state/provider-call outcomes; only in-scope source paths changed. Each public/server path must enforce the authoritative rule rather than UI alone.

## STOP conditions
Stop and report if anchors mismatch, a required edit is outside scope, verification fails twice after reasonable correction, real provider access is required, or safe backwards compatibility cannot be specified. Never loosen authority checks just to make a fixture pass.

## Maintenance
Future fulfillment/login/auction/proxy entry points must use the same server rule. Preserve recorded payment uncertainty, HttpOnly sessions, immutable order totals and local-only bootstrap. Real Twitch/browser/Caddy rehearsal remains an explicit release gate; automated fixtures cannot certify it.

## Completion review
DONE — APPROVED 2026-10-26. Implemented on codex/commerce-auth-fixes in `/Users/area/.codex/worktrees/commerce-auth-fixes/live-shopping-companion`; baseline 8921741, final 1f0c315. Independent reviewer syntax/full tests (156 passed), demo and diff checks passed. See canonical original checkout plans/README.md for review and release limits.
