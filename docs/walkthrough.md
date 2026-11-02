# Quick walkthrough

## 1. Connect your channel

Open **Settings → Twitch**. Enter your app credentials, copy the displayed callback URL into the Twitch developer console and authorize your channel.

![Twitch connection form with app credentials and callback instructions](../documentation/public/images/walkthrough/connect-channel.png)

## 2. Publish seller details

In Settings, add your seller name, support/privacy email, shipping regions, returns policy and retention notice. Review what buyers see before accepting real orders.

![Seller policies form for public contact, shipping, returns and retention](../documentation/public/images/walkthrough/seller-details.png)

## 3. Add a lot

Choose **Inventory → Browse catalog**, or **Add product** to enter an item manually. Review identity, set/number, actual condition, quantity and opening price. Catalog scans are reference images, not proof of your copy's condition.

![Add product form with title, starting price, quantity and photo](../documentation/public/images/walkthrough/add-lot.png)

## 4. Set up checkout

Use your own Stripe account. Follow the [payment setup FAQ](/docs/getting-started/faq#payments) and [Stripe integration guide](/docs/integrations/stripe), then complete a sandbox checkout and refund. Switch to live credentials only after verifying the payment webhook. Set shipping costs and allowed destinations.

![Stripe payment setup panel](../documentation/public/images/walkthrough/checkout.png)

## 5. Prepare your stream

Choose **Settings → Stream settings**, select an OBS layout and copy its Browser Source URL. Use one source for cohost voice. Open the storefront in a separate browser to check the buyer flow.

![OBS layout selector and Copy OBS link button](../documentation/public/images/walkthrough/stream.png)

## 6. Run a lot

Start an auction in Studio. Registered viewers can bid with `!bid 25.00` in Twitch chat or set a private maximum in the storefront. A storefront maximum authorizes automatic bids up to that ceiling; it is binding, raise-only, cannot be withdrawn, and excludes shipping. Standard auctions extend late bidding; sudden-death auctions keep a fixed deadline. The winner receives a private order. Confirm payment before shipping, then add tracking.

![Studio showing an active practice auction and test chat](../documentation/public/images/walkthrough/run-lot.png)

## Optional: in-app tour

Choose **Settings → Take a tour** for the interactive walkthrough. You can skip it or replay it later. This written guide is available without starting the tour.

![Interactive tour highlighting the workspace](../documentation/public/images/walkthrough/tour.png)

## Optional: practice first

Use **Settings → Show settings → Load sample lots** for simulated bids and payments. No real funds move. Clear practice content before your real show.

![Show settings with practice mode and sample content controls](../documentation/public/images/walkthrough/practice.png)
