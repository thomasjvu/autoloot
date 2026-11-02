---
lastUpdated: '2026-10-24'
---

# HTTP API

This is the current single-process application API, not a versioned public SDK. Most creator mutations return an updated admin state; viewer handlers return operation-specific JSON. Errors use an `error` field. Consult `server.mjs` and `tests/server.test.mjs` when changing payloads.

## Authentication and transport

Creator bootstrap is limited to localhost Host names. `GET /api/bootstrap` returns an `admin` capability and overlay/viewer URLs. Pass the capability in `x-autoloot-admin` on creator requests. The legacy `x-loot-admin` header is also accepted. SSE supports the `admin` query parameter; do not share creator event URLs.

Viewer sessions use an HttpOnly `autoloot_session` cookie. Viewer order access must match its stored user ID. POST origin checks reject a supplied cross-origin Origin. Admin and viewer mutation buckets allow 180 and 60 requests per minute respectively; exceeding the bucket returns 429.

## Public and session reads

| Method | Path                       | Result                                                          |
| ------ | -------------------------- | --------------------------------------------------------------- |
| GET    | `/api/state`               | Public state; private creator state with valid admin capability |
| GET    | `/api/events`              | SSE snapshots, with 15-second keepalive comments                |
| GET    | `/api/viewer`              | Current session identity, owned orders, provider configuration  |
| GET    | `/api/receipt?id=ORDER_ID` | Receipt for its owner or creator                                |
| GET    | `/api/orders.csv`          | Creator-only order export                                       |
| GET    | `/auth/twitch`             | Begin viewer OAuth; streamer role requires creator access       |
| GET    | `/auth/twitch/callback`    | Complete OAuth and set session cookie                           |

## Viewer mutations

All bodies are JSON unless stated otherwise.

| POST path                | Body                     | Notes                                           |
| ------------------------ | ------------------------ | ----------------------------------------------- |
| `/api/viewer/demo-login` | `{}`                     | Demo mode only; creates a demo cookie           |
| `/api/viewer/logout`     | `{}`                     | Clears the cookie                               |
| `/api/viewer/buy`        | `productId`, `requestId` | Idempotent per buyer/request; returns `orderId` |
| `/api/viewer/checkout`   | `id`                     | Starts owner-checked Checkout                   |
| `/api/viewer/shipping`   | `id`, `shipping`         | Validates allowed shipping country              |
| `/api/viewer/demo-pay`   | `id`                     | Demo order with shipping only                   |
| `/api/viewer/cancel`     | `id`                     | Reconciles payment before cancellation          |

## Creator mutation groups

| POST path                                                                                     | Purpose                                                                  |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `/api/products`, `/api/products/edit`, `/api/products/remove`, `/api/products/reorder`        | Inventory creation and maintenance                                       |
| `/api/auction/start`, `/pause`, `/resume`, `/finish`, `/cancel`, `/void` under `/api/auction` | Auction lifecycle and paused bid correction                              |
| `/api/bidder`                                                                                 | Block/unblock a user ID                                                  |
| `/api/show`, `/api/mode`                                                                      | Show settings and workspace mode                                         |
| `/api/order`                                                                                  | `id`, `action`, optional `tracking`; payment/refund/fulfillment workflow |
| `/api/vote/open`, `/api/vote/close`, `/api/vote/demo`                                         | Timed vote lifecycle and demo ballots                                    |
| `/api/companion/settings`, `/ask`, `/photo`, `/apply`, `/dismiss` under `/api/companion`      | Provider configuration and reviewed proposals                            |
| `/api/catalog/search`, `/api/catalog/select`, `/api/catalog/add`                              | Reviewed catalog workflow                                                |
| `/api/rip/search`, `/api/rip/select`, `/api/rip/confirm`, `/api/rip/clear`                    | Pull workflow                                                            |
| `/api/twitch/configure`, `/api/twitch/disconnect`                                             | Local app credential setup and connection management                     |
| `/api/demo/bid`, `/api/demo/chat`, `/api/demo/buy`                                            | Demo-only commerce simulation                                            |

`POST /api/upload` accepts raw PNG/JPEG/WebP bytes up to 3 MB and returns an image URL. `POST /api/rip/frame` accepts `image/jpeg` up to 2,000,000 bytes. Both require creator access and origin validation. `POST /api/stripe/webhook` accepts the raw signed Stripe body up to 1 MB and requires a valid `stripe-signature` rather than creator capability.

## Example public read

```sh
curl http://localhost:4173/api/state
```

## Compatibility

Paths above describe implemented handlers. This docs instance intentionally disables the template's sample OpenAPI specs so they cannot be mistaken for Autoloot endpoints. Engine validation and role checks remain authoritative.
