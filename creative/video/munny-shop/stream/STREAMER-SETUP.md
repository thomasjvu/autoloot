# Use the chalk widgets on a stream

In Autoloot, open Settings → Stream → Layout and choose **Chalkboard auction** (960 × 500) or **Chalkboard vote** (1000 × 550). Copy the OBS link. Add a Browser Source at that size with default CSS, then position it over your own dark board or stream art. The background stays transparent. Text uses the custom bundled Munny Shop OFL font; no font installation or remote font request is needed.

Direct URLs on this local app:
- `http://127.0.0.1:4173/overlay?widget=chalk-auction`
- `http://127.0.0.1:4173/overlay?widget=chalk-vote`

On a hosted installation, use that installation's origin. A localhost URL works only on the computer running Autoloot. These are public display URLs; never paste creator cookies, admin tokens or private dashboard URLs into overlays.

## Munny shop pack

Run `python3 creative/video/munny-shop/scripts/serve.py` and import `obs/Autoloot-Rehearsal.json` into OBS. Shop sources use 1920 × 1080. The collection adds the public widgets over the chalkboard. The local stream desk at `/stream/control.html` cues her expressions and babble. Enable only one audible Munny source at a time. Auction/vote widgets themselves are silent. The live Munny room plays an original ka-ching for accepted bid-count increases and a resolution chime on sold transitions. New live lots get a typed, lip-synced introduction using the actual title and opening price. Startup/reconnect establishes a baseline without replaying alerts. Add `&sfx=0` to disable effects while keeping dialogue audio; `sound=0` silences both. Keep only one live-room audio source active to avoid doubling.

For the isolated recording workspace only, start the shop relay with `AUTOLOOT_STREAM_APP=http://127.0.0.1:4175`. The normal default is 4173. Practice bids use normal authenticated demo actions and move no funds. Connect and verify Twitch separately before real live commerce.

## Codex

Settings → Codex → Connect Codex. Use the existing local account or finish Sign in with ChatGPT on OpenAI’s page. Install Codex CLI on the host if prompted, then retry. Codex helps Munny answer shop questions and propose listing drafts and show actions for creator review. Autoloot validates bids and determines winners independently. This practice cut illustrates setup, without claiming a newly completed sign-in.

Authentication reference: https://learn.chatgpt.com/docs/auth

Accepted bids play a 620ms register cue before VN-TTS begins at 700ms. The enlarged timer sits above the price; bidder attribution shares the price row. RAW/GRADED labels reflect listing metadata, with unverified slab claims labeled.
