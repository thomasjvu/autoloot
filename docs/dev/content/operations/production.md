# Production deployment

This page covers the local Node/server edition. For Railway and hosted Node
with Twitch owner authentication, see [deployment targets](/docs/developers/deployment). For the shared Hono application
on Cloudflare Workers with Durable Objects, D1 and R2, use
[Cloudflare hosted setup](/docs/developers/hosted-migration).

The supported scope is one streamer, one Node process and one local SQLite data directory. Admin access remains direct localhost only. Public viewers reach the same process through an HTTPS reverse proxy. Do not run replicas or place SQLite on a network volume.

## Service setup

Use a maintained Node version satisfying `package.json`, a dedicated service account and private persistent data on encrypted local storage.

Build the wallet bundle before removing development dependencies:

```sh
npm ci --include=dev
npm run build:wallet
npm prune --omit=dev
npm run start:production
```

The build requires esbuild. After pruning, use `start:production`; `npm start` runs the build again.

Keep credentials out of source control; environment files must be mode 0600. Set `NODE_ENV=production`, `DATA_DIR`, `PUBLIC_URL` (the HTTPS viewer origin), Twitch credentials, live Stripe credentials and webhook secret. NFT runs additionally need trusted RPC endpoints and the constrained signer described in [NFT delivery](https://github.com/thomasjvu/autoloot/blob/main/docs/user/content/operations/nft-delivery.md).

For the full Metadata catalog, install a separate TCG-scoped production service key and set `METADATA_MODE=api` in `/etc/autoloot.env`. Credential-free demos can use `METADATA_MODE=demo`; see [Metadata setup](https://github.com/thomasjvu/autoloot/blob/main/docs/user/content/operations/metadata.md).

`npm run start:production` enables production configuration checks. Demo seeding, remote HTTP origins, malformed origins, weak configured NFT credentials and invalid backup limits fail startup. The application binds 127.0.0.1 only. View the streamer dashboard directly at localhost; its capability rotates each restart. Buyer sessions survive restarts; streamer Twitch tokens do not, and interrupted runs remain paused until reviewed/reconnected.

For a Linux host, `deploy/autoloot.service` is a hardened systemd template. Create the `autoloot` service user/group, put the checkout at `/opt/autoloot`, persistent data at `/var/lib/autoloot`, and configuration at `/etc/autoloot.env` (with `DATA_DIR=/var/lib/autoloot`). Adjust the Node binary path to the installed version. The service cannot write outside that data directory. The default Codex CLI may need its own explicit executable/configuration under the service account; verify it separately if enabled.

`deploy/Caddyfile` provides automatic HTTPS for `AUTOLOOT_DOMAIN` and blocks public bootstrap/setup paths. Preserve the original Host and forwarded headers. Do not rewrite public Host to localhost or publish another route that exposes bootstrap. Only expose the proxy publicly; keep the app port private. The server independently rejects unknown hosts, cross-site mutations and forwarded/remote admin bootstrap requests. Remote admin access would require a separate authentication design.

For the bundled same-host Caddy deployment, set `AUTOLOOT_TRUSTED_PROXIES=127.0.0.1`. The default is empty (no trusted proxy). This is a comma-separated list of exact immediate proxy IPs, not CIDRs. Caddy overwrites `X-Autoloot-Client-IP` with its observed direct client address; the app uses it only for anonymous rate limits when the socket peer matches the configured list. Untrusted or invalid address headers fall back to the socket address. Authenticated buyers retain session-based limits and forwarded requests still cannot bootstrap admin access. Keep the app port private: trusting a proxy peer explicitly allows that peer to assert client addresses. If Caddy itself sits behind another proxy, configure a separate reviewed client-address policy before deploying; this template deliberately uses its direct peer rather than trusting arbitrary forwarding chains.

## Administrator access

Create the administrator account through the localhost dashboard. Sessions expire after 12 hours, or 30 days with **Remember me**; sign-out or server restart revokes them. Twitch authorization is separate.

To recover a lost password, stop the server, move `DATA_DIR/admin-auth.json` to a private backup, then restart and create a new account locally. Restrict access to the data directory.

Local automation clients must authenticate through `/api/admin/setup` or `/api/admin/login`, retain the session cookie, then request `/api/bootstrap` for the dashboard capability. An admin token alone is insufficient.

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

Full workspace snapshots are committed transactionally; history size affects write latency. Load-test the intended catalog/order history and viewer concurrency before increasing limits. The service caps connections/SSE clients and HTTP timeouts, but does not provide distributed rate limiting. Optional [Reown USDC checkout](https://github.com/thomasjvu/autoloot/blob/main/docs/user/content/operations/crypto-checkout.md) supports physical orders on Solana mainnet and requires its own merchant configuration and wallet rehearsal. Autonomous procurement and new break-allocation formats remain outside the implemented runner paths.
