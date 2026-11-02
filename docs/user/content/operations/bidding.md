# Bidding and private maximums

Use `!bid 25.00` in Twitch chat to submit an exact USD bid. Live bidders must sign in with Twitch and register in the shop. The server's receive time and auction clock determine acceptance; video may be delayed.

In the shop, signed-in buyers can use **Your private maximum** on the current lot. Enter a ceiling, review the binding terms and confirm. A maximum can only be raised; it cannot be lowered or withdrawn. Shipping is separate. Practice buyers can rehearse this with fictional purchases in practice mode.

A lone maximum starts at the opening price. Against another buyer, it bids only enough to beat their offer by the auction's fixed increment, up to its ceiling. A buyer never competes against their own earlier offer. If two ceilings are equal, the ceiling accepted first wins at that amount. Raising a ceiling gives that new ceiling a new tie priority. Raising your own leading maximum does not raise your current payable price or extend the clock.

Chat bids remain exact offers. A chat bid may be accepted and immediately outbid by an existing maximum in one server transition. The public page shows the resulting leader and payable bid, not private budgets. A direct bid higher than all ceilings leads at its submitted amount. When a prior exact offer equals that same buyer's ceiling, the earlier exact offer retains tie priority. Earlier losing exact offers never authorize further bids above their submitted amounts.

Maximums apply only to the current auction ID. Pausing stops new bids and preserves ceilings; resuming restores them. Standard auctions extend to ten seconds only when a new public payable bid is accepted late. Unopposed ceiling raises and request retries do not extend the clock. Sudden-death auctions retain their fixed deadline. Cancellation stops every maximum on the lot. A later auction starts with no inherited ceilings.

For moderation, an auction with private maximums cannot use **Void bid**. Cancel the auction and review the dispute before restarting it. Blocking a current leader still requires cancellation. Other blocked identities' ceilings do not compete in subsequent bid resolutions.

The final winning order records the payable price, not the ceiling. Ceiling values are available only in that buyer's authenticated response. Creator, public, OBS, companion and bid-history snapshots exclude private ceilings. The local operator's private database and backups still contain the data; filesystem access remains trusted.

## API and retry behavior

`POST /api/viewer/maximum-bid` requires the buyer's authenticated session and `{auctionId, requestId, amount, confirmed:true}`. `amount` uses fixed-point USD text. The server supplies the identity from the session; client identity fields have no authority. The same buyer/request/amount is idempotent. Reusing a request ID with a different amount is rejected. `/api/viewer` returns only the caller's `maximumBid` with auction ID, ceiling in cents and leading/outbid/paused/ended status.

Ceilings and exact offers are stored in a separate private current-auction ledger. The resolver uses integer cents and one synchronous commit before broadcasting. A lot accepts at most 1,000 distinct offer identities and 2,000 private maximum requests plus 2,000 tracked direct messages; capacity exhaustion rejects further requests rather than forgetting active ceilings. Provider payments still require their existing verification flow; a maximum is not a payment authorization.

Automated domain and HTTP fixtures cover price/tie rules, deadlines, retries, concurrent callers, privacy, moderation and order snapshots. Live Twitch accounts and real buyer behavior require a separate rehearsal.
