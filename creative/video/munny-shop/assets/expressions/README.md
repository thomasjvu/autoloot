# Generated Munny expressions

`joyful-master.png`, `surprised-master.png` and `thinking-master.png` were generated from `public/characters/mochi-street-v3.png` with the built-in image-generation tool. Face-only changes were requested, preserving the original pose, clothing, framing and character identity. All three are 1024×1536 RGBA masters. They are not yet face parts or a Cubism rig.

The intended pipeline is generated expression → See-through semantic layers → visual QA → registered eye/eyebrow/mouth alternatives on the stable character. Keep one body registration, and do not switch whole-body generated frames as a substitute for expression layers. Check cheek/hair boundaries and mouth closure before runtime use.

First expression job: private dataset `thomasjvu/autoloot-munny-joyful-expression-source`, private kernel `thomasjvu/autoloot-munny-joyful-see-through`. `joyful-seethrough/kernel/` stores the exact script and metadata; source revision is pinned, 768 resolution, seed 42, FP16 adaptation for T4×2. Job status is in `manifest.json`. Source and notebook must remain private.

Surprised and thinking decomposition should follow only after the first result has usable face layers. Expression switching and lip sync are Live2D-style behavior; See-through does not automatically produce a Live2D Cubism model.
