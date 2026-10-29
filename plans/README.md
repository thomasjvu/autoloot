# Architecture and production audit — 2026-10-25

Baseline: commit `2d23cf8` plus the current uncommitted workspace, including companion profiles and Prime/local vision. The initial audit was read-only. The subsequent implementation pass is recorded below. Reconcile the working diff before executing any plan. Production status: **not ready for live launch**.

## Verification

- `npm run check`: passes (JavaScript syntax, not lint/type checking).
- `npm test`: 131 tests pass using disposable data/provider fixtures.
- `npm audit --omit=dev --json`: zero reported advisories in installed Node runtime dependencies.
- `npm run production:check`: fails public HTTPS origin, Twitch credentials, Stripe live key/webhook configuration and seller policies. Database integrity, commit digest and private file permissions pass.
- Current running setup reports scripted companion, unconfigured Twitch/Stripe, and local vision selection. Photon was not installed in the earlier environment check. Prime credentials, actual vision quality/latency and real provider round trips remain unverified.

## Vetted findings

All findings below have HIGH confidence in the cited code behavior. S = hours, M = about a day, L = multiple days including verification. Risk refers to the proposed fix.

| Priority | Finding and evidence | Impact / fix direction | Effort | Risk |
| --- | --- | --- | --- | --- |
| P1 | Public companion config: `server.mjs:78` returns `s.companion`; `lib/companion-profile.mjs:1-9` accepts custom instructions. | Public buyer/OBS state exposes internal instructions. Explicitly project only public avatar/name/message/mood/voice/presentation fields; regression-test JSON and SSE for private-field absence. | S | Low |
| P1 | Practice stock crosses mode boundary: `lib/workspace.mjs:10-21` loads sample products; `lib/engine.mjs:677-686` switches modes without removing/rejecting samples. | Isolated reproduction retained all four reference lots in live mode. Separate sample provenance and reject it at live sale boundaries, with a deliberate clean transition. Do not delete existing real orders. | M | Medium |
| P1 | Terminal unsuccessful refunds retain hold: `lib/payments.mjs:179-199,233-236`; `lib/engine.mjs:450`; `lib/nft.mjs:46`. | Paid orders cannot fulfill or begin a fresh refund attempt after authoritative failure/cancellation. Introduce persisted refund attempts and explicit audited recovery. Keep uncertain/pending outcomes held. | M | Medium |
| P1 | Checkout attempt can reserve indefinitely: `lib/payments.mjs:96-133`; `lib/engine.mjs:420-421`. | A failed creation retains a marker with a fixed expiry timestamp but no checkout ID. Cancellation/automatic expiry are blocked, including after the original creation window. Distinguish definite rejection from uncertainty and reconcile before releasing stock or creating a new attempt. | M | High |
| P1 | Capture selection resets: `public/rip.js:8,26` defaults to center 65%; `public/app.js:1184-1203` rerenders on SSE and preserves only focused inputs. | A selected 40% crop can silently become 65% before upload. Store crop/source state outside markup; preserve it across updates. Add a browser-level regression for bid/chat refresh while capture is active. | M | Medium |
| P1 | Rip review races: `server.mjs:555-572,647-665` locks only frame calls; delayed search/select results also write the same singleton; `public/rip.js:35` changes provider during scans. | An old response can replace a newer reveal or reviewed selection. Add a scoped Rip service with revisions and selection IDs; require matching IDs on confirm and ignore stale results. `lib/catalog.mjs:7` provides a nearby revision pattern. | M | Medium |
| P1 | Capture survives navigation: `public/rip.js:2,11,38,47` stops tracks only on explicit Stop or pagehide; `public/app.js:1034-1040` switches sections without disposal. | Leaving Rip Studio hides the preview/Stop control while capture continues. Add explicit capture mount/update/dispose; stop tracks and invalidate scans on exit, or provide an intentional persistent indicator and Stop control. | S–M | Low |
| P2 | Live companion defaults to scripted demo: `lib/engine.mjs:50-57`, `lib/workspace.mjs:2-5`, `server.mjs:890-893`. | Fresh live workspaces run keyword scripts, although correctly labeled Demo. Separate production defaults from practice seed; leave the live companion offline until its real provider is configured. | S–M | Low |
| P2 | Confirmed pulls are volatile: `server.mjs:18-19,657-665` stores pulls outside persisted workspace, truncating to 200. | Restart loses the show's pull ledger; confirmed-pull widgets have no durable source. Persist confirmed pulls and event identity in SQLite before announcements. Do not retain camera images by default. | M | Medium |
| P2 | Production preflight omits vision and companion readiness: `scripts/production-check.mjs:10-35`; `lib/workspace.mjs:2-5` inherits scripted provider from seed. | Config checks can pass without a working required agent/vision provider. Separate commerce readiness from optional cohost/vision readiness, clearly disable unavailable features, and exercise configured providers in explicit rehearsal. | M | Low |
| P2 | Coordination modules remain coupled: `server.mjs` (~1,085 lines), `public/app.js` (~1,281 lines), inline rip state/routes and overlay rendering. | Route changes mix transport, orchestration and presentation. Extract scoped route handlers and rip session service; extract companion/settings views and overlay controller with explicit mount/update/dispose. Avoid a framework migration or generic plugin bus. Also replace exact-string HTML surgery (`public/app.js:291,404`) with explicit render options for embedded catalog and companion forms. | L | Medium |

## Architecture verdict

Keep the single-host Node process and SQLite. Domain modules for payments, NFT delivery, shipping, bounded runs, catalog and accounting are appropriate boundaries. Keep the marketing deployment independent. Existing fixture tests cover meaningful payment, authorization, delivery and state-machine failures; do not remove tests because they mock provider transport. No bulk test deletion is justified by this audit.

KISS: one domain service per workflow, thin HTTP handlers, small presentation controllers, explicit public DTOs. DRY: centralize authoritative transition eligibility on the server, expose capabilities to UI, and share presentation-only helpers when repetition causes drift. Do not centralize unrelated code merely because it looks similar.

The durable state format is still a full workspace JSON snapshot with relational projections; `lib/storage.mjs:104-127` rewrites all product/order/event projections each commit. That is a consciously small single-workspace architecture, not evidence of distributed/large-history readiness. Add realistic history-load measurement before choosing incremental persistence; no premature database migration is recommended.

## Production completion order

1. Public-state allowlist and practice/live isolation.
2. Payment attempt recovery and restart/in-flight regression coverage.
3. Rip capture lifecycle/revisions, real companion readiness, durable confirmed pulls and confirmed public event projection.
4. Small controller/route extractions with existing API contracts held stable.
5. Explicit real-account rehearsal: Twitch identities/reconnect, Stripe checkout/webhooks/refund failures, selected vision provider, shipping or supported NFT delivery, off-host backup restore and monitoring. No passing unit suite substitutes for these checks.
6. Widget pilot described below; beta changelog stays deferred until beta.

## Direction plan

| Plan | Priority | Effort | Depends on | Status |
| --- | --- | --- | --- | --- |
| [001 — Stream widgets](001-stream-widgets.md) | P2 | M–L | Public projection and durable confirmed-pull work above | TODO — design/spike |

## Considered and rejected

- Replace SQLite with a remote database: no demonstrated requirement for this local-only deployment.
- Remove provider fixtures from tests: fixtures verify deterministic error paths without moving real funds; keep them.
- Treat the scripted companion as undisclosed AI: it is visibly labeled demo today. That is not deception, but production defaults still conflict with the requested no-scripted-mock behavior and should be offline until configured.
- Rewrite in a new UI/server framework: adds migration cost without resolving the concrete transition/privacy defects.
- Add segmentation immediately: current requirement is reliable cropped-card identification; measure before expanding inference work.

## Scope limitations

Reviewed critical server/domain paths, newly added vision/profile flows, state/privacy projections, frontend event rendering, deployment checks, docs, dependency posture and tests. This is not an exhaustive line-by-line review of all CSS/assets, an external penetration test, a Python transitive dependency audit, a live provider certification, or a legal review. Browser access was unavailable during earlier visual verification; this audit did not claim fresh browser QA. No real payment, transfer, shipping purchase or account message was sent.

## Implementation follow-through

Implemented after the audit: public companion/pull allowlists; practice-only inventory provenance and live sale guards; live companion offline default and server rejection of live scripted requests; exact persisted Checkout payloads without a stale fixed expiry; definite-rejection cleanup; bounded idempotent retries and verified session/refund reconciliation controls; terminal refund attempt history/retry and monotonic success; a dedicated revisioned Rip service with selection-bound confirmation and atomic durable pull/announcement commits; capture disposal on navigation and stable crop/variant controls; explicit catalog/companion render options instead of HTML string surgery; companion/vision-aware preflight; confirmed-pull spotlight and recent-pulls OBS presets. Removed the extra raw JSON copy created by practice changes; verified SQLite backups remain.

Regression coverage includes real HTTP/SSE private-field checks, offline/scripted provider boundaries, practice sale rejection, delayed scan/select responses, duplicate confirmation, save failure, restart preservation, media-track disposal, crop persistence, payment rejection/uncertainty, reconciliation identity/amount checks and late refund response monotonicity. Provider fixtures stay confined to tests and explicit practice workflows.

Remaining release work: live provider credentials/configuration, real Twitch/Stripe/Prime-or-Photon/shipping-or-wallet rehearsals, external HTTPS routing, off-host restore and monitoring, and actual browser/OBS visual QA (browser access is disabled in Work settings). Long-lived uncertain payment attempts deliberately retain their hold until a matching provider object is verified; no unsafe absence/force-release assertion is exposed. Large-history performance measurement and optional broader module extraction remain improvements, not claims of completed scale testing. Cosmetic vote reactions remain planned; spotlight and ribbon are implemented without animation replay or invented events.

Latest verification after implementation: syntax checks pass, 144 tests pass, Python adapter compiles, running health is 200, both pull widget routes return 200, public profile instructions are absent, and the existing live workspace now uses the offline companion. Production preflight still fails external HTTPS/Twitch/Stripe/policy setup; sample-stock and scripted-companion checks pass.

## 2026-10-26 follow-up execution

Baseline: `2d23cf8` plus current dirty workspace. Four independent plans, executed sequentially in an isolated worktree to avoid overlapping file edits. No changes are merged into the original checkout.

| Plan | Priority | Depends on | Status |
| --- | --- | --- | --- |
| [002 Physical payment environment](002-physical-payment-environment.md) | P1 | None | DONE — reviewed |
| [003 Browser-bound OAuth](003-browser-bound-oauth.md) | P1 | None | DONE — reviewed |
| [004 Auction shipping snapshot](004-auction-shipping-snapshot.md) | P1 | None | DONE — reviewed |
| [005 Proxy sign-in limits](005-proxy-signin-limits.md) | P2 | None | DONE — reviewed |

Verification before execution: npm run check passed; 145 tests passed; npm audit --omit=dev reported zero advisories. Product direction ideas are deferred; user selected the four concrete defects.

### Review verdict: APPROVE

All four fixes are implemented in `/Users/area/.codex/worktrees/commerce-auth-fixes/live-shopping-companion` on `codex/commerce-auth-fixes`. Copied dirty-workspace baseline: `89217413ffcb4e5ef9c2eb909004afbaef1502f6`. Final implementation: `1f0c31544691d9033c19769329be58cd3cfd4445`. Review compares baseline..final, excluding pre-existing workspace work.

Independent reviewer verification on 2026-10-26: `npm run check` passed; `npm test` 156/156 passed; `npm run demo:check` both commerce journeys and public privacy checks passed; `git diff --check 8921741..HEAD` passed. All 18 changed source/test/config paths are within authorized scope. Full diff and new regression assertions reviewed. No merge or push performed. Original source checkout is unchanged; this plans directory is the canonical review record (the worktree's plans were captured with its baseline).

Deployment note: bundled Caddy requires `AUTOLOOT_TRUSTED_PROXIES=127.0.0.1` to enable per-client anonymous rate buckets. Trust remains disabled by default. Legacy auctions missing stored shipping terms must be cancelled and restarted. Real browser/Twitch/Caddy rehearsal remains unperformed; HTTP provider fixtures verify callback success, browser proof, cookie flags/clearing, replay protection and local-to-public handoff without real provider requests.

## 006 — Chat command discovery

DONE — APPROVED. [Plan](006-chat-command-discovery.md). Implemented at 09e015c on codex/chat-command-help in /Users/area/.codex/worktrees/chat-command-help/live-shopping-companion. All 161 tests, syntax/demo/diff checks pass; desktop and mobile browser review passes. Persistent storefront reference, top shortcut, chat help aliases, public Help and operator docs are implemented; live OBS next-bid guidance remains after bids. No merge or push performed.

## 007–008 architecture audit and execution — complete

[007 Audit](007-architecture-audit.md) and [008 execution/review](008-modular-architecture.md). DONE — APPROVED. All seven stages implemented on codex/modular-architecture, baseline 09e015c to implementation ce5791a. Reviewer independently verified 177 tests, four rendered browser tests with unchanged snapshots, syntax/lexical/import/CSS guards across 94 modules, demo journeys and diff checks. Manual desktop/mobile/OBS review passed. The stage 6 extraction failure was repaired under an explicit handler-policy refinement before approval. No push/merge or real-provider rehearsal.

## 009 — Follow-up hardening and admin setup

[Plan and review](009-follow-up-hardening.md). DONE — APPROVED. Four verified security/correctness defects repaired; administrator routes and storefront extracted; selective panel CSS ownership fixed. User-requested username/strong password setup and admin entry artwork/layout refinements reviewed. Applied by executor to current dirty workspace while preserving prior work; no commit/push. Full suite: 183 tests plus syntax/demo checks. Browser rendering and real-provider rehearsal remain unverified.

## 010 — Current-workspace maintainability

[Execution plan](010-maintainability-refactor.md). DONE — applied and verified against current dirty snapshot. Backend route/policy/SSE and frontend workspace/control/lifecycle ownership extracted; ordered CSS split and shadowed root-variable cleanup guarded by cascade fingerprint; recursive syntax/import/cycle/surface checks. Original verification:198 tests,79 runtime checks, demo/privacy journeys, whitespace and HTTP smoke pass. No commit/push or rendered browser/provider rehearsal. Historical plan008 worktree remained reference only.

## 011 — Post-refactor maintainability audit

[Read-only report](011-maintainability-audit.md), baseline5a5190b. Architecture acceptable for continued development. User-approved follow-through completed: split-UTF8 JSON decoding and rejected-setting mutations fixed; repeatable lexical gate now runs through CI check. Verification:202 tests,80 runtime syntax/binding/import checks, demo/privacy checks and zero dependency advisories. No live-provider/browser certification or commit/push for this follow-through.

## 012 — Order attention and buyer packing

[Plan](012-order-operations.md). DONE — APPROVED for first stage: Needs attention queue and buyer packing reference. Executor branch `codex/order-operations`, commit `bd0258d`, worktree `/Users/area/.codex/worktrees/order-operations/live-shopping-companion`. Reviewer read all four implementation files and independently verified 81 runtime checks, 208 passing tests, demo/privacy journeys and clean whitespace. Dirty baseline preserved separately; original source unchanged; no merge/push. Combined package labels, dispatch and shipping-charge adjustments remain unimplemented. Browser/provider rehearsal unperformed.

## 013 — Combined-package shipping

[Plan](013-combined-package-shipping.md). DONE — APPROVED. Commit `20a9103` on `codex/order-operations` in `/Users/area/.codex/worktrees/order-operations/live-shopping-companion`. Implements creator-confirmed 2–50 order packages, shared label recovery through any member, member holds and single-commit dispatch. Buyer charges remain unchanged. Reviewer independently verified check81, tests217, demo/privacy and whitespace; desktop browser fixture created a 2-order package from 3 matching paid orders, purchased one test label and dispatched both members with same tracking, leaving third unshipped. Reviewed shipping authority/projections, guards, API/UI/docs and regression tests; source baseline dirty edits preserved outside implementation commit. Mobile viewport inspected only; no real provider/postage validation. Original checkout source unchanged; no merge/push.

## 014–017 — Audit follow-through

User authorized execution of all audited improvements and direction options. Work is isolated on `codex/order-operations` at `/Users/area/.codex/worktrees/order-operations/live-shopping-companion`; original source remains unchanged.

- [014 Refresh/design](014-refresh-and-design.md): implemented `6788260`; reviewer read connection/revision/design diff, independent integrated233 tests/check81 passed. Public chat-only updates skip buyer requests and identical rebuilds, keyed invalidation protects private contents.
- [015 Postage](015-postage-costs.md): implemented `788f22f`; exact package cents allocation/manual overrides/provenance reviewed, accounting regression and integrated233 tests passed.
- [016 Claims](016-giveaway-claims.md): implemented `5083772`, docs followup `9dcce8e`; domain/API/privacy/history/deadline review passed. Reviewer browser fixture submitted winner's private address through actual storefront; on-time claims remain fulfillable after deadline. Independent integrated233 tests/check81 passed before final docs-only followup.
- [017 Maximum bids](017-private-max-bids.md): IN PROGRESS. Shared resolver, ownership/privacy and UI in development; reviewer identified tied-leader ceiling raise incorrectly increasing payable price and max draft loss on live rerender; fixes/regression tests required before approval.

### 014–017 final execution review — approved

All five requested items complete. Final maximum-bid commit `2fb1564`, branch `codex/order-operations`; preceding feature commits `788f22f`, `6788260`, `5083772`, `9dcce8e`. Reviewer independently verified final combined source: `npm run check`82 runtime modules, `npm test`244/244, `npm run demo:check` all journeys/privacy, and `git diff --check`. Reviewed source, tests and docs; final changes28 files relative to20a9103, inherited dirty baseline remains uncommitted and excluded.

Plan017 DONE — APPROVED. Independent cold reviewer and parent verified fixes for tied leader ceiling raises and draft preservation. Browser fixture set$100 private ceiling on$45 opening, observed public payable$45 and private owner response, then preserved typed$150+consent across a rival accepted bid; no browser JS errors. Claim browser fixture submitted a private US recipient through storefront. Domain/HTTP tests cover exact-cent cost conservation, claim ownership/history/expiry, direct/proxy resolver ties/retries/deadlines/blocked users, creator/public/SSE ceiling privacy and final payable order prices. Maximum bids are raise-only; proxy-enabled disputed auctions require cancellation rather than per-bid void. Giveaway postage remains manual and on-time claims remain fulfillable after deadline. Live Twitch/provider rehearsal and production load certification remain outside verification. No merge/push; original checkout source unchanged.

## 018 — Promoted main audit

[Report](018-promoted-main-audit.md), audited8f4ef80 after main promotion/push. Standard read-only pass; check82/test244/demo/privacy pass, zero dependency advisories. Two verified findings: optional docs build missing leaves Help/FAQ404 on tracked-only deployments, and hackathon guide incorrectly denies label purchasing. No new high-confidence commerce/security/atomicity defect found. Considered/rejected and limits recorded in report. Awaiting selection; no source fixes or implementation plans written.

## 019 — Help fallback and submission guide

[Plan](019-help-and-submission-fixes.md). DONE — APPROVED. Executor isolated branch codex/help-fallback, baselinee5479ac. FAQ aliases now prefer optional rich docs and serve tracked usable help otherwise; existing help302 remains. Corrected hackathon label feature description and documented fallback. Reviewer inspected all source/docs/tests; independent check82/tests247/demo/privacy/whitespace pass. Browser /help followed to styled bundled FAQ200 with no optional build;390px mobile has no horizontal overflow and payments anchor exists. Tests cover tracked-only deployment, internal links, HEAD, rich docs/assets priority, unknown paths and raw traversal404. Promotion authorized; implementation commit and main merge recorded in git history.

## 020 — Rip confirmation and inline-form audit

[Report](020-rip-and-form-audit.md), baseline49c7c59. Read-only standard pass; check82/tests247 pass, zero dependency advisories. Two independently reproduced findings: malformed quote formatting leaves ghost pull before commit; workspace draft capture loses textarea/select state and global same-name tracking restore can target wrong prize form. Recommend both fixes; no implementation plans/source fixes yet. Prior Help/submission and commerce findings remain resolved; rejected interpretations/limits in report.

## 021 — Atomic pulls and entity-scoped drafts

[Plan](021-rip-and-draft-fixes.md). DONE — APPROVED. Commit283f098 on codex/rip-draft-fixes at /Users/area/.codex/worktrees/rip-draft-fixes/live-shopping-companion. Provider guide structures/currency validated; host announcement prepared before ledger mutation, malformed guide retains no-price review. Giveaway opt-in draft keys preserve exact entity/mode/recipient revision; pending submit guards survive rerenders. Focused safe search controls bind stable control ID+form ID+surface; no global name restore, secrets/modal/max excluded.

Reviewer independently ran check82/tests258/demo/privacy/whitespace. Cold reviewer caught initial focused Rip search regression, executor fixed Rip/Catalog scoped restoration and added tests; final cold review approved18 focused tests. Actual browser preserved title/rules/nondefault selects, two separate prize tracking values+checkboxes+textarea focus across unrelated chat; revised Rip search query/focus also survived SSE, no JS errors. Docs/vision+architecture shipped in same commit. Scope11 files; original source unchanged, no merge/push/live-provider calls. Plan020 findings resolved in isolated implementation; original checkout has report/plan records only.

## 022 — Latest implementation run-expiry audit

[Report](022-run-expiry-audit.md), baseline283f098 (unmerged latest worktree). Read-only standard pass; check82/tests258 pass, zero advisories. One independently reproduced finding: direct/max auction bids lack synchronous owning-run expiry enforcement and can enter between arming expiry and200ms runner poll. Recommend shared boundary guard + exact-expiry regressions. No new NFT/draft/Rip defect found; considered/rejected and validation limits recorded. Awaiting selection; no source changes or implementation plan.

## 023 — Run expiry guard

[Plan](023-run-expiry-guard.md). IN PROGRESS — authorized execution based on approved283f098, isolated executor and independent review. Reject expired or invalid run-owned auction bidding synchronously; preserve accepted-bid settlement and existing orders.

### 023 execution review — DONE / APPROVED

Commit54dc8c0 on codex/run-expiry-guard at /Users/area/.codex/worktrees/run-expiry/live-shopping-companion, based283f098 and including its prior Rip/draft fixes. Reviewer read all four changed files and meaningful regression assertions; independently ran check82/tests265/demo journeys/privacy successfully. Whitespace clean, isolated commit clean, scope compliant. Shared pre-tick guard rejects invalid/expired run ownership before direct/private offer mutation, including exact expiry and coincident auction end. Existing accepted bids can settle and orders remain payable/fulfillable. No merge/push or live provider calls. Plan022 finding resolved in isolated implementation.
