---
lastUpdated: '2026-10-24'
---

# Auctions and voting

## Run a lot

Start an in-stock lot from Live control. One auction can be live or paused in a workspace. Live mode requires a connected Twitch channel. The server decides bid acceptance using its receive time and integer USD cents.

Registered buyers can submit exact bids with `!bid 25.00` in Twitch chat or authorize automatic bids through **Your private maximum** in the storefront. See [Buying and tracking](/docs/buyers/storefront#live-purchases) for ceiling rules.

The first bid must meet the opening price. Later bids must meet the highest bid plus the increment. The current leader cannot outbid themselves. With anti-sniping enabled, an accepted bid in the final ten seconds resets the clock to ten seconds. Bids received at or after the deadline are rejected.

## Pause, correct, resume

Pause stores the remaining time. While paused, you can void a bid with an audit record when no private maximums are active; the engine selects the previous valid bid. Resume creates a new deadline. If private maximums are active, cancel the auction to resolve a disputed bid. Cancel the auction before blocking its current leader.

A restart or Twitch disconnect pauses live bidding. Reconnect and resume explicitly. Missed Twitch chat is not replayed.

## Close or cancel

A sale reserves one unit and creates an immutable pending order for the winner. An unsold or cancelled lot creates no winning order. Manage the result under [Orders](/docs/streamer/orders).

## Chat picks the next drop

Choose two or three different, in-stock products outside the current auction. Votes run for 10–120 seconds. Viewers type `!vote 1`, `!vote 2`, or `!vote 3`.

Each Twitch identity gets one ballot and can change it. Purchase registration is not required; blocked accounts cannot vote. Public state exposes counts without voter IDs. Ties choose the earliest listed option, and an empty vote has no winner.

The streamer chooses **Auction the winner** after reviewing the result. Starting rechecks stock and auction availability. Voting never reserves inventory, places a bid, or charges anyone.
