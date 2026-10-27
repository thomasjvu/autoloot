# Plan 003: Bind Twitch OAuth to the initiating browser

## Status
Priority P1; effort M; risk MED; category correctness/security; dependencies none.
Planned at `2d23cf8` plus the full uncommitted workspace on 2026-10-26.

## Why this matters
Bind Twitch OAuth to the initiating browser. The current boundary permits a commerce or identity outcome inconsistent with the operator/buyer intent described below.

## Current state and drift check
Repository: /Users/area/live-shopping-companion. lib/twitch.mjs:32-39 stores pending state with only role/at and consumes it without browser proof. server.mjs:369 redirects via twitch.login(role); lines 375-381 pass only code/state then set a session cookie. Existing tests/twitch.test.mjs exercise expiry/replay with mocked fetch.
Run `git diff --stat 2d23cf8..HEAD -- lib/twitch.mjs server.mjs tests/twitch.test.mjs tests/server.test.mjs tests/production-http.test.mjs tests/oauth-http.test.mjs` and `git diff -- lib/twitch.mjs server.mjs tests/twitch.test.mjs tests/server.test.mjs tests/production-http.test.mjs tests/oauth-http.test.mjs`. The baseline explicitly includes dirty/untracked work copied into the executor worktree; compare these anchors before editing and stop on mismatch. Preserve all existing changes.

## Conventions
Plain Node ES modules, single-host SQLite, integer USD cents, synchronous authoritative engine transitions and explicit thrown Error messages. Match node:test and strict assertions in tests/commerce.test.mjs and tests/runtime.test.mjs. Provider transports are fixture-mocked; never use real funds, account messages or credentials. docs/architecture.md states that buyer identity and server-side order ownership are authoritative. Keep local admin access distinct from buyer identity.

## Scope
Only these files may change: lib/twitch.mjs server.mjs tests/twitch.test.mjs tests/server.test.mjs tests/production-http.test.mjs tests/oauth-http.test.mjs.
All other source files, dependencies, storage layout, unrelated UI, marketing and design are out of scope. Report if another file is required.

## Git workflow
Work only in the isolated supplied worktree on codex/commerce-auth-fixes. Commit each logical plan there with imperative commit messages; never merge, push or commit to the original checkout. Reviewer maintains plans/README.md.

## Steps and verification
1. Confirm the current-state anchors and read relevant existing tests. Run `node --test tests/twitch.test.mjs tests/server.test.mjs tests/production-http.test.mjs tests/oauth-http.test.mjs` (skip a named new file until created); expect existing tests pass.
2. Generate a short-lived browser nonce at OAuth initiation, store its hash in pending state and set an HttpOnly SameSite=Lax cookie scoped for callback, Secure on HTTPS. Require matching proof before provider exchange, registration, streamer connect or session creation. Clear proof on success; define safe concurrent-tab behavior (reject older flow is acceptable). Do not accept missing proof for compatibility. Preserve one-use/expiry/client-ID checks and role checks. Add cross-browser, missing-cookie, wrong-cookie, replay, expiry and legitimate browser tests; HTTP tests must verify cookie flags and that wrong proof performs no provider exchange. Never add external network calls to tests.
3. Run `node --test tests/twitch.test.mjs tests/server.test.mjs tests/production-http.test.mjs tests/oauth-http.test.mjs`; expect all old and new regression tests pass. Run `npm run check` and `npm test`; expect exit 0. Inspect `git diff --check`; expect no errors.

## Commands
Node >=22.16. `npm ci` in isolated worktree if dependencies absent (exit 0). `npm run check` checks JS syntax; there is no separate lint/typecheck. `npm test` uses disposable fixtures. `npm run demo:check` must pass for the final combined change.

## Done criteria
All focused/full tests, syntax and diff checks exit 0; named regression scenarios exist and assert state/provider-call outcomes; only in-scope source paths changed. Each public/server path must enforce the authoritative rule rather than UI alone.

## STOP conditions
Stop and report if anchors mismatch, a required edit is outside scope, verification fails twice after reasonable correction, real provider access is required, or safe backwards compatibility cannot be specified. Never loosen authority checks just to make a fixture pass.

## Maintenance
Future fulfillment/login/auction/proxy entry points must use the same server rule. Preserve recorded payment uncertainty, HttpOnly sessions, immutable order totals and local-only bootstrap. Real Twitch/browser/Caddy rehearsal remains an explicit release gate; automated fixtures cannot certify it.

## Execution review refinements
Integration requirements discovered during execution: real Twitch callback is a cross-site GET and requires a narrowly scoped request-origin exception with mandatory nonce/state validation. Streamer login starts on localhost while PUBLIC_URL is a distinct host: use an expiring, bounded, one-use, role-bound handoff minted only after local admin authorization. Redirect to the public origin to set its host-only proof cookie before redirecting to Twitch. Do not send admin capability to the public handoff URL. Permit only the exact GET handoff through the cross-site gate, retain Host validation, and reject missing/replayed/expired handoffs. Add distinct-Host HTTP regression coverage.

## Completion review
DONE — APPROVED 2026-10-26. Implemented on codex/commerce-auth-fixes in `/Users/area/.codex/worktrees/commerce-auth-fixes/live-shopping-companion`; baseline 8921741, final 1f0c315. Independent reviewer syntax/full tests (156 passed), demo and diff checks passed. See canonical original checkout plans/README.md for review and release limits.
