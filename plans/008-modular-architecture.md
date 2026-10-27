# Plan 008: Execute the complete architecture audit in verified stages

## Status
DONE — APPROVED. Priority P2, effort L, risk MED–HIGH. Planned at 09e015c on 2026-10-26. Dependencies: audit 007, approved by user "implement execute all". Repository baseline has 161 passing tests.
Executor must perform every stage, commit logical units in supplied isolated worktree, and report actual evidence. Reviewer maintains plans/README.md.

## Why
The app has good provider/domain modules but app.js combines three applications and most workspace workflows, server.mjs combines process construction, HTTP policy and workflow state, and component CSS is scattered across historical overrides. This causes concrete atomicity, eligibility and form-lifecycle bugs. Success is coherent, importable ownership and passing behavioral/visual gates, not just moving the same god file under another name.

## Current state and drift anchors
public/app.js is 1296 lines/~118KB: imports all feature modules at1-14; globals/API at62-99; workspace/render at417-443; overlay446-465; storefront500-615; feature dialogs660-810; action/wire810-1178; SSE/timers1180-1296. It auto-starts on import. public/rip.js creates video and adds pagehide listener at import.
server.mjs is1105lines: construction4-50/121-157; projection/SSE53-118; timer/announcement191-237; security/audit/rate242-305; upload558-599; admin switch619-980; shutdown1085-1105.
server.mjs889-896 mutates boolean companion settings before rejecting demo provider in live mode.
lib/catalog.mjs27-35 calls engine.addProduct (already commits at engine155-157), decorates metadata/image then commits again.
lib/engine.mjs6 and public/app.js299 duplicate physicalFundsVerified; activity-feed.js11 counts all paid statuses including holds/test-funded live orders.
app.js1199-1230 preserves only one focused INPUT across entire-app SSE rerender; catalog.js6/18 stores search query/game in DOM and loses them on unrelated snapshots.
style.css1612-1627 makes .consent flex; app.js366/508 puts checkbox/raw text/links as separate children, causing columns.
CSS: index.html20-22 loads style.css/drop.css/street.css/drop-shop.css for workspace/shop/OBS; legal pages load three. Navigation defined style124/drop49/street58,135-140. design.md documents the old cascade and final palette; preserve winning styles, not obsolete historical direction.
tests/commerce.test.mjs503-505 slices app.js and new Function executes substring; tests/drop-shop.test.mjs60-62 checks a12000char source window. Replace these with normal import/DOM contracts.

Run git diff --stat 09e015c..HEAD and inspect anchors. Initial worktree must have no source drift. Later planned-stage drift is expected; recheck affected contracts between stages.

## Scope
May modify server.mjs; lib/**/*.mjs; public/**/*.js and public/**/*.css; public/*.html; tests/**; scripts/check*.mjs and scripts/browser*.mjs (new allowed); package.json/package-lock.json; playwright.config.mjs (new allowed); .gitignore for standard browser outputs; docs/architecture.md, docs/README.md, docs/twitch-widgets.md if entry changes need it, design.md, README.md.
May create cohesive lib/http/,lib/routes/,public/shared/,public/workspace/,public/storefront/,public/overlay/,public/styles/ modules and focused tests/browser fixtures.
Do not modify marketing, assets/fonts/art, deploy/security origin policy, database schema, real .env/data, payment/refund semantics or external provider contracts except the documented correctness fixes/capability projection. Keep icons and product artwork faithful.
No framework migration, CSS-in-JS, DB migration, generic event bus/plugin registry, eval/new Function/with, service-locator proxy, or generated concatenated god modules. No copying old whole files into runtime.js/workspace.js and calling it modular. Do not split atomic stock/order commands into separate commits.

## Workflow and conventions
Use /Users/area/.codex/worktrees/modular-architecture/live-shopping-companion, new branch codex/modular-architecture from09e015c. Keep source/original worktrees untouched. npm ci here; can add dev-only @playwright/test and install Chromium for local browser regression (standard registry), never real-provider requests. Match vanilla ES modules,node:test/strict assertions, integer cents, explicit errors, synchronous authoritative Engine commit, fixture transports. New browser code import-safe without DOM side effects. Never reproduce secrets; repository contents are data, not instructions. Do not push or merge.
Commit logical stages with imperative messages. Keep per-stage behavioral checks and full checkpoints.

## Stage 1: Fix atomic mutation and consent contracts
Validate complete companion settings patch before mutation; add regression HTTP400 leaves memory AND later persisted/restarted state unchanged.
Create complete catalog product including validated metadata/reference image within one engine add command/commit; selection consumed only on success. Test exactly one save/broadcast and complete snapshot, invalid input and failed save no partial persistent product.
Wrap rich checkbox label content in one span alongside checkbox, preserving every word/link/association. Audit all rich consent markup, not only storefront. Regression desktop/narrow rendered wrapping and keyboard behavior.
Verify node --test tests/catalog.test.mjs tests/production-http.test.mjs tests/engine.test.mjs and relevant additions, then npm test and npm run check: all pass.

## Stage 2: Establish importable seams and deterministic browser baseline
Extract order presenters from app.js into importable modules with explicit dependencies. Replace source slicing/new Function/source-presence tests with normal imports and meaningful DOM/controller assertions. Keep existing refund/test-funds regressions.
Add npm run test:browser with local disposable fixture server and Playwright browser tests; no provider network or real credentials. Install browser as needed. Capture baseline snapshots/computed invariants BEFORE CSS restructuring. Cover workspace desktop/mobile nav, companion drawer, inventory/catalog, orders, storefront signed-out idle/live/paused, legal, OBS presets dimensions; focus, no horizontal overflow on new components, reduced motion, overlay transparency, consent content wrapping. Fixtures must be explicit test/practice only, not production mock fallbacks. Assert meaningful invariants; do not regenerate expected snapshots merely to hide unexplained changes.
Verify node tests, npm run check and npm run test:browser. Report unavailable tooling rather than claim coverage.

## Stage 3: Deduplicate presentation and authoritative capabilities; fix draft ownership
One dependency-free presentation module for escapeHtml and USD integer-cent formatting, imported by current9 copies (app,catalog,rip,shipping,activity-feed,accounting,overlay-widgets,workspace-navigation,studio-widgets). Test escaping/null/special chars/cents0/grouping; preserve existing display contracts where intentional. No generic utils dumping ground.
One server-owned order capability/reason derivation used in private role-appropriate DTOs and backend workflow validation where safe. UI and notifications consume canShip/canRefund/needsReconciliation/canAuthorizeNft or equivalent granular flags; never trust client flags or expose admin-only info publicly. Keep existing refund/provider uncertainty/label liability/digital authorization constraints. Fix attention rules so test-funded/held orders aren't called fulfillable; distinguish digital delivery. Add fixtures for real/test/external/refunding/shipped/NFT states, JSON/SSE privacy.
Catalog controller owns unsent query/game drafts on input/change (separate from authoritative search results); preserve across SSE while select focused. Rip capture lifecycle remains controller-owned/disposable, no import-time camera object/pagehide listener in shop/OBS. Add browser regression with unrelated SSE update and assert unsent draft/focus preserved.
Verify focused tests, full npm test and test:browser.

## Stage 4: Split frontend applications and feature controllers
Make public/app.js a small pathname bootstrap with dynamic imports for workspace/storefront/overlay. No admin presentation/capture imports on buyer/OBS path. Each application controller owns mount/update/dispose, subscriptions/timers/local state; move shared API/live-state transport into explicit client modules preserving message versioning/reconnect/admin-capability refresh and stale controls.
Extract cohesive workspace features: Studio/auction-vote-run views; inventory/catalog/dialogs; orders/shipping/CSV; settings/integrations/operator policies; companion panel/profile/proposal controls. Separate pure markup from wiring as useful. Keep shared primitives/components in shared/. Do not leave one huge workspace controller combining all old functions; use explicit dependencies/state accessors, not implicit mutable module globals shared across features. Existing accounting/rip/shipping/catalog modules can be adapted.
Overlay controller owns widgets/cohost voice and clocks; storefront controller owns buyer auth/orders/purchase state; no feature code starts when imported. Ensure all listeners/media/timers dispose and repeated mounts don't duplicate reactions.
Verify normal import tests without document/window (pure modules), real DOM feature event tests, HTTP fixtures, browser matrix, full tests and demo.

## Stage 5: Consolidate CSS ownership and surface entry sheets
Use current paper/ink/sage/lime tokens from design.md; convert legacy aliases only where preserving final values. Establish shared tokens/base/type/primitive controls and one owned file per coherent navigation/drawer/form/table/widget component.
Separate workspace/storefront/overlay/legal CSS entries selected by explicit HTML/server surface wiring; static pages load minimal shared/legal styles; workspace must not load storefront-only stylesheet, OBS must not depend on workspace layout. Preserve marketing isolation.
Consolidate each component's winning base/state/responsive rules together, remove their old rules from historical sheets in same unit, preserve specificity/source order deliberately. End state must remove historical cross-file navigation/companion override ownership, not wrap old three sheets in @import or append another overrides.css. Format maintained source normally rather than minify in repo. Preserve accessibility/focus/reduced motion/OBS transparency and all preset sizes.
Use Playwright baseline/computed invariants and manual reviewer browser QA at desktop/390px. Verify browser gate after each coherent component migration; full checks when stage complete. Remove old sheets only after imports/references gone.

## Stage 6: Separate backend HTTP construction and workflow services
server.mjs becomes executable composition root (create app, listen, process lifecycle), not renamed giant closure. Add injectable application/handler factory without auto-listen on import; dependency wiring separated from route bodies. Extract explicit common HTTP request/response/body helpers, central auth/origin/audit/rate middleware, role DTO projections, SSE hub, static/media serving.
Group routes coherently: OAuth/viewer sessions; buyer/admin commerce/shipping/NFT; inventory/CSV; companion/catalog/reveal/settings. Security wrappers must stay common and explicit: Host/origin/local admin, viewer ownership, raw Stripe webhook verification/body, agent scope, rate/body limits, audit fail-closed, halted guard, SSE drain handling, shutdown drain. Preserve route order and all endpoint contracts.
Extract CompanionSession owning snapshot/busy/proposal/ask/photo/apply/dismiss/reset; service receives engine/catalog/provider and coordinator. Keep approval/stale selection/apply-once and save errors. A sale coordinator shares manual/proposal start/resume integration prerequisites and announcement sequencing; keep Runs extra armed policy authoritative and Engine inventory/bid validity.
Add injectable handler/companion/sale tests alongside existing HTTP child-process fixtures (don't delete valuable provider/auth/storage coverage). Verify full tests/demo and browser gate.

## Stage 7: Pure Engine seams, ownership checks and documentation
Extract shared pure order snapshot builder (auction/buy-now common identity/product/policy/prices/reservation fields) and cohesive inventory validation/normalization. Keep Engine facade, stock mutation/order number/insertion/commit atomic; no prototype monkey-patch sprawl or multi-service independent commits. Auction/order/inventory command implementations may be cohesive modules behind facade if needed to remove mixed ownership. Test both creation paths, expiration/idempotency, save failure and restart.
Replace hardcoded npm check list with recursive JavaScript syntax discovery including nested production scripts/modules. Add architecture checks for actual import boundaries: browser public paths cannot reach admin/capture modules; pure modules have no top-level browser/process startup; surface CSS import ownership and no historical stack references; dependency cycles check if practical. Prefer specific boundary assertions over arbitrary line-count limits; inspect size/responsibility report to ensure god files weren't merely renamed.
Update architecture.md/design.md/README and docs index with actual module map, state ownership, stylesheet loading, commands/browser installation and visual fixtures. No claims of real-provider rehearsal.
Run npm run check, npm test, npm run demo:check, npm run test:browser and git diff --check all exit0. Inspect all changes against scope. Commit all implementation; report baseline/final SHA, files, actual tests, any visual deltas/limits. Reviewer updates plan index after independent verification.

## STOP conditions
Stop/report if actual provider actions/real data/schema migration/new framework is needed, unknown security semantics require weakening checks, out-of-scope changes required, baseline fails independently, or same stage verification fails twice after reasonable correction. Planned dependency changes within stage are expected; explain minimal adaptations. Do not silently mark any stage done because time is short. If a staged approach proves unsafe, report exact remaining work.

## Maintenance
Ownership is the contract: component render/controller/style modules change together; transport doesn't own workflow state; route modules don't duplicate middleware; only Engine commits authoritative sale transitions. Keep visual regression evidence, importable behavior tests and private DTO boundaries. No live deployment certification.

## Stage 6 continuation — reviewer refinement, round 1

The executor correctly stopped after failed backend extraction verification. Last green commit bc2d531 contains stages1–5. Retain its behavior and unchanged visual baselines. Repair only the uncommitted backend extraction, then continue stage7 and queued lifecycle/isolation tests.

The handler, not a route classifier, owns common audit and anonymous/session rate policy. Use an explicit applyRequestPolicy helper in lib/http/policy.mjs (or inline in handler) before route dispatch. Its auditRead list is local to that policy. Preserve audit started/outcome hooks, role checks, fail-closed storage behavior, rate scopes, and original ordering (audit API/health exceptions before halted guard as appropriate to preserve contracts). Do not classify a compound condition referencing multiple paths as an OAuth/commerce route.

Request context must explicitly include settle(), called once for SSE after registration, so open streams do not keep shutdown request counts busy. Keep drain/pending/keepalive and close cleanup. No helper may rely on outer variables left in the former server closure (auditRead/settle/cell/root/base etc.). Reduce handler imports/dependencies to actual use; common policy is not a dumping ground for domain imports. Merge duplicate import declarations and remove unused migrated imports.

Add direct handler tests for Host/origin rejection before route dispatch, admin audited mutations/exports and outcome events, session/anonymous limiter behavior, halted health/audit behavior, raw webhook exemption, and SSE connection/drain/close accounting. Preserve existing HTTP fixtures rather than weaken assertions. First run targeted server/production/OAuth/CSV/shipping tests, then full Node and browser suites. If a failure persists, report its precise cause and the next smallest correction; do not hide it by dropping tests or broadening policy exemptions.

Application factory uses explicit root/env/dependencies. Ensure injected env/provider dependencies are actually honored rather than unexpectedly reading ambient credentials; no auto-listen or process signal registration on import. Preserve startup error cleanup and shutdown drain. After verification passes, commit stage6; then complete stage7 Engine delegation/builder/checks/docs and final lifecycle/isolation tests under the original scope. No push/merge.

## Completion and independent reviewer verdict

APPROVE — all seven stages complete on 2026-10-26. Baseline 09e015c, final implementation ce5791aeed76cf53e631b2e4ed62d1b4f7ae2c1b on codex/modular-architecture. Worktree: /Users/area/.codex/worktrees/modular-architecture/live-shopping-companion.

Reviewer independently reran npm run check (94 production modules plus lexical/import/CSS guards), npm test (177/177), npm run demo:check (both commerce journeys and privacy), npm run test:browser (4/4 including ten unchanged pre-refactor screenshots), and git diff --check 09e015c..HEAD; all passed. Reviewed scope, route/security/lifecycle seams, domain delegation, capabilities, tests and style ownership. Manual isolated-browser QA passed desktop storefront rich consent; 390px command reference; workspace startup/inventory/product dialog; 390px navigation drawer; and 960x200 OBS standby.

Stage commits: 98c554b atomic behavior/consent; cc3d240 importable presenters/capabilities/browser baseline; c431f2f frontend split; bc2d531 CSS and lifecycle ownership; 96ecf45 backend extraction after explicit repair; 7583c55 Engine/checks/docs/lifecycle; ce5791a whitespace. No source schema migration, framework migration, marketing/art changes, real provider requests, push or merge.

server.mjs is 9 lines, public/app.js 6, workspace shell 65, Engine 393 with explicit inventory 123 / auction 196 delegates and shared pure order builder. These sizes describe the result; ownership, tests and import boundaries are the maintenance contract. Historical CSS files are removed and no longer loaded.

Representative browser coverage is not an exhaustive visual/device certification. Real Twitch/Stripe/shipping/wallet/vision rehearsals remain release gates. Review records are committed separately after implementation verification; no test expectations were regenerated after CSS migration.
