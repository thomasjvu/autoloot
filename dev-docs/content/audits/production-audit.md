# Production audit — 2026-10-25

Scope: single-streamer backend, payment and NFT transitions, SQLite recovery/backup tools, HTTP resource handling, production checks and test value. This is a source review with local fixtures, not a penetration test or a real-account certification.

## Findings fixed

| Priority | Finding | Resolution |
| --- | --- | --- |
| High | A Stripe test payment on a live order could authorize a real NFT transfer. | NFT authorization and queued wallet dispatch require live Stripe payment evidence or the separately explicit external-payment path. The storefront readiness check also rejects test credentials. |
| High | A refund awaiting its provider response left the order available for fulfillment. | Persist a refund hold before the network call. Shipping/NFT authorization refuse held orders, including after restart or a lost response. Retry reconciles using the existing refund identity/idempotency key. Uncertain outcomes remain held. |
| Medium | Changing a reserved physical listing into an NFT could let cancellation/expiry restock the wrong kind of inventory. | Reject fulfillment/asset changes while orders remain allocated. |
| Medium | WAL-mode backup copies left sidecar artifacts; storage/restore checks did not share startup's commit-digest validation. | Exclusively create private targets, publish self-contained rollback-journal copies, check commit digest/SQLite/foreign keys, remove failed copies and fsync the publication directory. Startup and tools share the reader. |
| Medium | Slow SSE clients could accumulate repeated full snapshots; public OAuth entry could grow pending state without a hard bound. | Coalesce snapshots while writes are backpressured, cap viewer connections, rate-limit OAuth entry and bound pending login/rate-limit maps. |
| Low | An existing Twitch config filename was enough to pass its readiness check. | Require credential fields, not file existence. Health checks run before session reads so failed storage can still report 503. |

## Test cleanup

Removed the standalone JSON stringify/parse constructor test (covered by actual SQLite/restart flows) and the trivial bid-display arithmetic test (business amount enforcement remains covered). Removed the unused save-counter fixture. Kept security, identity, stock conservation, provider races, finality, crash recovery and HTTP ownership coverage.

Strengthened existing tests rather than adding a parallel audit suite: backup retention now checks actual pruning and preserves a manual backup in the managed directory; corrupted commit checks cover startup/backup/CLI; refund tests check repeat effects and already shipped orders; speech tests actually exercise clock extension and reduced-motion output; readiness rejects test credentials. Added one refund-in-flight/restart regression. NFT coverage now exercises test-payment and refund holds. This records the suite at the time of the audit; use `npm test` for the current count and result.

## Launch blockers and unverified boundaries

The local production check still fails for a public HTTPS origin, Twitch credentials, live Stripe/webhook credentials and configured seller policies. No live launch was performed. Actual constrained signer/provider compatibility, real signed payment/refund webhooks and real-chain delivery still require account-level rehearsal. SQLite health and dependency audit results do not establish those integrations.

Off-site encrypted backups, restore drills, TLS/proxy deployment and external alerting remain operational prerequisites. A refund whose response is lost remains held until reconciled; failed/uncertain refund recovery must be rehearsed before unattended use. Full workspace snapshots and a single RPC trust source remain architectural limits. Test the intended history/catalog size and concurrent viewers before increasing capacity. There has been no hardware-failure, production-load, external penetration or independent signer-security assessment.

Validation: full Node suite, syntax checks, disposable commerce demo, SQLite integrity/commit check and npm dependency audit. No real Twitch, Stripe or funded wallet requests were used by the automated checks. See deployment (`production.md`) and NFT integration (`nft-delivery.md`).
