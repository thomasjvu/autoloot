# OBS rehearsal — November 2, 2026

Active collection: **Autoloot Rehearsal**. Original Untitled collection preserved. Importable source is `Autoloot-Rehearsal.json`, rebuilt with `python3 creative/video/munny-shop/scripts/build_obs.py`.

Scenes: welcome with original babble; live auction; chat vote; break; full rehearsal video. Only public auction/vote widgets are included; no creator dashboard, customer addresses, camera or microphone source. Nothing was broadcast to Twitch.

Local services: shop assets at `http://127.0.0.1:4188`, app widgets at `http://127.0.0.1:4173`. Keep both running. The live room uses the existing mouth rig. Joyful now has a reviewed See-through face fitted to the original body; in browser-source Interact, J selects joyful and N selects neutral. Use `expression=joyful` in the URL to start joyful. Surprised and thinking masters still await decomposition.

First local test: `/Users/area/Movies/2026-11-02 08-07-23.mov`, 76.63 seconds, H.264/AAC stereo 48 kHz. It captured the welcome and scene switches. Initial output was 1280×720; output resolution was subsequently changed to match the 1920×1080 canvas at 30 fps. Verify the next recording before treating it as final capture.

Second test: `/Users/area/Movies/2026-11-02 08-11-22.mov`, copied to `capture/obs-rehearsal-1080p.mov` in this pack. Verified H.264 1920×1080, 30 fps, 43.5 seconds with AAC audio. Welcome babble gain was raised from 0.035 to 0.14; recorded peak is −17.3 dBFS. Long silent holds make the whole-recording average much lower. No microphone or desktop audio was captured. The first test reported 0.4% rendering lag; review longer takes for dropped frames.

The signed-in workspace is in practice mode. A sample Charizard auction completed with one $45 test bid from testbuyer; no funds moved. Recording: `capture/obs-practice-auction.mov`, with frame `capture/obs-practice-auction.jpg`. No existing orders or credentials were reset. A second 30-second vote accepted viewer_one’s test vote and selected Charizard. The small-layout take is `capture/obs-practice-vote.mov`; the subsequently enlarged board is verified in `capture/obs-vote-board.png`.

Studio audio regression fixed: workspace VN speech only plays for fresh messages while the Companion page or Chat drawer is open. Login, Studio events and opening old conversation history are silent; leaving the conversation stops playback. Five focused voice tests pass, as do runtime and developer documentation checks. The browser was refreshed after the fix.

The active auction confirmed that board typography needs enlargement before the final take. The vote source now uses a 1000×550 canvas at x=960, y=140, scale 0.86 with enlarged text. OBS reported encoding overload on the vote take; it is rehearsal evidence, not final footage. Real Twitch vote/bid/winner and Stripe sandbox webhook rehearsal are outstanding. OBS is stopped and has not streamed.

Use one audible Munny source. The welcome source routes babble into OBS; auction and vote sources are muted. The recording contains no host microphone. Before the live commerce rehearsal, sign into the local creator workspace, authorize Twitch, prepare owned inventory and register the separate buyer. Do not reset active sales or orders to create practice material.

## Revised stream board and controls

The auction now shows a 300×430 reference card on the left and a 90px current bid on the right. The DEMO / AUTOLOOT eyebrow was removed from the auction widget; the creator workspace retains its practice banner. The displayed amount uses the actual highest accepted bid, falling back to the starting price before the first bid. The new style is maintained in `stream/auction.css` and copied inline by `scripts/build_obs.py` (cross-origin CSS imports are blocked by the app CSP).

All three expression face rigs are complete and reviewed. Run `scripts/serve.py` for local visual cue controls and public app-event following. Startup and reconnect skip history. Live-room audio must be assigned to track 1; verified recording `capture/obs-live-audio-verified.mov` has a −17.2 dBFS peak. Hardware Apple H.264 at 1080p30 reduced measured encoding lag to 0.1% in the verification take. OBS crashed once while operating a settings dropdown; scene collection was recovered. Keep recording stopped between takes.

Studio’s welcome hero is now persistent with populated practice inventory; hosting moved to the Your show menu entry. Browser evidence is saved in `capture/studio-persistent-hero.png` and `capture/your-show-card-scans.png`. Sample references are bundled in `public/demo/cards/` with attribution. Older captures with generic card icons are superseded for final editing.


## Final practice edit — November 2

The completed two-minute cut is `../renders/Autoloot-Munny-Practice-Demo-Final.mp4`. The editable Resolve project is `../resolve/Autoloot-Munny-Final-Practice-Demo.drp`, timeline `08 - Final practice demo - chalk - 2m00s`. It supersedes the older placeholder rehearsal edit.

Includes the door entrance, Studio hero, separate Your show page, actual OBS practice recording of accepted $45 → $50 → $60 → $65 bids and a late-bid extension, streamer setup, and Munny farewell. The original recording is `../capture/obs-chalk-bids-complete.mov`; accepted bid timings are in `../capture/bid-sequence.json`. No live Twitch broadcast or payment is represented as verified.

Chalk auction and vote presets use bundled Patrick Hand, colored chalk text, transparent backgrounds, and larger card art. See `../stream/STREAMER-SETUP.md` for reusable public browser-source URLs and use alongside StreamElements in OBS. This does not install a widget into a StreamElements account.

## Revised sound and Codex edit

The final export is now 2:06, timeline 09. Includes a lip-synced Charizard introduction, ka-ching cues on the four accepted bids, a sold resolution chime, sign-derived Munny Shop chalk type, and short illustrated Codex connection/purpose and native OBS setup beats. StreamElements is no longer part of the setup. Recorded auction footage is retained; bidding text is restyled from its accepted-action log in the editable narration layer.

## VN bid sequence and auction layout

Timeline 10 replaces bid babble with the actual bundled VN-TTS engine. Accepted bid cues last 620ms; VN dialogue begins 700ms after the cue starts. The native room follows the same order. Timer is enlarged above the amount, bidder shares the amount row, and RAW/GRADED labels reflect listing metadata. Practice slab claims remain marked unverified.
