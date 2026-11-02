---
lastUpdated: '2026-10-24'
---

# Orders and fulfillment

## Order lifecycle

Winning an auction or making a direct purchase creates a pending order and reserves inventory. Prices, product details, and flat shipping are snapshotted at creation.

| State                            | What to do                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------- |
| Pending                          | Buyer begins Checkout, or creator uses the supported demo/external payment path |
| Processing                       | Wait for the signed asynchronous payment result                                 |
| Paid / Test-paid / Paid-external | Review payment type and prepare fulfillment                                     |
| Shipped                          | Tracking has been recorded                                                      |
| Cancelled / Expired              | Reservation released once                                                       |
| Refunded                         | Successful supported refund; stock restored once                                |

## Payment options

Stripe Checkout is the online payment path. Returning to the success page does not prove payment; a signed webhook must match the order, session, amount, currency, and payment environment.

Demo orders have an explicit Test payment action. External payment confirmation is available only without an active Stripe checkout. Never mark an active checkout paid manually.

## Cancel and refund

Cancel unpaid orders through the app. An open checkout is expired first; a payment that already completed is reconciled. Paid orders require a refund rather than cancellation.

Full Stripe refunds are supported before shipment. Stock returns only after successful provider confirmation. Shipped orders and externally paid refunds require handling outside the app.

## Fulfill and reconcile

Add a tracking reference from Orders. Download CSV totals for reconciliation or open an authenticated receipt. Receipt JSON omits address and email. Shipping details remain visible only to the order owner and local creator.

Pending reservations without a started checkout have no automatic timeout. Review and cancel abandoned pending orders explicitly.

## Sales & numbers

Open Sales & numbers for collected funds, refunds, outstanding orders and seller-recorded costs. Real sales and practice/test activity are separate. Blank costs remain unknown; contribution is an estimate. CSV exports all orders with mode and private notes. This does not reconcile taxes, disputes, partial refunds or bank payouts.
