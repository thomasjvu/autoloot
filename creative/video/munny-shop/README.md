# Munny shop video and livestream pack

## OBS collection and new expressions

`obs/Autoloot-Rehearsal.json` supplies five scenes and has been imported and activated in OBS. `obs/REHEARSAL.md` records the local capture checks. `capture/obs-rehearsal-1080p.mov` is an actual short OBS test, separate from the edited submission rehearsal. Streaming has not been started. Practice commerce rehearsal awaits creator sign-in.

Three image-generated expression masters and their prompts are in `assets/expressions/`. The joyful master is being decomposed in a private See-through Kaggle job; the existing rig remains in OBS until the returned face layers are reviewed. These are not yet a Live2D Cubism model.

## Current edit: full 2:45 rehearsal, version 4

`renders/autoloot-full-rehearsal-v4.mp4` carries Munny through the entire planned demo: shop entrance, board push-in, listing, vote, auction, sandbox checkout, fulfillment, Codex evidence and shop farewell. Munny is another 140 pixels left in the shop framing. The body of the film uses clearly labeled recording slates because OBS/Twitch footage has not been recorded.

`resolve/Autoloot-Munny-Full-Rehearsal-v4.drp` is the exported Resolve project after running `resolve/assemble-full-v4.lua`. Timeline 07 has eight separate V1 sections, synchronized character on V2, timed dialogue on V3, a persistent sandbox label on V4 and stereo babble on A1. Blue markers identify dialogue cues. Replace the yellow recording sections using `capture/SHOT-LIST.md`. The actual provider footage and verified repository end card are still required before submission.

Rebuild the intro with `python3 creative/video/munny-shop/scripts/build_v2.py v4`, then the full cut with `python3 creative/video/munny-shop/scripts/build_walkthrough.py`. `walkthrough-timing-v4.json` records dialogue and chapter timing; `renders/walkthrough-contact-sheet-v4.jpg` is the visual review sheet. The OBS source uses the farther-left character position.

## Version 3: chalk welcome, simpler shelf

`renders/munny-shop-intro-v3.mp4` moves Munny 80 pixels left and adds cute chalk “WELCOME TO AUTOLOOT” lettering. The shelf now holds two plain boxes, without the diamond icon or trailing plant. The browser source uses the same layout. Rebuild with `python3 creative/video/munny-shop/scripts/build_v2.py v3`. In Resolve, `_G.MUNNY_VERSION='v3'; dofile('/Users/area/live-shopping-companion/creative/video/munny-shop/resolve/assemble-v2.lua'); _G.MUNNY_VERSION=nil` adds separate v3 timelines and exports `resolve/Autoloot-Munny-Shop-v3.drp`. Earlier versions remain available.

## Version 2: close shop and synchronized mouth

`renders/munny-shop-intro-v2.mp4` is the current 18-second preview. The shop now uses a close waist-up composition, a mostly empty cream wall, one shelf, one display and a plain counter. The existing SVG rig supplies two registered mouth poses. Character babble and mouth openings use the same syllable timestamps, with closed-mouth pauses at punctuation and after each line. The OBS source has the same timing behavior, including when sound is muted.

`resolve/assemble-v2.lua` adds new v2 timelines and exports `resolve/Autoloot-Munny-Shop-v2.drp`, preserving v1. `scripts/build_v2.py` rebuilds the v2 assets; it also requires `rsvg-convert`. New livestream plates are `assets/shop-background-v2.png`, `assets/counter-positioned-v2.png` and `assets/shop-live-v2.png`. The browser source below now uses v2. V1 assets and the following historical instructions remain available.

DaVinci Resolve project: **Autoloot - Munny Shop Demo v1**. 1920×1080, 30 fps. This pack starts the under-three-minute OBS/Twitch submission demo with an 18-second illustrated shop entrance and character dialogue. Munny uses original synthesized babble, with no spoken narrator.

## Preview and edit

- `renders/munny-shop-intro-v1.mp4`: first entrance preview, including sound.
- `renders/intro-contact-sheet.jpg`: review frames.
- `resolve/Autoloot-Munny-Shop-v1.drp`: exported Resolve project after the assembly script has run. Media stays in this folder; the DRP does not embed it.
- `resolve/assemble.lua`: native Resolve assembly. In the new demo project's **Workspace → Console**, select Lua and run `dofile('/Users/area/live-shopping-companion/creative/video/munny-shop/resolve/assemble.lua')`. Run once; it deliberately stops if its bin already exists.

The first timeline has separate shop, character, foreground counter, ProRes 4444 dialogue, ProRes 4444 door and stereo sound layers. The second timeline is a 2:45 assembly with the intro and clearly labeled recording slots. Those slots are placeholders, not app footage.

To rebuild the preview and compositing plates: `python3 creative/video/munny-shop/scripts/build.py` from the repository root. Requires Pillow, NumPy and ffmpeg. The original generated masters are preserved. The initial character in the video has a restrained speaking hop; the OBS SVG source also has the existing mouth/ear/tail rig. A new welcoming arm gesture and the transition into actual app footage remain to be built.

## Reuse in OBS

Add `stream/shop.html` as a **Browser Source → Local file**, width **1920**, height **1080**. Use **Interact** and click **Welcome in**; Space advances dialogue pages. The default is silent. Browser-source audio must be enabled and tested in OBS before use on stream.

For query options, serve the folder locally: `python3 creative/video/munny-shop/scripts/serve.py`. Add a URL Browser Source using one of these:

- `http://127.0.0.1:4188/stream/shop.html?autoplay=1`: full shop and greeting.
- `http://127.0.0.1:4188/stream/shop.html?mode=starting&autoplay=1`: starting-soon dialogue.
- `http://127.0.0.1:4188/stream/shop.html?mode=brb&autoplay=1`: break dialogue.
- `http://127.0.0.1:4188/stream/shop.html?mode=overlay&autoplay=1`: transparent corner Munny and dialogue for actual app footage.

Append `&sound=1` to request original synthesized babble. Use Interact and a click if the browser requires an audio gesture. `text=` accepts a URL-encoded custom dialogue page. Modes are selected by the URL; sources do not send messages to Twitch or modify the app. The OBS collection places the public auction/vote widgets over the board. Insert recorded footage in Resolve for the edit.

For a still shop scene use `assets/shop-live-1080.png`. For manual layering, add `shop-background-1080.png`, `munny-positioned-1080.png`, `counter-positioned-1080.png`, then `dialogue-empty-1080.png`, in that order. The latter three preserve transparency.

## Source and status

Shop/counter artwork was generated with the built-in image-generation tool. Prompts and reference roles are saved in `assets/generation-prompts.json`. Munny is the existing `public/characters/mochi-street-v3.png`; her self-contained SVG rig is copied from `public/characters/munny-idle.svg`. Dialogue graphics and audio are original deterministic code assets. No game audio was sampled.

The complete 2:06 practice edit and actual OBS practice-bid footage are delivered. Real Twitch chat evidence, signed Stripe sandbox payment evidence, and a repository end card remain optional upgrades for a full commerce submission. A browser preview is not proof of OBS audio or real Twitch integration. Follow `docs/demo-munny-direction.md` and `docs/demo-ready.md` in the repository for the script and rehearsal gates.

## Live expression rehearsal

The first generated expression, joyful, has been decomposed and visually reviewed. `scripts/build_expressions.py` fits the extracted facial layers into the original rig, retaining its body, hair, ears and shoes. The shop source supports `expression=joyful`, plus J (joyful) and N (neutral) in OBS Interact. Both expressions retain the syllable-timed open/closed mouth. This is a layered expression puppet, not a Cubism model. Surprised and thinking have since completed; all three face rigs are reviewed. See `obs/REHEARSAL.md` for actual capture evidence and remaining rehearsal steps.

## Live stream desk

Run `python3 creative/video/munny-shop/scripts/serve.py` from the checkout. Open `http://127.0.0.1:4188/stream/control.html` for expression buttons, dialogue cues, clear, and the app-event follow switch. Use the shop URL with `mode=live&sound=1` in OBS. Route the live-room source to recording track 1; keep the public auction/vote sources silent. Inactive shop sources shut down to prevent duplicate narration.

The relay reads only the public companion projection from the local app on port 4173. It needs no creator credentials. Fresh events update dialogue and mouth; scene startup/reconnection do not replay history. App-event audio respects Overlay voice. Manual cues use the local source sound setting. Controls are visual only and never bid, launch a lot or message Twitch. Keep the server bound to loopback.

All three generated expressions are reviewed: joyful, surprised, thinking. In OBS Interact, J/N/S/T choose joyful/neutral/surprised/thinking, and Space advances a local line. The generated color PSDs remain in each expression’s output folder. Body/hair/ears/shoes stay on the original rig; registered drawn mouth poses supply closure and thinking’s open shape.

## Final practice edit

`renders/Autoloot-Munny-Practice-Demo-Final.mp4` is the 2:06 final practice cut, built from the entrance, actual Studio/Your show screenshots, the recorded chalkboard bid sequence, stream setup card and farewell. It contains no placeholder footage slots and makes no claim of live Twitch or verified Stripe checkout. `resolve/assemble-final-v4.lua` imports seven editable picture beats, the separate narrator alpha and audio into a new timeline, preserving earlier edits.

The isolated bid capture uses the normal authenticated practice endpoints on port 4175, with disposable data under `/tmp/autoloot-munny-recording-take2-20261102`; it does not reset the main workspace. `capture/bid-sequence.json` records the accepted $45, $50, $60 and $65 amounts, late extension and sold state. `scripts/record_practice.mjs` requires a fresh isolated workspace and waits for recording to begin. The raw take remains `capture/obs-chalk-bids-complete.mov`; the final edit trims its initial standby hold.

Use the native `chalk-auction` and `chalk-vote` app presets for transparent, colored chalk widgets with the bundled font. See [streamer setup](stream/STREAMER-SETUP.md) for native OBS browser-source setup. StreamElements is not required.

## Delivery

Current saved Resolve timeline: **11 - Final practice demo - Centered dialogue and timer - 2m06s**. Video: `renders/Autoloot-Munny-Practice-Demo-Final.mp4`. Optional dialogue captions: `renders/Autoloot-Munny-Practice-Demo-Final.srt`. See `DELIVERY.md` for exact contents and remaining integration evidence.
