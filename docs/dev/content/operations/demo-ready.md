# Demo finalization

Use this as the working checklist for the hackathon recording. Freeze feature scope: photo-assisted lot → chat vote → creator approval → Twitch auction → private winner order → sandbox payment → fulfillment handoff. Keep other features for questions.

## Current evidence

Main `ccb0548` passed 265 automated tests, runtime checks for 82 modules and the disposable demo/privacy journeys on October 29, 2026. Rip confirmation, live form drafts and run-expiry bidding fixes are merged. These results use local fixtures; they do not establish real Twitch, Stripe, OBS or phone success.

Record the final source commit and new verification results below after any further change. Do not use the production preflight as a sandbox-demo gate: `npm run production:check` deliberately requires a Stripe live key. Keep the demo on sandbox payments.

## Finish in this order

| Priority | Item | Completion evidence |
| --- | --- | --- |
| 1 | Choose one owned physical item and a backup lot; add permitted photos, accurate condition, opening price and shipping | Reviewed inventory ready before recording; no sample stock presented as owned live inventory |
| 2 | Connect broadcaster and a separate buyer; verify public HTTPS shop and OAuth callback | Real chat vote and bid received; buyer sees only their own orders |
| 3 | Complete Stripe sandbox checkout and signed webhook | Correct order marked test-paid by the signed event, not the return URL |
| 4 | Add the OBS source and check sound/phone | Readable overlay, one voice source, no duplicate speech; buyer completes phone flow |
| 5 | Run the three-minute sequence three times | Three complete timed takes with no intervening code changes |
| 6 | Publish an eligible repository copy and final video | Fresh clone runs; judge access works; public YouTube video is at most three minutes |
| 7 | Complete submission fields | Repository URL, video URL, description and primary development Codex session ID supplied |

Detailed account/device steps: [live rehearsal](/docs/developers/live-rehearsal). Widget sizes, chat commands and routing: [Twitch and OBS](https://github.com/thomasjvu/autoloot/blob/main/docs/user/content/operations/twitch-widgets.md).

## Before each take

- [ ] Start from a dedicated rehearsal workspace with fictional recipient details; keep any real show data backed up separately. Do not reset a workspace with unresolved provider checkouts or orders.
- [ ] Preload the lot photos and approved terms. Set a short auction duration through normal Studio controls before starting the lot.
- [ ] Sign in the creator and second buyer. Keep dashboard on localhost; open public shop on the second device.
- [ ] Reauthorize broadcaster after a server restart. Confirm actual Twitch chat arrives.
- [ ] Verify payment environment says sandbox/test. Do not switch to live keys for recording.
- [ ] Prepare OBS, microphone and exactly one voice-enabled browser source. Test a short recording for readable text and intelligible audio.
- [ ] Close unrelated tabs and notifications. Frame only intended app windows; never record secrets, admin setup or real customer addresses.
- [ ] Run the verification commands below on the final source. Rehearse without further edits.

```sh
npm run check
npm test
npm run demo:check
```

All must exit successfully. `demo:check` creates disposable data and makes no real Twitch or Stripe requests. It does not reset the workspace being recorded.

## Three-minute run of show

Use the [recording script](/docs/operations/demo-recording) for exact capture actions, narration and current local verification.

Aim for 2:45 to leave export margin. Record actual app actions; edit waiting time transparently.

| Time | Show | Narration cue |
| --- | --- | --- |
| 0:00–0:15 | Creator, Twitch chat and overlay together | “Selling on stream means hosting, watching bids and managing orders at once. Autoloot connects that workflow.” |
| 0:15–0:35 | Photo, creator terms, editable draft and approval | “AI helps prepare the lot; the creator approves the details.” |
| 0:35–0:55 | Actual chat vote and creator launch | “The community chooses what comes next.” |
| 0:55–1:35 | Two registered viewers bid; demonstrate one late-bid extension and winner | “Chat participates live. The server enforces increments, timing and the winner.” |
| 1:35–2:05 | Winner's private shop order; sandbox checkout; verified test payment in Orders | “The winner gets a private order. A signed payment event confirms payment.” |
| 2:05–2:20 | Fulfillment handoff and Munny reaction | “The creator can keep hosting while the order moves into fulfillment.” |
| 2:20–2:40 | Actual Codex development session and test output | “We used Codex to build and review the engine, interface, integrations and regression tests.” |
| 2:40–2:45 | Name and eligible repository URL | “Autoloot: turn a selling stream into a shared live show.” |

Label sandbox payment visibly. A tracking handoff is not proof of carrier dispatch. Do not claim dashboard voice is on-stream unless the OBS recording captures it. If photo inference is unavailable, use an already approved listing and describe the limitation rather than staging a generated result.

## Recovery and recording decision

If Twitch disconnects, leave bidding paused and explicitly resume only after reconnecting. If payment confirmation is delayed, inspect the existing order and webhook; do not create a replacement sale or declare it paid from the browser redirect. For the final video, record a new successful take after recovery. A labeled local practice clip is useful backup material, but cannot replace the requirement to show the project working on Twitch.

Drop optional voice before dropping the core Twitch loop if audio is unreliable. Keep NFT delivery, giveaways, accounting, combined shipping and long run configuration out of the main recording unless they replace an existing segment and the story remains understandable.

## Rehearsal record

Unfilled rows mean unverified. Record event/order references without credentials or recipient information.

| Check | Date / source commit | Result / evidence |
| --- | --- | --- |
| Actual Twitch vote, bid, extension and winner | — | Not recorded |
| Winner ownership and phone checkout | — | Not recorded |
| Signed Stripe sandbox payment | — | Not recorded |
| OBS picture and single-source audio | — | Not recorded |
| Timed take 1 | — | Not recorded |
| Timed take 2 | — | Not recorded |
| Timed take 3 | — | Not recorded |
| Fresh eligible-repository clone | — | Not recorded |
| Final video and submission access | — | Not recorded |

Ready to record means the core account/device rows pass and the sequence completes reliably. Ready to submit additionally means the repository, video and required fields are accessible. Production readiness is a separate milestone.
