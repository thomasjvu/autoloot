# Submission copy

Working copy for the team to paste into Devpost after confirming the final demo. Replace bracketed fields; do not submit placeholders or claim an unperformed integration rehearsal.

## Tagline

Turn a Twitch selling stream into a shared live show.

## Inspiration

A selling streamer has to entertain the audience while managing products, chat bids, timers, checkout and orders. We wanted the community to help shape the show while giving the creator a clear place to run it.

## What it does

Autoloot is a local-first Twitch selling workspace with Munny, an optional AI cohost. Creators can review photo-assisted listing drafts, let chat vote for the next lot and approve its launch. Viewers bid through Twitch chat, see the live overlay and access their own private orders in the storefront. The server enforces auction timing and bid rules, while Stripe Checkout and signed payment events connect winning orders to payment. The creator can then manage the fulfillment handoff.

The broader workspace also supports fixed-price sales, bounded queues of preapproved lots, giveaways with private winner claims, shipping workflows and seller cost estimates.

## How we built it with Codex

We used Codex throughout implementation and review of a Node.js application, browser interface, Twitch integration, payment and fulfillment adapters, and automated tests. We iterated on the full creator-to-buyer journey and added regression coverage for privacy, interrupted checkouts, duplicate requests, live form drafts and exact run deadlines. AI can draft content and cohost; authoritative application code decides accepted bids, winners and payment state.

[Insert one specific development example shown in the video, and the primary development session ID in its required field.]

## Challenges and what we learned

The hardest part was maintaining a consistent sale across chat, a delayed broadcast, private buyer sessions and asynchronous payment events. We learned to separate public show state from private orders, use stable request identities for retries, and treat a redirect or submitted transaction as different from verified payment or fulfillment.

## Current state and next steps

Autoloot is a single-streamer pre-beta. Automated checks use disposable data and provider fixtures. [Describe the actual Twitch, Stripe sandbox and OBS checks completed for this submission.] Practice payments and test shipments are labeled. Production sales still require account configuration, real-provider rehearsal and operational policies. The application does not implement multi-seller payouts, tax automation or marketplace synchronization.

Our next step is a creator pilot focused on setup, audience participation and completing the buyer journey reliably.

## Required fields before submission

- Eligible repository URL: [GitHub / GitLab / Bitbucket URL]
- Public YouTube demo, at most three minutes: [URL]
- Primary Codex development session ID: [ID from the development session]
- Team representative and eligibility: [confirmed by team]

Use the current [submission requirements](https://twitchcon-codex.devpost.com/) and [official rules](https://twitchcon-codex.devpost.com/rules). The overview was checked October 29, 2026; the full rules must still be reviewed by the team.
