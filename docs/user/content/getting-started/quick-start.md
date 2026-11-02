---
lastUpdated: '2026-10-24'
---

# Demo walkthrough

Start the app and open **http://localhost:4173**. Fresh installations start empty. Choose **Settings → Practice show → Load sample lots** to enable Demo mode; no accounts or payment credentials are needed.

## Auction a lot

1. In Studio, start an in-stock lot.
2. Place a simulated bid in Test chat. Try pause and resume.
3. Close the lot to create the winner’s pending order.
4. In Orders, use Test payment, then enter a tracking reference.

## Buy from the storefront

1. In Inventory, set a buy-now price, enable **List in storefront**, and save.
2. Open **http://localhost:4173/shop** and enter as a demo buyer.
3. Buy the item, add a fictional address, and simulate payment.
4. View the private receipt. Return to the creator’s Orders page to fulfill it.

## Try voting and the companion

In Studio, choose two or three in-stock products and open a vote. Cast demo votes, close it, and choose **Auction the winner**. Voting never starts an auction automatically.

In Companion, ask for the next lot. Review the proposal and choose Apply. Scripted replies work locally; [Codex](/docs/integrations/codex) enables AI replies and photo drafts.

Ready for live sales? Configure [Twitch](/docs/integrations/twitch) and [Stripe Checkout](/docs/integrations/stripe).
