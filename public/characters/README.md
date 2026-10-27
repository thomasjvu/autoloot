# Munny

Original imagegen VTuber-style character portrait for Autoloot. Transparent PNG, generated 2026-10-24. Lavender cat ears/bob, ivory hoodie, mint star pendant. Used in companion panel and OBS overlay. This is a static illustration with event-driven whole-character reactions, not a Live2D rig or lip-synced model. Existing voice playback is independent of the image. Original generation preserved under Codex generated_images.

## Street edition

`mochi-street.png` replaces the detailed VTuber portrait in the current app: original simplified chibi cat, charcoal bob, lime hoodie, headphones, orange pouch, cream sneakers, clean cel shading. Inspired by the graphic energy of retro street-skating games, with an original character silhouette. Prior portrait retained as an unused iteration.

## Idle loop

`mochi-idle.webp` is a 12.98-second held-frame idle loop built from the four imagegen drawings in `idle/source.png`: neutral, blink, ears outward/tail curl, and relaxed tail curl. Blink frames hold for 130ms, with long neutral pauses. This is drawn frame animation rather than a skeletal rig. The Companion bust framing shows face/ears; tail motion is visible in full-body views. Custom uploaded avatars stay static. Reduced-motion mode uses `idle/frame-0.webp`.

## Drawn idle v4

`mochi-idle-v4.webp` directly assembles the eight full poses in `idle-v4/source.png`: tail motion, subtle shoulder/jacket breathing and a short blink are drawn into the generated frames. No eye patches, body masks or CSS breathing. Export uses fixed equal cell boundaries to preserve full sleeves. Reduced-motion uses the first still frame. Generated drawings can still have slight between-pose shape variation; this is not a skeletal animation rig.
