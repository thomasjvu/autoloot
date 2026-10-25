# Production deployment

The supported scope is one streamer, one Node process and one local SQLite data directory. Admin access remains direct localhost only. Public viewers reach the same process through an HTTPS reverse proxy. Do not run replicas or place SQLite on a network volume.

## Service setup

Use an actively maintained Node version satisfying package.json, a dedicated service account, and a private persistent data directory on encrypted local storage. Install pinned dependencies with `npm ci --omit=dev`. Keep credentials out of source control; environment files must be mode 0600. Set `NODE_ENV=production`, `DATA_DIR`, `PUBLIC_URL` (the HTTPS viewer origin), Twitch credentials, live Stripe credentials and webhook secret. NFT runs additionally need trusted RPC endpoints and the constrained signer described in [NFT delivery](nft-delivery.md).

`npm run start:production` enables production configuration checks. Demo seeding, remote HTTP origins, malformed origins, weak configured NFT credentials and invalid backup limits fail startup. The application binds 127.0.0.1 only. View the streamer dashboard directly at localhost; its capability rotates each restart. Buyer sessions survive restarts; streamer Twitch tokens do not, and interrupted runs remain paused until reviewed/reconnected.

For a Linux host, `deploy/autoloot.service` is a hardened systemd template. Create the `autoloot` service user/group, put the checkout at `/opt/autoloot`, persistent data at `/var/lib/autoloot`, and configuration at `/etc/autoloot.env` (with `DATA_DIR=/var/lib/autoloot`). Adjust the Node binary path to the installed version. The service cannot write outside that data directory. The default Codex CLI may need its own explicit executable/configuration under the service account; verify it separately if enabled.

`deploy/Caddyfile` provides automatic HTTPS for `AUTOLOOT_DOMAIN` and blocks public bootstrap/setup paths. Preserve the original Host and forwarded headers. Do not rewrite public Host to localhost or publish another route that exposes bootstrap. Only expose the proxy publicly; keep the app port private. The server independently rejects unknown hosts, cross-site mutations and forwarded/remote admin bootstrap requests. Remote admin access would require a separate authentication design.

## Release checks

Run:

```sh
npm ci
npm run check
npm test
npm run demo:check
npm audit --omit=dev
npm run storage:check
npm run production:check
```

The production check exits nonzero for missing local configuration, seller policies, private file permissions, live payment configuration or NFT infrastructure when inventory requires it. It prints check labels, not credential values. It does not certify an external account or signer. Configure seller identity/policies through the localhost dashboard; terms do not remove the software operator's own obligations.

Before accepting real orders, complete a real Twitch login/reconnect, signed Stripe payment/webhook/refund rehearsal and a provider-supported NFT transfer with a small funded signer. Verify unauthorized destinations/assets/fees are refused by the signer, and rehearse a lost submission response. Provider labels do not establish custody or redemption rights. Do not enable unverified inventory formats.

## Operations

Monitor `/api/health` for non-200 responses and supervise process exits. Admin storage status exposes backup failures and last successful backup time. Alert on those separately: a healthy process alone does not prove backups succeeded. Move verified database backups and uploaded images to encrypted off-site storage and test restore to a disposable installation. Document the maximum tolerable data loss and configure the backup interval accordingly. SQLite WAL is not an off-site backup.

SIGTERM/SIGINT stop new work, close SSE streams, and drain HTTP, wallet and backup work for up to 30 seconds before releasing the database lock. A timed-out external operation remains subject to idempotent reconciliation on restart. The service manager allows 40 seconds. SIGKILL recovery is tested separately.

Full workspace snapshots are committed transactionally; history size affects write latency. Load-test the intended catalog/order history and viewer concurrency before increasing limits. The service caps connections/SSE clients and HTTP timeouts, but does not provide distributed rate limiting. Reown/on-chain payment collection, autonomous procurement and new break-allocation formats remain outside the implemented payment/runner paths.
