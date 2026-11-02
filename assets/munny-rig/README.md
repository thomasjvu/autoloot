# Munny See-through rig

Source: `public/characters/mochi-street-v3.png` (current companion default).
Pipeline: https://github.com/shitagaki-lab/see-through
Official hosted demo: https://huggingface.co/spaces/24yearsold/see-through-demo

Attempted 2026-11-01 with resolution 1280, seed 42, and separate left/right arms, eyes and ears. Source uploaded successfully. Hosted inference returned ZeroGPU quota exceeded (180 seconds required, 12 seconds remaining). No PSD or decomposed layers were returned; do not treat any old idle-frame assets as See-through output.

Next: run the same image through an authenticated demo or GPU installation, retain the layered PSD and full-canvas PNG exports, review recomposition and occluded regions, then rig small tail/ear movement, blinking and breathing with fixed canvas alignment. Keep the existing static default until layer quality and motion are verified. Respect reduced-motion preferences.

## Signed-in run

Retried via the user's authorized thomasjvu Brave session at 768 resolution, seed 42, split left/right enabled. Inference completed and UI reported a 3.0 MB PSD plus 24 preview layers. However the official Space's PSD download failed in Brave ("File wasn't available on site"); direct retrieval of that advertised URL returned HTTP 403 "File not allowed". The gallery Download control also returned a 119-byte JSON error rather than an image. No usable outputs were retrieved. Do not attempt to bypass the Space's file-access policy; the hosted export needs fixing or inference must run in an owner-controlled instance.

## Private Kaggle pipeline

Private source dataset: https://www.kaggle.com/datasets/thomasjvu/autoloot-munny-seethrough-source
Private notebook: https://www.kaggle.com/code/thomasjvu/autoloot-munny-see-through
Reusable skill: `/Users/area/.codex/skills/see-through-kaggle/SKILL.md`.

`kaggle/` preserves the exact submitted script and metadata for this asset. The reusable skill owns the template. Submission uses `kaggle kernels push -p assets/munny-rig/kaggle --accelerator NvidiaTeslaT4`. Source is pinned to revision df019de5129d6c4b406587a14c3501669441a783. Source art and notebook remain private. This is a GPU execution attempt, not a validated rig until outputs pass review.

## Kaggle result and recovery

T4 x2 execution completed layer/depth inference and wrote `source.psd`, but the kernel failed during optional psd-tools composite/export with a NumPy ufunc metadata error. Recovered the PSD locally and exported 19 full-canvas layers with `layer.topil()` in an isolated NumPy 1.26.4 environment. `generated/` contains the PSD, aligned PNGs, layer manifest and composite preview. The reusable script now extracts raw channels and treats preview compositing failure as optional, preserving the successful PSD/layer export.

Visual QA: generated composite drops the original cat ears and shoes. It is not approved as the production Munny asset. Preserve the static original; improve layer coverage before rigging or shipping this output. No GPU rerun was needed for local recovery.

## Complete editable PSD

`complete/munny-complete.psd` restores the original cat ears and shoes as four explicitly named original-pixel repair layers, alongside all 19 generated layers (23 visible layers total), plus a hidden original-art reference. It is a repaired See-through decomposition, not a claim that the model generated the missing regions. `repair-regions.json` stores reviewed fixed-canvas masks; the reusable skill's `scripts/repair_psd.py` rebuilds and exports the PSD. All 23 visible layers were checked nonempty and the saved PSD reopened/composited successfully. The composite was visually reviewed for the restored ears and shoes. These repair layers preserve visible source pixels; hidden regions are not newly inpainted and need review during rigging.

## Idle puppet

`build-idle.py` exports the production `public/characters/munny-idle.svg`: self-contained PNG layers, fixed 768px source canvas cropped to a 512×768 viewport, stable hips/feet, tail pivot (374,404), per-ear pivots and aligned eye closure. Breathing translates the upper-body layers together by at most 1.6 source pixels. Reduced-motion disables internal SVG keyframes. No live GPU service is needed to play this rig. Browser inspection confirmed the tail and breathing transforms are active and upper-body transforms agree. The default app avatar resolves to this rig through `public/shared/companion-asset.js`; custom avatar URLs pass through.

Latest rig revision removes all breathing transforms. The mouth has a closed resting scale and an irregular open/close cycle under SVG `#talk:target`. The shared companion asset helper selects it from browser utterance lifecycle events, without changing custom avatars. Browser inspection confirmed `mouthAnimation: talk` and zero breathing layers.
