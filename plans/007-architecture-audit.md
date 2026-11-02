# Architecture, modularity and CSS audit — 2026-10-26

Baseline: `09e015c` on `codex/chat-command-help`. Read-only source audit using the improve skill; no implementation changes. This report is an audit, not an executable refactoring plan. Plan 006's completion record exists in the original checkout's plans directory; numbering continues from that record.

## Verdict

The domain layer is meaningfully modular, but the application entry points and CSS are not yet modular enough. Keep plain Node/ES modules, single-process SQLite, transactional engine authority, provider services, separate marketing deployment, and the current design. Refactor around ownership and lifecycle rather than arbitrary line limits.

`public/app.js` is 1,296 lines / approximately 118KB, covering three applications plus most workspace features. `server.mjs` is 1,105 lines, combining startup, transport policy and workflow orchestration. Four app CSS sheets total approximately 143KB before compression. `street.css` alone is approximately 48KB despite having only 215 lines; compressed source hides its size. Repeated selectors include intentional responsive/state rules, so selector repetition counts are not evidence of dead code.

## Verification and scope

- `npm run check`: PASS (JavaScript syntax only).
- `npm test`: PASS, 161/161 tests.
- In-memory catalog reproduction: one catalog add saves twice; first saved product has no metadata, second has metadata.
- In-memory notification reproduction: a live Stripe test-funded order with an active refund hold still produces “1 orders to fulfill.”
- A separate audit agent reproduced companion HTTP 400 changing enabled=true to false in disposable storage; reviewer confirmed mutation-before-validation in the route itself.
- Browser review in the immediately preceding implementation turn confirmed storefront rich-consent text splitting into narrow columns. This audit rechecked the responsible markup and flex rules; it did not rerun that visual case.

Reviewed architecture/design intent, server and engine boundaries, public entry points, feature modules, CSS ownership/imports, representative tests and verification tooling. No exhaustive asset/dead-selector coverage, load test, provider certification, penetration test, legal review, or Python dependency audit. No external provider actions or account messages.

## Vetted findings

All findings have HIGH confidence in their cited code behavior. S = hours, M = roughly a day, L = multiple days. Risk describes the fix, not severity.

| ID | Finding / concrete consequence | Evidence | Effort | Risk |
| --- | --- | --- | --- | --- |
| A1 | Establish importable behavior tests and rendered CSS baselines before broad extraction. Two frontend tests depend on exact source strings; passing Node tests cannot catch CSS or browser lifecycle regressions. | `tests/commerce.test.mjs:503-505` uses source slicing + new Function; `tests/drop-shop.test.mjs:60-62` inspects a 12,000-character source window; `package.json:8-9` has no browser/CSS verification gate. | M | Low |
| A2 | Define a proper rich-consent component. A flex label containing raw text and several links produces multiple text/link columns. Use two layout children: checkbox and one content span; preserve label and link semantics. | `public/style.css:1612-1627`; `public/app.js:366,508`. | S | Low |
| A3 | Validate complete mutations before committing. Rejected companion settings alter preferences; catalog creation publishes an incomplete product before metadata/image are added. These need separate regression-backed fixes. | `server.mjs:889-896`; `lib/integrations/catalog.mjs:27-35`; `lib/commerce/engine.mjs:155-157`. | S–M each | Low for settings; medium for catalog |
| A4 | Centralize order capabilities and attention rules. Engine and app duplicate the funds predicate; notifications use paid status alone and count held/test-funded orders as fulfillable. | `lib/commerce/engine.mjs:6`; `public/app.js:299,317`; `public/activity-feed.js:11-12`. | M | Medium |
| A5 | Give draft state a component owner. SSE replaces the entire app and preserves only one focused INPUT. Catalog query + game choice can be discarded when focus is on a SELECT during unrelated state updates. | `public/app.js:1199-1230`; `public/catalog.js:6,8-20`. | M | Medium |
| A6 | Split frontend applications and feature controllers. A shared global module owns admin/viewer state, routes, rendering, every dialog, SSE and timers; importing it starts the application. Public shop/OBS imports also initialize Rip's video/listener. | `public/app.js:1-14,62-99,417-465,500-615,923-1296`; `public/rip.js:3,54`. | L, staged | Medium |
| A7 | Consolidate CSS by component, then by surface. Navigation geometry is defined across three generations of styles; all application surfaces load all four CSS sheets, legal pages load three. | `public/style.css:124`; `public/drop.css:49`; `public/street.css:58,135-140`; `public/index.html:20-22`; `public/help.html:2`. | L, staged | High without baseline; medium per scoped component |
| A8 | Separate backend construction, HTTP policy and grouped handlers. One server closure owns projections/SSE, auth/audit/rate limits, uploads, a large admin switch, background jobs and shutdown. | `server.mjs:4-50,53-118,121-157,191-305,558-599,619-980,1085-1105`. | L, staged | Medium–high |
| A9 | Extract companion session and shared sale coordination. Photo/text proposal paths repeat busy/proposal publication and cleanup; manual/proposal sale entry repeats Twitch/NFT prerequisites. | `server.mjs:51-52,721-737,837-879,898-968`; existing boundary exemplar `lib/commerce/rip-session.mjs:3`. | M | Medium |
| A10 | Deduplicate pure presentation helpers and order construction. Nine HTML-escape copies and differing USD formatters have no feature-specific ownership; auction/buy-now order builders repeat policy, totals, deadlines and initial state. | `public/app.js:24,32`; `public/catalog.js:3`; `public/rip.js:6`; `public/shipping.js:1-2`; `public/activity-feed.js:3`; `public/accounting.js:1-2`; `public/overlay-widgets.js:1`; `public/workspace-navigation.js:2`; `public/studio-widgets.js:3`; `lib/commerce/engine.mjs:346-364,527-545`. | S for UI primitives; M for order builder | Low for primitives; medium for order construction |

### Constraints behind the fixes

A3: Validate a complete companion patch before any writes, then commit once. Catalog metadata and reference image must be part of the authoritative inventory-create command; selection consumption and save-failure behavior must remain correct. Assert one persisted/broadcast product snapshot, including failure paths.

A4: Project private server-derived capabilities/reasons such as canShip, canRefund, needsReconciliation and canAuthorizeNft to appropriate admin/buyer DTOs. UI and notifications consume these; server commands continue to revalidate every action. Do not expose admin-only capabilities publicly or trust client-supplied flags.

A5/A6: Controllers should own local form drafts and subscriptions; a snapshot update must not destroy unrelated editing state. Use explicit mount/update/dispose, injected API/state callbacks and importable renderers. Preserve SSE version/reconnect protection, capture disposal, focus, speech and current accessibility behavior.

A7: The historical cascade is documented intentionally in design.md; its existence alone is not a defect. The maintenance problem is that component ownership is spread across it. Preserve current computed output, semantic colors, breakpoints, reduced motion, focus and OBS transparency. Move one component's winning base/state/responsive rules together and remove its old rules in the same reviewed change. Do not delete apparent duplicates based on grep, regex counts, or screenshots of one state.

A8/A9: Keep common policy explicit and central: trusted Host/origin, local admin capability, viewer ownership, audit fail-closed behavior, rate/body limits, signed raw Stripe bodies and SSE backpressure. Route groups must not copy or reorder these safeguards accidentally. Add an injectable handler/application factory; keep process signals/listen/timers in the executable composition root.

A10: Extract semantic primitives, not a generic utils dumping ground. Keep money as integer cents and escaping context explicit. An order builder may construct a snapshot; stock decrement, sequence allocation, insertion and commit must remain in one authoritative engine operation.

## Recommended target ownership

Illustrative structure, not a requirement to create every listed file immediately:

```text
server.mjs                    # startup, wiring, listen, shutdown
lib/http/                     # handler factory, policy, request/response helpers, SSE
lib/routes/                   # OAuth/viewer, commerce, inventory, companion/reveal, static/media
lib/companion-session.mjs      # proposal lifecycle, busy state, apply-once handling
lib/sales.mjs                  # shared integration prerequisites/announcement coordination
lib/commerce/engine.mjs                # authoritative facade + unit of work
lib/orders.mjs                # pure snapshot/capability logic, no independent commits
public/app.js                 # small pathname bootstrap
public/shared/                # presentation primitives, API client, live-state transport
public/workspace/             # shell + feature views/controllers/dialogs
public/storefront/            # buyer controller, order/listing views
public/overlay/               # OBS controller and widget presenters
public/styles/                # semantic tokens, base/type, primitive controls
public/styles/components/     # one owner per navigation/drawer/form/table/etc.
public/styles/surfaces/       # workspace, storefront, overlay, legal entry sheets
```

Existing catalog, reveal, shipping, accounting, navigation, activity and cohost modules are useful starting boundaries. Do not route the refactor through a new frontend framework or plugin registry.

## Safe execution order

1. Fix small behavior defects: rejected settings mutation, atomic catalog add, rich-consent markup. Each gets focused regression coverage.
2. Extract importable order presenters and source-independent tests. Establish deterministic browser/layout fixtures for desktop/mobile navigation, companion drawer, inventory/catalog, orders, storefront idle/live/paused, legal and every OBS preset dimension. Include narrow consent wrapping, focus/draft retention, reduced motion and transparent overlay roots.
3. Deduplicate presentation primitives; derive private order capabilities; repair catalog draft ownership. Keep output and authority contracts explicit.
4. Extract overlay and storefront controllers, then remaining workspace feature controllers. Extract shared transport only once controller ownership is clear. Keep app.js as bootstrap.
5. Consolidate semantic CSS tokens/primitives and navigation/drawer/form styles incrementally. Create independent workspace/shop/OBS/legal entry sheets; remove old rules only when the rendered baseline confirms equivalence.
6. Extract backend handler construction/common policy/projections/SSE, then CompanionSession + sale coordinator and grouped routes. Keep existing HTTP contracts and provider fixtures.
7. Extract pure engine order construction/validation where duplication is demonstrated; keep atomic transitions together. Add module-dependency and CSS-ownership checks after actual boundaries exist. Make syntax checking discover nested source files instead of maintaining a fragile hardcoded list.

Separate commits/PRs by these behaviors and boundaries. Do not combine large CSS and JS rewrites in one change: visual and state regressions then become harder to attribute. Core functional commands remain npm run check, npm test and npm run demo:check; add the rendered browser gate before deleting CSS layers.

## Considered and rejected

- Framework or CSS-in-JS migration: changes tooling without resolving ownership automatically.
- Remote database/distributed services: contradicts the documented single-host scope without demonstrated need.
- Hard maximum line count or equal-sized chunks: creates arbitrary coupling and misses minified source size.
- Splitting every Engine method into independently committing services: threatens stock/order atomicity.
- Deleting provider fixtures or broad test rewrites: existing commerce/auth/storage coverage is useful; replace only source-coupled harnesses while preserving assertions.
- Treating repeated responsive selectors as dead CSS: invalid without computed-style and interaction verification.

## Direction

This audit focuses on architecture rather than proposing new product features. The grounded next investment is a reusable visual/lifecycle fixture workspace and explicit component ownership: both directly support safer iteration on the existing Studio/storefront/OBS product.
