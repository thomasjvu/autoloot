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

## Export and limits

**Export CSV** exports all orders, regardless of the current view filter. Each row includes mode, status, date, money, cost completeness and private notes. Treat the export as private; spreadsheet formula prefixes are escaped.

This is lightweight operational bookkeeping. Fees and delivery costs are manually recorded, not automatically imported from provider payouts, labels or blockchain evidence. Taxes, disputes, partial refunds, operating expenses, inventory valuation and bank/payout reconciliation are not implemented. Historical refunds reduce their original order's net rather than creating a dated cash-ledger entry. Do not use estimated contribution as audited profit or tax reporting.

Creator-only POST routes: `/api/accounting/costs` records order annotations; `/api/accounting/export` returns CSV. Public state and buyer-order endpoints omit cost records.
