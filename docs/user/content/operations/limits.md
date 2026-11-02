---
lastUpdated: '2026-10-24'
---

# Data and limits

## What is stored

`.data/show.json` contains show, inventory, auction, registration, and order data. `.data/images/` holds uploaded catalog photos. Twitch app credentials saved through the local setup screen also live in the private data directory. `DATA_DIR` can relocate the store.

Back up the entire data directory while the server is stopped. Restore a known valid backup if loading fails. The startup code deliberately refuses to replace unreadable saved state. Do not publish the data directory: orders can contain private shipping information.

## What resets

Creator capabilities, OAuth tokens, login sessions, companion proposals, catalog selection, and Rip pull history live in memory. Reconnect after restart and export pulls beforehand. Registered buyer IDs and orders persist. Auctions restart paused.

## Runtime limits

One process owns one workspace. SQLite commits protect workspace state with WAL/full synchronization and a single-writer guard. Buyer sessions and delivery intents persist; verified local backups and offline restore tooling are included. Do not run multiple servers against the same data directory.

The app lacks durable sessions, database transactions across workers, preauthorized bidding, automatic expiration of pending reservations without checkout, shipping-label purchase, automated tax, dispute operations, and production admin identity/monitoring.

## Verification limits

Automated tests use signed Stripe fixtures with mocked network methods. The disposable demo simulates Twitch and payments. These do not prove a real provider checkout, refund, Twitch broadcast, or OBS audio on your machine. Verify the integrations you configure before running a real show.
