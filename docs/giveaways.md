# Giveaway claims and history

Giveaways are free: no purchase, subscription, buyer registration or points are required. Live entries use verified Twitch identities. A draw does not create an order, reserve inventory, charge a payment or ship a prize.

## Open and draw

In **Giveaways**, enter the prize and eligibility rules, choose the entry window and a claim window of 1, 3, 7 or 14 days. The default is seven days from drawing. Claims currently support US addresses only; publish that region in the rules. Close entries and draw once. No reroll workflow is provided.

Opening the next giveaway archives the previous terminal giveaway, including its frozen entry roster, draw evidence and any private claim. **Prize claims and history** keeps the old records and fulfillment controls available. Do not clear the data directory to end a show; back it up according to the storage guide.

## Winner claims

The winner signs into `/shop` using the same Twitch account and opens **Your prizes**. The stable Twitch identity controls ownership even if the winner changes their display name. A different account with the same name cannot claim the prize. Submit and confirm a US recipient address before the deadline. Submitted addresses are private to the winner and local seller. Before the deadline and dispatch, the winner can correct the address.

Practice claims require the matching practice buyer identity and fictional address details. The workspace must be in the giveaway's original live/practice mode for claim and dispatch actions. Legacy draws without a saved stable winner identity remain manual: contact the winner directly. The app never infers account ownership from the recorded username.

## Fulfill the prize

The seller reviews the submitted recipient in **Prize claims and history**, arranges postage separately, then enters carrier/tracking and explicitly confirms actual handoff. Practice mode labels this as simulated dispatch. Prize fulfillment never changes a sales order or payment record. One matching dispatch replay is harmless; changing tracking or the recipient after dispatch is rejected.

The claim deadline governs initial submission. An on-time submitted claim remains available for seller fulfillment after that deadline. Unclaimed prizes expire; expiry preserves the original winner and evidence and does not redraw. There is no automatic shipping-label purchase, inventory allocation, claim rejection or refund in this release.

## API and privacy

- Creator: `POST /api/giveaway/open` accepts `title`, `rules`, `duration` seconds and optional `claimDays` (1/3/7/14).
- Winner: `POST /api/viewer/giveaway/claim` accepts `{id,address,confirmed:true}`. Address uses `name,line1,line2,city,state,postal_code,country` and country `US`.
- Creator: `POST /api/giveaway/dispatch` accepts `{id,tracking,confirmed:true}`.
- `GET /api/viewer` adds `prizes` containing only the signed-in winner's summaries, own address, deadline and tracking.

Public/OBS giveaway projections include title, rules, mode, window, count, winner display name and draw evidence. They exclude stable account IDs, claim addresses and private history. Tests use disposable state and provider-free fixtures; real Twitch identity delivery and actual prize shipment still require operator rehearsal.
