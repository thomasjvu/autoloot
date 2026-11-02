# Deployment targets

Autoloot supports one owner/workspace per deployment. Choose a target independently
of the frontend: all targets serve the same HTML, CSS and JavaScript with Hono.

| Target | State | Administrator access |
| --- | --- | --- |
| Local Node / VPS | Local SQLite and disk uploads | Direct localhost |
| Railway / container Node | SQLite and uploads on a persistent volume | Configured Twitch owner |
| Cloudflare Workers | Durable Object SQLite, D1 projection, R2 media | Configured Twitch owner |

## Node and SQLite in production

SQLite supports the single-writer deployment this application implements. Keep
one instance, use persistent local storage, and retain verified backups off the
machine. Multiple containers must not share the same database, and the database
must not live on a network filesystem. See [storage](storage.md) and the
Node operations guide at `docs/production.md`.

The Docker entrypoint holds a kernel file lock on the data volume throughout the
server lifetime and clears the old process marker only after acquiring that lock.
This permits recovery after a container is killed or replaced. Use this entrypoint
for every container accessing that volume; do not mix container and bare Node
writers. Bare Node retains its conservative process/host ownership checks.

With Docker running, `sh scripts/container-check.sh` builds the image and checks
startup on a fresh volume plus recovery after a forced kill. CI runs this check
and the local Worker integration check.

## Railway

1. Connect this repository to a Railway service. `railway.json` selects the
   multi-stage Dockerfile and one replica. Attach a persistent volume at `/data`.
   The entrypoint gives the volume directory to the `node` user (UID/GID 1000)
   and drops root privileges before opening SQLite. Imported files must also be
   owned by UID/GID 1000.
2. Generate a public domain and set these service variables:

   ```dotenv
   NODE_ENV=production
   AUTOLOOT_NODE_MODE=hosted
   HOST=0.0.0.0
   DATA_DIR=/data
   PUBLIC_URL=https://your-service.up.railway.app
   AUTOLOOT_OWNER_TWITCH_ID=123456789
   TWITCH_CLIENT_ID=your-client-id
   TWITCH_CLIENT_SECRET=your-client-secret
   METADATA_MODE=api
   METADATA_SERVICE_KEY=your-service-key
   ```

   Railway supplies `PORT`. Store provider secrets in Railway variables, never
   in source. Configure Stripe and shipping credentials as described in
   `.env.example`. Register `PUBLIC_URL/auth/twitch/callback` with Twitch and
   `PUBLIC_URL/api/stripe/webhook` with Stripe.
3. Deploy. Visit `/` to sign in with the configured Twitch account. Password
   bootstrap and account linking are disabled in hosted mode. A viewer session,
   even for the owner's account, cannot administer the workspace.
4. Verify the owner flow and rejection of other accounts, sandbox payments,
   signed webhooks, uploads, restart persistence and backup restoration. Configure
   seller policies and run `npm run production:check` inside the running service
   before live sales. That check intentionally requires live payment settings.

The health check uses `/api/health`. Its Railway hostname exception applies only
to GET on that route. Other hosts remain rejected. Anonymous rate limits use the
proxy peer unless an exact trusted proxy is configured; do not trust arbitrary
forwarded headers. With the default settings, anonymous users may share a limit.

Do not scale replicas or enable service sleeping for a running show. Volume-backed
redeployments have downtime. Configure Railway's draining/shutdown settings to
allow at least 35 seconds for the app's 30-second shutdown window. Monitor health
and backup failures independently; startup health checks are not continuous
monitoring. Keep off-volume backups; automatic SQLite backups on `/data` do not
protect against losing that volume.

The image does not contain Codex CLI or a local vision model. Keep the companion
offline or provision those dependencies explicitly; the Workers companion pairing
bridge is currently specific to the Worker runtime.

References: [Railway volumes](https://docs.railway.com/volumes/reference),
[health checks](https://docs.railway.com/deployments/healthchecks),
[configuration as code](https://docs.railway.com/config-as-code/reference).

## Cloudflare Workers

Keep local emulation settings in `wrangler.jsonc`. Copy
`wrangler.production.example.json` to ignored `wrangler.production.json`. Set the
real D1 ID, R2 bucket, HTTPS public origin, owner ID and stable workspace ID. Add
`routes` for your custom domain, for example
`[{"pattern":"shop.example.com","custom_domain":true}]`. The production template
disables workers.dev and preview URLs. Provision the resources in the intended
Cloudflare account first.

```sh
npm run worker:production:check
npm run worker:production:build
npm run worker:production:migrate
AUTOLOOT_WORKER_CONFIG=wrangler.production.json npm run worker:secrets
npm run worker:production:deploy
```

The secret command requires provider credentials injected into its environment;
it forwards only allowlisted values over stdin. Set `AUTOLOOT_WORKER_CONFIG` on
all production commands if using a different JSON configuration path. The check
rejects placeholder resource IDs, missing owner IDs and insecure origins; it does
not verify account access, provision resources or certify payment readiness.

For infrastructure provisioning before owner sign-in is available, set
`AUTOLOOT_SETUP_ONLY="1"` in `vars`. This explicitly permits a missing owner ID
in the deployment preflight. Every request returns 503 and commerce and dashboard
access remain disabled. The root displays a setup page. To open the workspace,
install Twitch credentials, set the numeric owner ID and remove the setup flag,
then redeploy and rehearse sign-in. For an initial workers.dev deployment, set
`workers_dev: true`, remove custom `routes`, and use the exact workers.dev URL as
`PUBLIC_URL`.

Follow [hosted runtime setup and recovery](hosted-migration.md) for resource
ownership, provider setup, companion pairing and the live rehearsal. Worker state
is authoritative in Durable Object SQLite, not the D1 projection. Rehearse Durable
Object recovery and R2 retention before accepting payments.

See [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/).

## Provisioned installation

The initial Worker is deployed at
[autoloot-workspace.thomasjvu.workers.dev](https://autoloot-workspace.thomasjvu.workers.dev).
It uses D1 database `autoloot` (ID `6ab66e5d-07a5-48ab-91f2-4314b39fbe4f`),
R2 bucket `autoloot-media`, and workspace ID `production`. The D1 migration is
applied and the Metadata service secret is installed. Account-specific deployment
settings are kept in ignored `wrangler.production.json` in the operator checkout.

`AUTOLOOT_SETUP_ONLY="1"` remains enabled by request. HTTP 503 on every route is
intentional until the Twitch owner ID and credentials are configured and the
setup flag is removed. No live payment provider is configured or rehearsed.
