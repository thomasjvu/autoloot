# Payment onboarding decision

Decided October 26, 2026.

## Single-user edition / hackathon

One installation serves one streamer. The streamer owns the Stripe account, completes account activation and verification on Stripe, and configures a restricted API key and webhook signing secret on their own server. Existing Stripe Checkout remains hosted by Stripe. Settings provides a short guided handoff, connection status, installation instructions and sandbox verification steps.

This does **not** use Stripe Connect, connected accounts, application fees or platform-managed payouts. Stripe-hosted **Connect onboarding** cannot provide keyless connection for an independent installation without a Connect platform. Opening Stripe Dashboard is account setup, not an OAuth connection; the UI must not claim successful connection merely because a user returns from Stripe.

Current storage stays SQLite with existing backups and recovery. D1 is not a requirement for this edition. Credentials never go into companion prompts or the repository.

Optional [USDC checkout](crypto-checkout.md) is a separate physical-order payment method; it does not use Stripe Connect.

## Possible multi-user hosted edition

If pursued after the hackathon: Cloudflare D1 for application data and Stripe Connect for seller onboarding. Start with Stripe-hosted Connect onboarding, subject to selecting the platform's responsibilities and charge pattern. Each authenticated streamer must map to an isolated connected account; payment/refund requests and webhook processing must validate that mapping. Track actual payment/payout capability status rather than redirect completion. Maintain separate sandbox/live identities and replay-safe events.

A hosted design needs tenant isolation, transactional auction/reservation handling, authenticated account access, migrations/backups, shared event delivery, and a solution for the local Codex companion runtime. D1 and Connect are future architectural choices, not implemented or deployed features.
