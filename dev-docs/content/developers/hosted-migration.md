# Cloudflare hosted runtime

Both editions use the same native Hono route modules. The local entry point is
`server.mjs` with `@hono/node-server`; the hosted entry point is
`cloudflare/worker.mjs`. There is no legacy Node request/response route bridge.

| Concern | Local | Hosted |
| --- | --- | --- |
| HTTP and commerce routes | Shared Hono | Shared Hono |
| Authoritative state and stock | Single-writer SQLite | One SQLite Durable Object per configured workspace |
| Queryable application records | Local SQLite | D1 revisioned projection and account ownership |
| Auction deadlines | Local timer | Durable Object alarms and request-time checks |
| Uploads | Private disk | Workspace-prefixed R2 objects |
| Creator sign-in | Local password and capability | Twitch OAuth, configured owner ID and capability |
| Codex and local vision | Local subprocess/model | Outbound paired local companion |
| Marketing | Independent static build | Pages or Workers static assets |

D1 is not a second stock writer. A synchronous Durable Object transaction commits
inventory, orders and payment state together. D1 receives a monotonic snapshot
projection; failed projection is retried by alarm. `hosted_orders` and
`hosted_inventory` views expose queryable records. Reads that authorize purchases
or payments always use authoritative Durable Object state. This avoids a partial
D1/Durable Object transaction creating duplicate stock or sales.

The shipped configuration serves **one owner/workspace per deployment**. Its
Durable Object, R2 prefix and D1 keys include the configured workspace ID. It does
not implement a public multi-seller signup system or Stripe Connect. Do not
select workspace or owner IDs from caller headers or query strings.

## Local verification

```sh
npm ci
npm test
npm run check
npm run demo:check
npm run worker:check
```

`worker:check` builds the actual Worker and runs it in workerd with real local
D1, Durable Object SQLite and R2 bindings. Provider responses are isolated test
fixtures; no real Twitch, Stripe, model or payment requests are made. The checks
also verify an unattended alarm, persistent restart recovery, signed WebCrypto
webhooks and a complete paired model request/reply. The
repeatable result is `output/cloudflare-check.json`. This verifies runtime
integration, not a production account or a funded checkout.

For a separate validated production configuration, use the
[deployment targets guide](deployment.md#cloudflare-workers). The commands below
operate on the default Wrangler configuration.

## Configure and deploy

1. Create a D1 database and R2 bucket in the intended Cloudflare account. Put the
   returned D1 ID and bucket name in `wrangler.jsonc`. The all-zero D1 ID is a
   deliberate placeholder, not a provisioned resource.
2. Set `PUBLIC_URL` to the exact HTTPS workspace origin,
   `AUTOLOOT_WORKSPACE_ID` to a stable deployment identity and
   `AUTOLOOT_OWNER_TWITCH_ID` to the owner's numeric Twitch ID. Register
   `PUBLIC_URL/auth/twitch/callback` in the Twitch application.
3. Install secrets using a deployment-scoped Infisical identity. The Autoloot
   project is `42512b7f-c6a3-4ec9-9424-1b6ed0c25285`; production Metadata values
   already exist under `prod` at `/`. Other provider credentials must be added
   for the intended deployment. Never expose Infisical operator credentials to
   the Worker or browser.
   Run `npm run worker:secrets` with that scoped environment injected; it sends
   only allowlisted provider credentials to Wrangler over stdin without files or
   secret-valued arguments. Nonsecret settings stay in Wrangler configuration.
4. Apply `npm run worker:migrate:remote`, build the optional wallet bundle with
   `npm run build:wallet`, then deploy with `npm run worker:deploy`.
5. Verify owner sign-in, rejected non-owner sign-in, buyer privacy, signed Stripe
   sandbox checkout/webhook/refund, Twitch delivery, alarm recovery, R2 upload
   and local companion pairing before live sales.

For local Worker development use `npm run worker:migrate:local` and
`npm run worker:dev`. Put local Worker-only credentials in ignored `.dev.vars`;
Node's `.env` is not automatically loaded by Wrangler. Keep secrets mode 0600.
Use the same localhost origin in `PUBLIC_URL` and the browser.

Current code is built and tested locally. No Cloudflare account resources,
public domain, production secret injection or deployment have been performed.

## Local companion

Open Companion in the hosted workspace and select **Pair this computer**. Run
`npm run companion:connect -- https://your-workspace.example` from a local
checkout, then enter the one-time pairing code at its prompt. First use
`codex login` locally. No OpenAI credential is sent to the hosted app.

Pairing codes expire in ten minutes and can be claimed once. The bridge token
expires in twelve hours, stays only in process memory on the client, and can
only poll/complete leased model jobs. It cannot bootstrap administrator access,
list orders or submit commerce actions. Disconnect revokes it. The bridge polls
outbound over HTTPS, so the local computer needs no public listener. Photo jobs
use bounded temporary files, removed after processing. Local vision jobs call
the local Moondream service. The creator still reviews model proposals.

## Recovery and operating limits

Durable Object SQLite is authoritative; use Cloudflare's point-in-time recovery
and rehearse restoration before launch. D1 is a projection and is not sufficient
to restore sessions, OAuth tokens, bridge state or audits. R2 object retention
and backups need an operator policy. Never restore only D1 and resume sales.

A runtime restart pauses an active auction and recovers agent runs for review.
Twitch reconnection requires creator review; live bids cannot proceed while
chat is disconnected. Alarms schedule auction/vote/giveaway deadlines, pending
order expiry, active runs, NFT work and projection retries. Local hosted
integration does not establish production load, SSE connection costs, provider
quotas or recovery performance. Each workspace currently persists a full state
snapshot; measure its intended history size before increasing scale.
