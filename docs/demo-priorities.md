# Autoloot: the hackathon cut

The differentiator is a Twitch-native AI producer that makes selling a shared live experience. The demo should show creator utility and audience entertainment together.

## Rehearsal priorities

1. Verify the existing Twitch loop with a broadcaster and second buyer account: registration, chat bid, anti-sniping, winner, private order, Stripe sandbox checkout. Capture actual Twitch footage. This is the prerequisite for claiming a working live commerce demo.
2. Photo-to-lot: upload a product photo and add a short creator note with condition and opening price. AI drafts a listing without inventing defects, authenticity, specifications, or market value. Show a concise editable preview; creator approves before publishing. Reuse current draft-product validation and product snapshot flow. Photo drafts are implemented; verify inference with the chosen account before the demo.
3. Let chat pick the next lot: show three eligible in-stock products and a timed vote through explicit chat commands. Deduplicate by verified Twitch user, permit vote changes, keep voting separate from bidding, and use a deterministic tie-break. The creator approves the selected product before auction start. Do not assume native Twitch Poll eligibility; a chat-driven vote can run through the existing chat adapter.
4. Cohost performance: product intro, bid acknowledgement, final countdown, winner celebration. Drive transitions from authoritative auction events. Avoid stale announcements and repeated speech. Add mute, avatar-only and reduced-motion controls. Voice should route through OBS if presented as on-stream audio; current dashboard speech is not that.
5. Finish with a live show recap: paid/unpaid totals, completed lots, unique bidders and fulfillment queue. Clearly distinguish completed sales from collected funds and simulations from actual payments.

## The demo story

Creator uploads a product photo and specifies price/condition. Autoloot drafts a listing. Chat chooses it as the next lot. Creator approves. Munny introduces it; two real viewers bid; the timer extends; one wins. The winner opens their private order and completes sandbox checkout. Creator sees payment verification and the shipping handoff.

Keep this sequence under three minutes, including brief evidence of building with Codex. Keep the lightweight Sales & numbers view secondary to the demo. Avoid additional marketplace integrations, a social feed or multi-seller platform is required for this narrative.

## Verification gates

- Actual Twitch account integration, not just simulated chat.
- Stripe sandbox payment and signed webhook received by this app.
- AI output reviewed and validated; engine alone decides prices accepted, winners and payments.
- Viewer can understand registration, bid syntax, clock and checkout without creator coaching.
- Demo can recover from a disconnect with an explicit paused auction.

## Current status

Implemented: self-hosted Maple Mono; photo input via Codex CLI; server-enforced creator values, review/edit/apply with photo retention; timed chat votes with identity-based deduplication and vote changes; creator-approved winning-lot launch; public vote display; event-driven SVG avatar reactions; optional overlay browser speech with stale-event suppression and reduced motion; show recap; disposable end-to-end demo smoke script.

Verified: real Codex image draft; state machine, HTTP contracts, signed payment fixtures, voting rules and speech event logic; `npm run demo:check` local journey. Desktop browser verification covered setup shortcuts, widget preset persistence, isolated auction/vote/Munny output, transparent backgrounds and stream interruption/recovery. Mobile-device and actual OBS checks remain outstanding. Actual Twitch authorization/EventSub and Stripe sandbox checkout need account credentials. OBS voice/audio behavior needs a real OBS Browser Source check.

Judges evaluate innovation, impact, implementation/use of Codex and design/fun-to-watch quality: https://twitchcon-codex.devpost.com/
