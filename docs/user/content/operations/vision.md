# Livestream vision

Rip Studio reads the camera or shared window you explicitly select. Use a clean pack-camera source or OBS Virtual Camera. The browser sends only the selected crop when you scan. No audio is captured. Recognition and companion chat use separate inference slots.

Choose **Moondream · Local** or **Moondream · Prime Inference** in Rip Studio. The choice persists in the workspace. Local never falls back to cloud. Both modes return observations and catalog candidates; the streamer confirms a card before it enters the pull pile or the companion announces it. Vision does not establish condition, authenticity, value, or authorize a sale or transfer.

## Cloud

Set `PRIME_API_KEY` in `.env`, then restart Autoloot. Use a Prime key with Inference permission and choose Prime Inference in Rip Studio. The fixed endpoint is `https://api.pinference.ai/api/v1/chat/completions`, authenticated with a Bearer token. The default hosted model is `moondream/moondream3.1-9b-a2b`; override with `PRIME_VISION_MODEL` using an exact image-capable ID from [Prime’s model catalog](https://docs.primeintellect.ai/api-reference/inference-models). Local model selection is separate (`MOONDREAM_MODEL`).

Optional `PRIME_TEAM_ID` sets the billing team through `X-Prime-Team-ID`; otherwise requests bill the key owner. Selected frames go to Prime Inference. API keys remain server-side, redirects are rejected, and no legacy Moondream console endpoint or key is used. See [Prime Inference setup](https://docs.primeintellect.ai/inference/overview) for keys, billing and serving details. Review the provider’s policies before submitting private content.

## Local

Create an isolated Python environment and install Photon dependencies:

```sh
python3 -m venv .venv-vision
.venv-vision/bin/pip install moondream pillow
.venv-vision/bin/python scripts/runtime/moondream-local.py
```

The adapter binds only to `127.0.0.1:2021`. Leave it running, start Autoloot, and choose Local in Rip Studio. Wait for “Moondream ready” before scanning. First launch downloads weights; subsequent frame inference is local. The adapter and Autoloot must use the same `MOONDREAM_MODEL`. To use a smaller supported model, set it in both processes, for example:

```sh
MOONDREAM_MODEL=moondream2 .venv-vision/bin/python scripts/runtime/moondream-local.py
```

Set `MOONDREAM_MODEL=moondream2` in Autoloot's `.env` as well. The Python command does not load `.env` automatically. Optional port override: `MOONDREAM_LOCAL_PORT` for the adapter and matching `MOONDREAM_LOCAL_URL` for Autoloot. Only loopback HTTP origins are accepted. No model weights or Python packages are bundled with Autoloot. See [Photon hardware requirements](https://docs.moondream.ai/running-locally/) before choosing a model.

## Current behavior and limits

- Scan card captures one JPEG, then pauses for review. Continuous card tracking is not enabled. Capture settings holds the provider and crop controls.
- Hold one card steady, with its name and collector number visible. Correct uncertain matches through catalog search.
- Vision requests have a 30-second deadline and no automatic retries. Errors do not silently switch providers.
- Frames are processed in memory by Autoloot and the local adapter, without application frame files. Cloud processing is subject to the provider's policies.
- Last-read timing measures vision inference and transport, excluding catalog lookup. Hardware and model warm-up affect latency.
- Confirmed pulls and their announcement are committed together to SQLite. Restart preserves the pull ledger. Unconfirmed scans and selections remain temporary.
- Card detection/cropping, perspective correction, temporal agreement, duplicate tracking and continuous event-driven commentary remain future work. Current recognition is a cropped-frame query, not segmentation.

Camera tracks stop when you leave Rip Studio. Crop and variant choices survive unrelated live updates; changing the reviewed identity resets the variant. Revision IDs prevent late responses from replacing a newer review, and confirmation requires the exact reviewed selection.

For a vision-led show, set `AUTOLOOT_REQUIRE_VISION=1` before running `npm run production:check`. Local readiness checks the loaded model via the loopback adapter’s `/health`; cloud preflight checks configured credentials, not recognition quality or account credit.

Market-guide data is validated before review. Malformed quote structures or currency codes leave the card available for confirmation without a guide and show an error; Autoloot does not relabel an unknown currency as USD. Confirmation prepares the host announcement before changing the pull ledger. A rejected guide or formatting failure does not add a pull, and unrelated later saves cannot persist that rejected confirmation.
