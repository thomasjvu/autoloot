---
lastUpdated: '2026-10-24'
---

# Buying and tracking

Open the streamer's shared `/shop` URL. Listed buy-now inventory, the current auction, and chat vote results are public. Your orders and shipping details are private to your signed-in identity and the streamer.

## Live purchases

Sign in with Twitch to register. For a direct bid, type `!bid 25.00` in the connected Twitch channel. You can also bid through the storefront: during a live auction, enter a ceiling in **Your private maximum**, confirm the binding authorization, and choose **Set maximum**. The engine automatically bids up to that ceiling; only your payable bid is public. A lone maximum starts at the opening price. Against another buyer, it bids only enough to beat their offer by the fixed increment, up to your ceiling. Equal ceilings favor the one accepted first. Maximums can only be raised, cannot be withdrawn, and exclude shipping. The winning order uses the payable price, not your ceiling. Use `!lot` for the current lot and `!register` for the registration link. Only registered, verified, unblocked Twitch identities can place live bids.

For a listed buy-now item, choose purchase while stock is available. An item in the current auction cannot be bought directly. Live buy-now requires the seller's configured Checkout integration.

## Pay and receive your order

Open your private order and begin Stripe Checkout. Shipping is collected there, including the order's flat shipping charge. Wait for verified payment status after returning. Processing means payment has not yet been confirmed.

Your receipt includes order totals, status, timestamps, and tracking when recorded. If you cannot see an order, sign in with the same Twitch account that purchased or won it. Another account cannot claim it.

## Demo purchases

In Demo mode, enter as a demo buyer. Use fictional shipping information and simulate payment. Demo identities cannot purchase in Live mode and disappear after server restart. Ask the streamer to review saved orders if a demo session is lost.

Contact the streamer for fulfillment questions, shipped-order refunds, or externally paid refunds. Autoloot does not provide shipping-label purchase or automatic tax calculation.
