# Submission demo recording script

Target: 2:45, landscape 1920×1080. Record the actual app and Twitch interaction. This is the short submission demo, not a setup tutorial. Use [demo finalization](/docs/operations/demo-ready) for prerequisites and the rehearsal evidence record.

The selected creative treatment is now [Munny’s shop entrance and character dialogue](/docs/operations/demo-munny-direction): OBS/Twitch footage with character babble and dialogue text throughout. That direction supersedes the human narration and opening below; retain this document for capture prerequisites and verification.

## Capture plan

Record the creator workspace, Twitch chat/overlay and buyer storefront as separate readable shots. Keep the cursor deliberate and pause briefly after each state change. Capture clean app audio and narration separately where possible. Avoid shrinking three full windows into an unreadable frame.

Use one owned physical item with permitted photos and two other eligible vote options. Preload creator-supplied condition, opening price and shipping terms. Have the broadcaster and two registered bidders ready. Use fictional recipient details and Stripe sandbox payments. Keep credentials, setup screens and private customer data outside the frame.

## Timed edit and narration

| Time | Actual screen action | Narration |
| --- | --- | --- |
| 0:00–0:12 | Open on an active-looking Studio view with Munny and the item; briefly cut to Twitch chat and its overlay. | “A selling stream is a live show. But the creator also has to manage listings, bids, payments and orders. Autoloot brings that workflow together.” |
| 0:12–0:35 | Upload the item's photo with creator notes. Show the returned draft, review its identity and condition, then approve it. Cut any inference wait with a visible ‘Wait shortened’ caption. | “Start with a product photo and the seller’s terms. AI helps draft the listing. The creator reviews the details and approves what goes live.” |
| 0:35–0:55 | Open a three-item vote. Show real chat vote commands and the updated result. Show the creator approving and launching the selected lot. | “Chat helps choose the next lot. Votes come from Twitch accounts, and the creator stays in control of when the auction starts.” |
| 0:55–1:35 | Show two registered viewers bidding through real Twitch chat. Keep amount and timer legible. Capture one late bid extending the clock, then the winner. Retain the actual order of events; label any removed waiting time. | “Viewers bid in Twitch chat. Autoloot checks each bid, updates the show and extends late bidding. Munny reacts to the auction while the server determines the winner.” |
| 1:35–2:05 | Switch to the winner’s signed-in storefront and private order. Open hosted sandbox checkout, complete it, then show the matching order marked test-paid after webhook verification. | “The winner gets a private order in the storefront. Here we’re using Stripe sandbox checkout. Payment is confirmed by a signed event from Stripe.” |
| 2:05–2:20 | Return to creator Orders. Show the paid order and its fulfillment controls, then cut to Munny. Do not mark a parcel dispatched unless it actually was. | “The order moves into the creator’s fulfillment workflow, so they can keep the show moving.” |
| 2:20–2:40 | Show an actual Codex development exchange and a readable, relevant implementation diff. Show the final check results with their real status. | “We used Codex to build and review the auction engine, creator interface and integrations, with regression coverage for bid timing, payment retries and buyer privacy.” |
| 2:40–2:45 | End card: Autoloot, tagline and verified eligible repository URL. | “Autoloot. Turn a selling stream into a shared live show.” |

The narration leaves room for product sounds and screen actions. Do not read every field or explain configuration. Record each section with several seconds of handles for editing.

## Truthful substitutions

- If image inference fails, show a previously approved listing and say “The creator reviews the listing before it goes live.” Do not present a hand-entered result as a generated draft.
- If Munny voice is unreliable, use avatar reactions and remove its voice track. Only include speech that was captured successfully.
- Keep a visible “Stripe sandbox · no real charge” label during payment footage. A browser success redirect alone is not payment evidence.
- If real Twitch or signed sandbox payment cannot be demonstrated, keep the clip labeled as practice and resolve the integration before calling it the final working demo.
- Show genuine Codex work and actual check output. Select the exact development example after reviewing its diff; do not invent an exchange for filming.

## Current local verification

November 2, 2026, working tree based on `c19409e`, including existing uncommitted changes:

- `npm run check`: passed; 109 runtime modules checked.
- `npm test`: 308 passed, 1 failed. `tests/runs-http.test.mjs:57` expects `/docs/getting-started/faq`; the response is `http://localhost:3333/docs/getting-started/faq`.
- `npm run demo:check`: passed; disposable vote-to-shipment, direct purchase, catalog review and public privacy journeys. No real Twitch or Stripe requests.

These results do not verify real Twitch, signed Stripe sandbox delivery, phone checkout or OBS capture. Enter those outcomes in the [rehearsal record](/docs/operations/demo-ready#rehearsal-record) after performing them. Re-run final-source checks after code changes and before recording.
