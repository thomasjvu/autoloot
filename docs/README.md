# Documentation

## User guides

- [Quick walkthrough](walkthrough.md)
- [FAQ](faq.md)

## Setup and operation

| Guide | Purpose |
| --- | --- |
| [Production](production.md) | Single-host deployment, launch checks and monitoring |
| [Hosted migration](hosted-migration.md) | Hono, D1 and the Cloudflare hosted target |
| [Metadata](metadata.md) | Credential-free demo catalog and scoped API credentials |
| [Twitch and OBS](twitch-widgets.md) | Channel login, chat commands and stream widgets |
| [Codex connection](codex-connection.md) | Local companion sign-in, credentials and disconnect |
| [Payments](payment-onboarding.md) | Seller-owned Stripe account and onboarding scope |
| [USDC checkout](crypto-checkout.md) | Optional Solana wallet payments, verification and recovery |
| [Bidding](bidding.md) | Direct bids, private maximums and moderation |
| [Seller policies](operator-policies.md) | Public identity, support, fulfillment and privacy notices |
| [Agent-led runs](agent-led-runs.md) | Queue limits, per-lot review, pause and recovery |
| [Giveaways](giveaways.md) | Free entry, private prize claims and history |
| [Shipping](shipping.md) | Shippo labels, dispatch and Pirate Ship workflow |
| [CSV](csv-and-shipping.md) | Inventory mapping, exports and tracking imports |
| [NFT delivery](nft-delivery.md) | Supported assets, wallet adapter and verified fulfillment |
| [Sales accounting](accounting.md) | Metrics, private cost records and export limitations |
| [Livestream vision](vision.md) | Moondream via Prime/local setup and recognition limits |
| [Storage](storage.md) | SQLite, backups, integrity checks and restore |

## Developer documentation

Developer reference, architecture, lifecycle contracts, release guides, audits, and the design system live in the separate [Autoloot Dev Docs](../dev-docs/README.md) Papers site. Run `npm run dev-docs:dev` to preview it on port 3334.


Documentation describes the single-streamer implementation. Tests and local previews do not establish real payment, provider custody or funded-wallet integration success.
