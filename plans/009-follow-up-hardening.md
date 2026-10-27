# Follow-up hardening and module cleanup

Baseline: 20b3bb7 plus the current uncommitted auth/style/runtime changes. User approved implementation October 27, 2026. Preserve all pre-existing work. No live credentials, orders or configured passwords may be changed by verification.

## Ordered scope

1. Authenticated, per-session administrator logout: reject unauthenticated logout, retain unrelated sessions/streams, expire revoked streams. Cover real HTTP authentication and replay.
2. Shared mode-transition validation: practice controls must reject active auction, run, vote and open/closed giveaway before mutating inventory, orders or mode. Cover rejection state equality and permitted practice workflows.
3. Atomic catalog insertion: assemble trusted identity/image and validated seller fields before one persistence operation. Do not expose arbitrary provenance assertions through the generic product API. Cover persistence failure, missing metadata and duplicate retry.
4. Crash-safe initial password setup: private unique temporary file, durable install without overwriting an existing password, cleanup on failure. Cover stale temp, racing setup and invalid credentials.
5. Extract administrator HTTP endpoints and buyer storefront controller into explicit modules while retaining response/status/authorization contracts, escaping and DOM actions. Keep payments/fulfillment authority on server.
6. Consolidate duplicate component-owned CSS rules selectively; preserve intentional responsive contexts. No framework rewrite or purge based solely on text-search guesses.

## Verification

Run node syntax checks for new modules, npm run check, npm test and npm run demo:check sequentially. Fixtures authenticate through real admin endpoints. Use disposable data directories, never the active .data folder. Review git diff --check and changed-file scope. Browser/OBS and real-provider behavior remain separate verification gates.

## Acceptance

All four reproduced defects have regression coverage; original authentication/payment protections continue to pass; new boundaries are documented; shared working tree retains prior edits. Do not commit, push or deploy without a further user request.

## Review and application — October 27

APPROVED and applied by executor, preserving the dirty baseline. Independent review: syntax checks, 180 tests and demo flows passed; final executor verification adds stale-setup/private-permissions coverage for 181 passing tests. No commit or push. Administrator routes and buyer storefront now have explicit module boundaries; CSS panel ownership fix is deliberately selective.

## Additional user scope

Refine admin entry: larger branding, transparent greeting stickers over an uncropped character, remove private-note tagline. New admins choose username plus strong password; server enforces policy, client mirrors it, legacy password-only accounts remain usable. Test username validation, incorrect credentials, strong password policy, setup races and legacy compatibility. Changes use same isolated executor and review process.

Additional scope review: APPROVED. Source and layout rules reviewed; independent targeted auth tests 6/6 pass. Executor full-suite verification: 183 tests, syntax and demo checks pass. New username records use normalized account names; legacy password-only records remain unchanged. No rendered visual review because browser automation is disabled.
