# Autoloot — demo and submission

## Pitch

Autoloot turns a Twitch stream into a live commerce show. Chat bids on products, a server settles the auction, buyers check out from a private order page, and an optional Codex cohost helps the creator run the drop.

## Demo under three minutes

- **0:00–0:20:** show the creator juggling products, chat, timer and orders. Introduce the Autoloot control screen.
- **0:20–0:45:** upload a product photo with creator-confirmed quantity, condition and price. Show Munny’s draft, edit/approve it, and verify Twitch/buyer connections.
- **0:45–1:25:** show chat voting for the next product, approve its launch, then run an auction on Twitch. Bid from a second account, show anti-sniping and the OBS overlay, then close the lot.
- **1:25–1:55:** show the winner’s private order and Stripe sandbox checkout with verified payment. If credentials are not configured, demonstrate the explicitly labeled local demo checkout and describe the provider adapter accurately.
- **1:55–2:20:** show Munny reacting on the overlay and introducing the next product. Demonstrate the optional voice/motion controls and show recap.
- **2:20–2:45:** show how Codex built the engine, interface and tests. Explain deterministic money/timing and signed payment updates.
- **2:45–3:00:** show a buy-now listing and tracking handoff. Close with the project name and repository.

## Submission

- Join through your Devpost account and select a team representative.
- Publish source, assets and run instructions to an eligible repository host.
- Include the primary development Codex session ID from `/status`. Companion runtime sessions are ephemeral and are not that development record.
- Upload an English public YouTube demo under three minutes showing actual Twitch operation and Codex development.
- Describe the project honestly: local single-streamer implementation, Stripe setup required, basic SVG companion, browser voice, manual tracking. No label purchasing, tax automation, multi-seller payout platform or marketplace synchronization.
- Verify account eligibility and integration permissions.
- Submit by **November 2, 2026, 5 p.m. Eastern**.

[Overview](https://twitchcon-codex.devpost.com/) · [Official rules](https://twitchcon-codex.devpost.com/rules)

## Remaining before a live demo

1. Configure a Twitch developer application and connect the broadcaster and a second buyer account.
2. Configure a Stripe sandbox/restricted key, webhook forwarding and shipping destinations; verify checkout, expiration, async events and refunds with the provider.
3. Use real product photos and review actual prices/condition.
4. Add the OBS source and record Twitch footage.
5. Upload source/video and submit through your own accounts.

## After the hackathon

Prioritize a transactional database, durable sessions, reservation expiry and buyer payment eligibility, then shipping labels, tax configuration and disputes. Add a Live2D/VRM avatar or voice provider if the companion proves useful. The core remains Twitch commerce; no external marketplace dependency is planned.
