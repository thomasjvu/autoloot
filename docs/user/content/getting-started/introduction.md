---
lastUpdated: '2026-10-24'
---

# Autoloot documentation

![Munny welcomes sellers at a streaming desk with product cards, a laptop, and a parcel.](/images/mochi/overview-banner.webp)

Autoloot runs Twitch auctions, buy-now listings, and order fulfillment from a local streamer dashboard. Buyers use the storefront; buyers bid through Twitch chat or authorize automatic bids with a private maximum in the storefront.

## Start locally

Requires **Node.js 22+**. From the app root:

```sh
npm ci
npm start
```

Open **http://localhost:4173**. Demo mode works without credentials. Follow the [demo walkthrough](/docs/getting-started/quick-start) to try a sale and buyer checkout.

## Set up your show

| Task                           | Guide                                                             |
| ------------------------------ | ----------------------------------------------------------------- |
| Add products and photos        | [Inventory](/docs/streamer/inventory)                             |
| Run a lot or let chat choose   | [Auctions and voting](/docs/streamer/auctions)                    |
| Accept live bids               | [Twitch](/docs/integrations/twitch)                               |
| Take online payment            | [Stripe Checkout](/docs/integrations/stripe)                      |
| Ship or refund an order        | [Orders and fulfillment](/docs/streamer/orders)                   |
| Add a cohost or stream overlay | [Codex](/docs/integrations/codex) · [OBS](/docs/integrations/obs) |

Buyers: see [buying and tracking](/docs/buyers/storefront). Developer reference and the design system live in the separate Autoloot Dev Docs site.

Autoloot supports one streamer and one server process. It stores data locally and has no automatic tax or shipping-label purchase. See [data and limits](/docs/operations/limits) before taking real orders.
