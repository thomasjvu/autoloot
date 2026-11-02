---
lastUpdated: '2026-10-24'
---

# OBS overlay

![Munny presents a reviewed listing and microphone controls.](/images/mochi/companion-banner.webp)

Copy the overlay URL from Connections and add an OBS Browser Source at **1280 × 720**. The overlay uses a transparent background and public show state. The companion can be hidden separately from the auction display.

## Enable voice

Turn on Overlay voice in Companion. If a user gesture is required, open the Browser Source interaction panel and choose **Enable / test voice**. Enable **Control audio via OBS** for the source.

Speech uses browser synthesis. Available voices and actual audio output depend on the streamer machine and OBS runtime; verify with a local test recording before the show. Dashboard speech and overlay speech are separate browser contexts.

## Event behavior

Bid and winner reactions are driven by timestamped events. Initial history and events older than 15 seconds are not spoken. The final three-second countdown follows the authoritative end time, and a late accepted bid resets countdown eligibility. Reduced motion disables avatar movement.

If the overlay is stale, check the server connection and source URL. Public viewers never need the creator's admin capability.
