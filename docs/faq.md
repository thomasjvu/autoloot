# FAQ

## How do I start?

Open Settings, connect Twitch, add your seller details and add a lot. Follow the [quick walkthrough](walkthrough.md) for a first show.

## How do I connect Twitch?

Use Settings → Twitch. Add your Twitch application's client ID and secret, register the callback URL shown on the setup page, then authorize your channel. Credentials stay on the server.

## How do I set up payments? {#payments}

The single-user edition uses your own Stripe account. Complete business verification and bank setup in [Stripe Dashboard](https://dashboard.stripe.com). Configure `STRIPE_API_KEY` and `STRIPE_WEBHOOK_SECRET` in the server environment and restart Autoloot. Use a restricted key with Checkout Session create/retrieve/expire, Payment Intent access and Refund operations. Register signed payment events at `/api/stripe/webhook` and set the public HTTPS storefront URL and shipping countries. Rehearse checkout and refunds in sandbox before using live credentials.

Opening Stripe does not automatically connect Autoloot. A future hosted multi-user edition would use Stripe Connect; this edition has no platform account or platform fee.

## What if a payment or refund is uncertain?

Use Orders → Reconcile with Stripe to verify the existing Checkout session or refund ID. Do not create a second transaction while its outcome is unknown. A checkout return page alone is not payment confirmation.

## How do viewers bid?

Viewers review seller policies, sign in with Twitch and register through the storefront. They then type `!bid 25.00` in the connected chat. The server decides bid acceptance and deadlines; stream video can be delayed. Private orders show checkout and shipping updates.

## How do I put Autoloot in OBS?

In Settings, choose an output layout and copy its URL into an OBS Browser Source using the shown dimensions. Enable voice on only one source to avoid duplicate speech.

## What can the companion do?

The cohost helps with inventory, auction proposals, catalog selection and show updates. Choose a provider in Companion. AI output and card recognition can be wrong; review proposed actions and card matches. An authorized agent-led run follows the bounded queue and sale terms you approve. Physical pack opening and shipping still require you.

## Can I try it without real payments?

Use Settings → Practice show → Load sample lots. Practice payments are simulated. Clear practice content when finished; this is not a full deletion of all stored data.

## How do giveaways work?

Open a giveaway with a prize and eligibility rules. Viewers enter for free with `!enter`, once per account. Close entries and draw a winner. Channel Points can trigger a separate cohost reaction; they do not buy giveaway entries or improve odds. Prize claims and delivery are handled by the streamer.

## Is my camera always on?

No. Choose a camera or screen source in Rip studio to begin sharing. Stop sharing or leave the page to end capture. Only scan what you intend to process; avoid private information. Review [Privacy](/privacy) for current data handling.

## Who handles support, returns and privacy requests?

The seller/operator running the installation. Their published seller details and policies appear in the storefront and policy pages. Publish support contact, shipping, returns and retention information in Settings before real transactions. Provider disputes and statutory remedies remain available where applicable.
