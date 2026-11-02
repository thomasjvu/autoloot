# Sales & numbers

Open **Sales & numbers** in the sidebar. Filter real sales versus practice/test activity and the last 7 days, 30 days or all time. Dates use payment time where available, otherwise order creation. Values are USD; money is calculated in integer cents.

| Metric | Meaning |
| --- | --- |
| Collected | Order totals with recorded payment, including shipping and subsequently refunded orders |
| Refunded | Full totals for orders marked refunded |
| After refunds | Collected minus refunds |
| Awaiting payment | Pending/processing order totals |
| Recorded costs | Seller-entered item, payment, delivery and other costs |
| Estimated contribution | Collected minus refunds and recorded costs for paid orders |
| Average collected | Collected divided by the count of paid orders, including refunded orders |

Demo orders and Stripe test payments appear under practice/test. Explicit operator-confirmed external payments appear under real sales; this records the operator's assertion, not independent bank verification.

## Record costs

Use **Edit costs** on an order. Enter item cost, payment fees, shipping/network costs and other costs. Leave unknown amounts blank; enter `0` for a known zero. Incomplete costs flag the contribution estimate. Costs and private notes persist separately from buyer-visible orders and never change checkout, refunds or fulfillment.

## Automatic postage and overrides

A current purchased Shippo label supplies delivery cost when the seller leaves that field blank. The label must have a verified provider transaction and match the order’s live/practice mode. Quotes, pending or failed purchases, and voided/refunded postage are not counted. Other missing costs remain unknown.

For a combined package, postage is divided equally in integer cents across its member orders. Any remainder goes to the first order IDs in sorted order. For example, a $4.25 label covering two orders allocates $2.13 and $2.12. Reordering the order list does not change the allocation. Inconsistent or missing package members leave the automatic cost unknown. Only the current label is used; historical label purchases and carrier adjustments are not a cash ledger.

Enter a delivery cost to override the automatic amount, including `0` for a confirmed zero. Clear the field to restore automatic allocation. An override changes that order’s recorded cost; it does not redistribute the label cost across other orders. The table and CSV identify delivery cost as `shippo`, `manual` or `unknown`. Shipping charges paid by buyers and order totals never change.

## Export and limits

**Export CSV** exports all orders, regardless of the current view filter. Each row includes mode, status, date, money, cost completeness and private notes. Treat the export as private; spreadsheet formula prefixes are escaped.

This is lightweight operational bookkeeping. Payment fees and blockchain costs are manually recorded. Current verified Shippo postage can supply delivery costs automatically; provider payouts are not imported. Taxes, disputes, partial refunds, operating expenses, inventory valuation and bank/payout reconciliation are not implemented. Historical refunds reduce their original order's net rather than creating a dated cash-ledger entry. Do not use estimated contribution as audited profit or tax reporting.

Creator-only POST routes: `/api/accounting/costs` records order annotations; `/api/accounting/export` returns CSV. Public state and buyer-order endpoints omit cost records.
