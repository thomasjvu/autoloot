# Plan 001: Pilot compact stream widgets driven by confirmed events

Status: TODO (design/spike). Priority P2; effort M–L; implementation risk medium. Planned 2026-10-25 at `2d23cf8` plus the uncommitted current workspace. Scope is OBS browser sources; a Twitch Extension is a separate product and review path.

## Intent

Autoloot already has full-show, auction, vote and companion overlay presets. Add playful visual elements without inventing card facts, exposing private order information or giving presentation code payment authority. Ship a small vertical slice first, using the existing Node/SQLite/plain-JS architecture and paper/ink/sage/lime design tokens. Preserve reduced-motion preferences and custom companion branding.

## Current source and drift gate

Root: `/Users/area/live-shopping-companion`. Inspect `git diff --stat 2d23cf8..HEAD -- server.mjs public/app.js public/integration.js lib/persistence/storage.mjs` AND `git diff --` for these paths; this plan includes uncommitted changes. Stop and reconcile if the following anchors no longer match:

- `public/integration.js:2-7`: `widgetPresets` defines full, auction, vote and mochi dimensions. `widgetUrl` produces `/overlay?widget=...` source URLs.
- `public/app.js:445`: inline overlay markup renders vote, companion and auction from public state.
- `server.mjs:51-80`: `publicState()` constructs public payload; currently incorrectly includes the entire companion config.
- `server.mjs:657-665`: `/api/rip/confirm` appends a pull then calls `engine.say(hostPull(pull),'happy')`; pull history is currently memory-only.
- `public/showtime.js`: existing cohost player handles voice/motion; reuse its lifecycle expectations, not its mutable internals.
- `tests/integration.test.mjs`: existing Node test conventions for presets and integration behavior. Use `node:test` and strict assertions.

## Prerequisites

Fix the public companion DTO and persist confirmed pulls before enabling pull widgets. This plan does not authorize deleting samples or changing payment transitions. If prerequisites are missing, complete the event/payload design and stop before enabling the new widgets.

## Proposed widgets, in order

1. **Pull spotlight:** after streamer confirmation, show the card name, collector number, set and catalog image when available, with a brief companion reaction. Hide price by default. Display source/time/staleness if the streamer explicitly enables a market guide. Never label it a guaranteed value, grade or authentic item.
2. **Session pull ribbon:** compact recent confirmed pulls, pack/session progress and a session-best card selected by the streamer. No model-assigned rarity/value records; use catalog facts and manual highlights. No fake entries when disconnected or empty.
3. **Chat reaction vote:** reuse verified Twitch voting for a cosmetic companion reaction or next presentation theme. One current vote, explicit tie behavior, bounded duration, optional cooldown and a mute control. It must never change buyer entitlements, winners or payment state.

Later options: bounded-run next-lot strip using already approved queue state; a tiny companion “watching / reading / needs a clearer view” indicator based on actual vision job status. Avoid showing “watching” when capture or provider service is offline.

## Scope

May change: `public/integration.js`, new `public/overlay-widgets.js`, `public/app.js` only to delegate overlay rendering/lifecycle, widget CSS in the existing style files, a focused public-event projection module, `server.mjs` only for projection wiring, and relevant tests/docs. A prerequisite durable pull service may require `lib/persistence/storage.mjs` and engine state validation; specify that in a separate change before implementation.

Out of scope: purchases, bids, allocation formats, signer permissions, paid randomness, Twitch Extension packaging, marketing deployment, arbitrary third-party JS/plugins, a new frontend framework, camera-frame retention.

## Steps and verification

1. **Define payload contract.** Specify an allowlist for `confirmed-pull`, `vote-result`, and `run-step` events: stable ID, server timestamp, schema version, source type and bounded display fields. Exclude buyer IDs, addresses, emails, claim tokens, service secrets and companion instructions. Use explicit “catalog” versus “streamer-confirmed” provenance. Add projection tests with private fields populated. Verify `node --test tests/integration.test.mjs` and the new projection test: pass, forbidden fields absent.
2. **Define delivery/reconnect.** Persist confirmed event ID with the authoritative mutation; announcements only after commit. Keep a bounded recent public event window plus a monotonic cursor. On reconnect render current state and avoid replaying previously acknowledged animations; on cold start show current spotlight without replaying all history. If no durable atomic boundary is available, stop and report instead of approximating with timers. Verify tests for restart, duplicate delivery, repeated legitimate identical physical cards, out-of-order observations and an event whose commit fails.
3. **Build the spotlight slice.** Create a small overlay controller with `mount`, `update` and `dispose`; add an explicit preset/dimensions in `public/integration.js`. Respect reduced motion, mute and offline state. A manually corrected identity must replace the correct event, not mutate an unrelated pull. Verify `npm run check`, `npm test`, and browser inspection at the configured OBS dimensions. Capture screenshots to an ignored output directory; test narrow viewport, long names, no image and unavailable feed.
4. **Pilot before expanding.** Rehearse actual card confirmation from the chosen vision provider, a correction, repeated identical cards, reconnect and restart. Confirm no public animation occurs from an unconfirmed scan or unpaid checkout. Then add ribbon and cosmetic vote incrementally using the same payload/controller contracts. Verify full checks after each independent widget, not repeated full runs without changes.

## Done criteria

- `npm run check` and `npm test` exit zero.
- Public JSON/SSE/event projection tests prove private fields absent.
- Duplicate/reconnect/restart tests prove one reaction per confirmed event, with explicit replay only on operator action.
- All presets produce valid URLs and fit declared dimensions in OBS/browser inspection.
- No mock events, fake cards, hardcoded viewers/revenue or success-shaped provider fallbacks in live mode.
- Documentation names shipped widgets and actual limits; no beta changelog entry until beta is approved.

## Maintenance and workflow

Preserve existing route contracts and avoid changing money or fulfillment code to accommodate animations. Keep presentation event kinds versioned and bounded, with server authority over source facts. Use a `codex/` branch if a new branch is requested; do not commit or push unless authorized. Update `plans/README.md` status when execution finishes. Stop if a proposed widget requires viewer PII or privileged commands; redesign its public payload first.

## Implementation status

The spotlight and recent-pulls pilot are implemented through `public/overlay-widgets.js`, the existing preset registry and the explicit confirmed-pull projection in `lib/commerce/public-state.mjs`. Pull IDs and announcements are saved together through `lib/commerce/rip-session.mjs`. These widgets intentionally render current confirmed state without replaying animations or emitting sounds, so reconnect/restart cannot trigger duplicate celebrations. Offline records are labeled. Cosmetic chat reactions remain a future option. Browser/OBS dimension and visual verification is still required; automated projection and preset checks pass.
