---
lastUpdated: '2026-10-24'
---

# Stripe Checkout

Autoloot charges through the individual streamer's Stripe account. This build has no Connect routing or platform fee.

## Configure sandbox payments

Set `STRIPE_API_KEY` and `STRIPE_WEBHOOK_SECRET` on the server. Both are required for Checkout. Begin with a restricted sandbox key. The app needs Checkout Session create/retrieve/expire, Payment Intent access, and Refund operations.

For local event forwarding, use an authenticated Stripe CLI:

```sh
stripe listen --forward-to localhost:4173/api/stripe/webhook
```

Copy the printed endpoint signing secret into `.env` and restart. Subscribe the endpoint to:

```text
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
checkout.session.expired
refund.updated
```

## Shipping and totals

Set allowed destinations with `SHIPPING_COUNTRIES`, for example `US,CA`. Set a flat shipping price in Edit show. Each order snapshots shipping and product amounts; the checkout total comes from server state. Automatic tax is not implemented.

## Payment authority

The signed raw-body webhook verifies the session and order IDs, exact USD amount, and environment. Duplicate events are ignored. Unpaid completed sessions remain processing; async success marks paid. Failed or expired sessions release stock once. Success/cancel browser redirects do not mark payment.

## Verification status

Tests exercise the real SDK signature verifier with signed fixtures and a mocked provider client. A real sandbox purchase and refund were not verified during the documented development flow. Run the full provider flow with your own sandbox configuration before accepting real payments. See [Orders](/docs/streamer/orders) for cancellation and refund boundaries.
