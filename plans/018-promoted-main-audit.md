# Promoted main audit

Audited source: 8f4ef80, promoted and pushed to origin/main. Standard read-only improve pass. Node ESM local-first service, vanilla browser modules, SQLite, Stripe/Shippo/Twitch adapters. Existing design/architecture/operator boundaries and plans011–017 reconciled; no source edits made during audit.

## Verification

Merged main: npm run check passed82 modules; npm test244/244; npm run demo:check passed commerce/private projection journeys; git diff --check clean. Operations reviewer ran31 focused shipping/accounting/CSV tests. npm audit reports zero advisories. origin/main verified8f4ef80 after push. These are fixture/local checks, not provider certification.

## Vetted findings

| Priority | Finding | Category | Impact | Effort | Risk | Confidence | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Help/FAQ lacks tracked fallback when optional rich docs build is absent | UX/docs/tests | Fresh checkout deployments route users to404 | S–M | LOW | HIGH | lib/http/static.mjs5–14 redirects help and serves docs only from documentation/dist; README47 says ignored separate checkout; workspace-navigation.js6 always links there; runs-http.test.mjs57 checks redirect only |
| 2 | Submission guide claims no label purchasing | Docs | Operator follows inaccurate feature-description checklist | S | LOW | HIGH | docs/hackathon.md23 contradicts implemented labels and line39 |

Finding1 is conditional: current local installation has a rich docs build and FAQ returns200. git ls-files documentation yields no files and the build is ignored, so that success is not reproducible from tracked deployment contents. public/help.html exists but is unconditionally redirected, bypassing a possible tracked fallback. Remediation: preserve optional rich docs, provide tracked minimal Help/FAQ otherwise, test final redirect destination in a tree without optional docs. Finding2 remediation: describe implemented Shippo labels and separate real-provider rehearsal boundary.

## Direction options (not defects)

- Scheduled lots/pre-bids (L): roadmap21–23; build on max resolver after specifying inventory exclusivity, schedule transitions, cancellation and reminders.
- Offers/timed fixed-price sales (M–L): roadmap29–31; reuse reservations/payment snapshots with explicit seller-approved expiry and simultaneous acceptance rules.
- Prize labels (M–L): giveaways guide19–21 still arranges postage separately; define prize fulfillment entity before sharing shipping mechanics, never create a sale/payment entitlement from draw.

## Considered and rejected

No new confirmed bypass/atomicity issue in maximum bids, claims, combined shipments, postage allocation, CSV or payment ownership. Previously fixed leader-ceiling self-price raise and max-draft loss remain resolved. Raise-only caps, cancellation instead of proxy voiding, unchanged buyer charges, current-label-only accounting, US prize addresses, mode-bound claims, trusted local database and synchronous single-writer SQLite are documented decisions. Full snapshot/HMAC scans remain a load-test concern, not a measured new performance finding. No broad architecture rewrite or dependency migration justified.

## Limits and next step

Not audited: real Twitch/Stripe/Shippo behavior, provider credentials/setup, full NFT chain internals, audience-scale throughput, all marketing assets or full accessibility. Recommend plans for both confirmed findings; await user selection before writing implementation plans or changing source. Browser/load coverage is a separate next validation investment.
