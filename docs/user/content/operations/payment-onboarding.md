# Payment onboarding decision

Decided October 26, 2026.

## Single-user edition / hackathon

One installation serves one streamer. The streamer owns the Stripe account, completes account activation and verification on Stripe, and configures a restricted API key and webhook signing secret on their own server. Existing Stripe Checkout remains hosted by Stripe. Settings provides a short guided handoff, connection status, installation instructions and sandbox verification steps.

This does **not** use Stripe Connect, connected accounts, application fees or platform-managed payouts. Stripe-hosted **Connect onboarding** cannot provide keyless connection for an independent installation without a Connect platform. Opening Stripe Dashboard is account setup, not an OAuth connection; the UI must not claim successful connection merely because a user returns from Stripe.

Current storage stays SQLite with existing backups and recovery. D1 is not a requirement for this edition. Credentials never go into companion prompts or the repository.

Optional [USDC checkout](/docs/operations/crypto-checkout) is a separate physical-order payment method; it does not use Stripe Connect.

## Possible multi-user hosted edition

Update November 1, 2026: Cloudflare/D1 is now the accepted hosted direction;
see [hosted migration](https://github.com/thomasjvu/autoloot/blob/main/docs/dev/content/developers/hosted-migration.md). The payment decisions below still
need their own implementation and account-level validation.

If pursued after the hackathon: Cloudflare D1 for application data and Stripe Connect for seller onboarding. Start with Stripe-hosted Connect onboarding, subject to selecting the platform's responsibilities and charge pattern. Each authenticated streamer must map to an isolated connected account; payment/refund requests and webhook processing must validate that mapping. Track actual payment/payout capability status rather than redirect completion. Maintain separate sandbox/live identities and replay-safe events.

The hosted backend now includes shared Hono routes, owner-verified Twitch sign-in,
Durable Object transactions, D1 projection/account migrations, R2 and a paired
local Codex bridge. It remains one configured owner per deployment. Stripe
Connect and public multi-seller onboarding are not implemented. See the
[hosted setup](https://github.com/thomasjvu/autoloot/blob/main/docs/dev/content/developers/hosted-migration.md) for tested behavior and deployment gates.
