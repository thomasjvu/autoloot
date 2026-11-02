# Order operations: attention queue and buyer packing

Planned at: 5a5190b. Source baseline includes existing uncommitted work; preserve it.

## Outcome
Add a Needs attention Orders filter with actionable reasons and a buyer-grouped packing view. Deliver a useful first increment toward combined shipping, without changing historical shipping charges or treating separate order labels as a combined package. Full combined label/payment semantics remain a later stage, explicitly reported.

## Scope
public/workspace/orders.js, a new pure helper under public/workspace/, tests/order-operations.test.mjs, docs/user/content/operations/shipping.md. If needed public/workspace/commerce-controls.js and public/app.js for existing filter wiring only. Match existing module imports, presenters, table/panel markup and escaped values. Do not change CSS, money, shipping state machines, authentication or existing working changes.

## Steps
1. Inspect existing order/filter wiring and engine payment eligibility. Add a pure classification helper for unpaid/processing, missing required address fields on eligible physical orders, unresolved checkout/refund/label attempts and failed digital delivery. Terminal cancelled/expired/refunded orders must not be flagged merely for missing address. Reuse existing actions, add clear next-action text, and preserve provider uncertainty rather than encouraging repayment.
2. Add Needs attention and Packing by buyer filter tabs. Attention rows show reason(s), actionable controls already supported. Packing groups only paid physical unshipped orders without refund requests or uncertain/active label liabilities. Group by verified userId plus mode and actual normalized destination; missing identity/address must never combine unrelated buyers. Include visible order/item list, counts and totals with the actual separately charged shipping. Groups are packing suggestions, not combined labels; preserve every order action and show why excluded/problem orders need review. Do not falsely claim combined shipping or modify payment/dispatch records.
3. Add meaningful pure-function and rendered-markup tests for classification, terminal states, same-name different IDs, different modes/addresses, NFT exclusion, payment verification, refund and label guards, escaping and filter regression. Document grouping and combined-label limitation in docs/user/content/operations/shipping.md.
4. Verify npm run check, npm test, npm run demo:check, git diff --check. Report actual results and limitations.

## Workflow
Executor must work in an isolated git worktree, preserving dirty baseline source by copying tracked modified files into that worktree before implementation (never copy .env or .data). Use codex/order-operations branch. Commit only implementation scope files; keep inherited baseline changes separate/uncommitted. Do not merge or push. Reviewer owns plans index. Stop on incompatible data model or verification infrastructure; report concrete obstacle.
