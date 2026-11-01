# Autoloot — demo and submission

## Pitch

Autoloot turns a Twitch stream into a live commerce show. Chat bids on products, a server settles the auction, buyers check out from a private order page, and an optional Codex cohost helps the creator run the drop.

## Finalize and rehearse

Use [Demo finalization](demo-ready.md) as the working checklist and timed recording script. It contains the remaining account/device gates, recovery guidance and rehearsal record. Use [submission copy](submission-draft.md) for the project description; replace all placeholders after recording.

## Submission

- Join through your Devpost account and select a team representative.
- Provide source, assets and run instructions on GitHub, GitLab or Bitbucket. The current Forgejo repository alone is not a listed submission host. Private repositories must use GitHub or GitLab and grant the access specified on Devpost. Verify a fresh clone before submission.
- Include the primary development Codex session ID from `/status`. Companion runtime sessions are ephemeral and are not that development record.
- Upload an English public YouTube demo no longer than three minutes showing actual Twitch operation and Codex development.
- Describe the project honestly: local single-streamer implementation with server-verified Stripe checkout and Shippo single-order/combined-package labels. Operator accounts, production configuration and real-provider rehearsals are still required. The companion uses a basic SVG avatar and optional browser voice. Tax automation, multi-seller payouts and marketplace synchronization are not implemented.
- Verify account eligibility and integration permissions.
- Submit by **November 2, 2026, 5 p.m. Eastern**.

[Overview](https://twitchcon-codex.devpost.com/) · [Official rules](https://twitchcon-codex.devpost.com/rules)

## Remaining before a live demo

The [finalization checklist](demo-ready.md#finish-in-this-order) tracks the core sequence. Actual Twitch participation, signed Stripe sandbox payment, OBS/mobile checks, three timed takes and accessible submission assets still need recorded evidence. Local automated checks do not complete those gates. Keep sandbox payments for the demo; the production preflight intentionally checks for a live Stripe key and is a separate release gate.

## After the hackathon

SQLite, durable buyer sessions, reservation expiry and Shippo label workflows are implemented. Remaining launch work includes real-account rehearsals, buyer payment eligibility, tax configuration and disputes. Add a Live2D/VRM avatar or voice provider if the companion proves useful. The core remains Twitch commerce; no external marketplace dependency is planned.
