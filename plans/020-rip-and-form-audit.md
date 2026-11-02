# Fresh audit: Rip confirmation and workspace drafts

Source baseline49c7c59, main. Standard read-only improve pass. Recon reconciled plans011–019, Node ESM/vanilla browser/SQLite architecture, package verification commands and existing design/operator decisions. Focus expanded to inference/catalog/media, runtime/backup and workspace inline forms rather than re-reporting recent commerce fixes.

## Verification

npm run check passed82 runtime modules. npm test247/247 passed. Reviewers ran17 inference/catalog/vision tests and20 storage/help/runtime/policy tests; npm audit zero advisories. No source edits. New failures reproduced with in-memory fixtures and importable presenter/focus helpers, no provider calls.

## Vetted findings

### BUG-01: Format/validate a pull before mutating the pull ledger

- Evidence: lib/integrations/rip.mjs33 accepts provider currency without validation;37 formats via Intl.NumberFormat. lib/commerce/rip-session.mjs33–34 inserts a pull before that formatting.
- Impact: malformed quote currency makes confirmation fail, leaves a ghost pull in memory, and an unrelated later commit persists it. Selection remains active so retry can duplicate.
- Effort S; risk LOW; confidence HIGH.
- Reproduction: Metadata fixture finite raw quote with currency invalid -> confirm throws RangeError, pulls1/saves0; unrelated engine.chat -> pulls1/saves1. No persistence fixture or source file modified.
- Fix sketch: validate quote structures/currency at provider boundary and prepare announcement before mutating engine state. Regression must prove failure leaves pulls, companion and confirmation selection unchanged; later unrelated commit must not persist rejected pull.

### UI-01: Preserve full form drafts by form and entity

- Evidence: connection.js17 renders every workspace snapshot; app.js221–222 replaces app DOM. lifecycle/focus.js6 captures only focused INPUT;16 restores first global input[name]. giveaways.js2 renders empty prize/rules and default selects;5 renders multiple prize tracking inputs with same name.
- Impact: chat updates erase rules/textareas, unfocused fields and selections. Tracking typed into a later prize can be restored into the first prize's form, potentially recording wrong shipment information if submitted.
- Effort M; risk MED; confidence HIGH.
- Reproduction: focused rules textarea -> capture draft null; giveawaysPage returns empty rules. Focus second tracking INPUT -> captured name/value -> restore selector input[name="tracking"] -> first form gets second form value.
- Fix sketch: key complete inline draft state to exact form/entity (including textarea/select/checkbox and focused field); clear after successful submit or entity change. Never restore by name globally. Regression for multiple dispatch forms and unrelated SSE/chat events before broadening other forms.

## Priority and dependency ordering

Recommend both fixes. BUG-01 is isolated and can land independently. UI-01 needs characterization tests for multi-form identity first; preserve existing maximum bid-specific draft behavior and modal controls. Implementation plans await user selection; no source fixes performed.

## Direction options

Prefer these correctness fixes before more commerce formats. Future options remain scheduled pre-bids (docs/dev/content/developers/roadmap.md21–23, L) and an explicit prize-fulfillment entity enabling prize labels (docs/user/content/operations/giveaways.md19–21, M–L). These are product options with inventory/ownership/expiry decisions, not defects or current work.

## Considered and rejected / limits

Recent maximum-budget privacy, own-leader ceiling pricing, storefront draft retention, Help fallback/rich-doc preference, package holds and cost allocation fixes remain intact. Local-only admin, sync single-writer SQLite, current-label accounting and explicit reviewer approval are documented decisions, not findings. No new confirmed runtime/storage/security issue found; no broad architecture rewrite or dependency migration justified.

Not audited: real Twitch/Stripe/Shippo/Metadata/vision accounts, full NFT verification internals, production proxy setup/load capacity, all marketing assets or full accessibility. Fixture coverage does not certify those boundaries.
