# Twitch and OBS integration

Autoloot connects to Twitch chat directly. It is not an installable Twitch Extension, and no viewer download or native OBS plugin is needed.

## Get ready

Open **Settings → Go live checklist**. Configuration status updates from the current show. The checks cover broadcaster authorization, an HTTPS public storefront address, owned inventory, Stripe configuration and show mode. The inventory check excludes reserved sample IDs (`p1`–`p4`). These checks do not prove public reachability, webhook delivery or OBS audio.

Complete the manual checks with a second Twitch account and another device. Rehearse registration, chat bid, winner order and Stripe sandbox checkout. The server must receive the signed payment event. If Stripe is absent, live buy-now is unavailable; auctions can use manually verified external payments.

The creator dashboard stays on localhost. Set PUBLIC_URL to a public HTTPS address and register its `/auth/twitch/callback` in your Twitch application. The tunnel must preserve the external Host header. Copy the storefront URL from Settings and verify it before sharing.

## Add browser widgets

In **Settings → Stream widgets**, select a layout, preview it and copy its URL. The selected preset is remembered in this browser when local storage is available. In OBS add a Browser Source with those dimensions:

| Layout | URL path | Width × height |
| --- | --- | --- |
| Full show | `/overlay` | 1280 × 720 |
| Compact auction | `/overlay?widget=auction` | 960 × 200 |
| Chat vote | `/overlay?widget=vote` | 480 × 540 |
| Munny only | `/overlay?widget=mochi` | 400 × 540 |

All widgets have transparent document and body backgrounds and consume public state. Compact, vote and Munny previews keep their preset dimensions even in a larger browser window. Chat vote is transparent until a vote exists; the last vote can remain visible with its result. Compact auction shows a standby message when there is no auction. Unknown widget names fall back to Full show.

Full show and Munny can speak when Companion's Overlay voice setting is enabled. Auction-only and vote-only never speak. Enable voice in only one source to avoid duplicate announcements. OBS speech and audio routing still require verification on your machine.

These graphics become part of the broadcast video. Viewers cannot click them. Viewers sign in at the storefront, then use `!bid 25.00` and `!vote 1` in Twitch chat. `!register` shares the registration URL and `!lot` reports the current auction. The storefront displays the next minimum bid with a copy control; copying does not submit a bid. The server receive time decides acceptance, rather than the delayed video clock. Winner orders are private and appear under Your orders.

Autoloot uses EventSub WebSockets for chat and Twitch's chat API for announcements. Unexpected disconnects pause live auctions; a successful reconnect does not resume bidding automatically. Broadcaster tokens are memory-only and require new authorization after restart. Viewer sessions persist in SQLite with hashed tokens, expiry and revocation.

## Interrupted live updates

The storefront, dashboard and widgets display a persistent warning if their live state connection drops. Countdown displays stop, companion speech is muted, and buyer bid-copy/purchase/payment controls are disabled until a fresh snapshot arrives. Older in-flight viewer responses cannot overwrite a newer snapshot. Existing prices remain visible as potentially stale context. A browser reconnect does not resume a Twitch-paused auction.

Manual Twitch Disconnect cancels queued reconnections, and a late subscription response cannot mark a disconnected channel connected. A connection that closes before its welcome handshake fails promptly instead of waiting for the timeout.

## Future Twitch Extension

A Twitch Extension is a separately packaged interactive panel/component/overlay, hosted through Twitch's extension infrastructure and reviewed by Twitch. It would require an HTTPS backend, Extension Helper integration, verified Extension JWTs, channel isolation and explicit identity handling; it cannot simply iframe this storefront.

Do not build bidding, physical-item checkout or a storefront link into an Extension on the assumption that Twitch will approve it. [Current Extension policies](https://dev.twitch.tv/docs/extensions/guidelines-and-policies/) restrict item-for-money commerce (§5.2), shopping-site links (§4.6.3), and advertising/product branding (§§4.4, 4.9). An engagement-only concept—free audience voting or companion reactions—is a possible future investigation. Review its full behavior against Twitch's policies before implementation and submission. This release adds no Twitch Extension.

## Verification

`npm test` includes OAuth state expiry/replay, identity validation, token refresh, EventSub subscriptions/migration, revocation, validation failure and disconnect/reconnect pause behavior using local fixtures. Widget parsing, capability-free output URLs, setup checks and bid amount guidance also have tests. `npm run check` checks the integration helper and Twitch setup script along with the application. `npm run demo:check` exercises the local commerce loop in disposable data. These checks do not contact real Twitch or Stripe accounts.
