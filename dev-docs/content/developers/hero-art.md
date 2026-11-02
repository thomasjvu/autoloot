# Studio hero artwork

Generated with the built-in imagegen tool, using `public/characters/mochi-street-v3.png` as the character/style reference and transparent output enabled. Original generation files are retained; project copies are used by the app.

- Active: `public/characters/mochi-hero-welcome.png` — open-palm welcome.
- Alternate: `public/characters/mochi-hero-wave.png` — waving with cards.

## Welcome prompt

Create a new pose of this exact original Autoloot mascot Munny, reference for identity and illustration style. Preserve charcoal bob haircut, cream cat ears, lime cropped streetwear hoodie over charcoal top, orange headphones at neck, orange crossbody pouch, warm cream skin, bold clean ink outlines, flat cel shading, cute friendly adult chibi proportions. NEW POSE: welcoming host, smiling and extending one open palm to the viewer's left, other hand resting at hip. Waist-up editorial cutout for a web hero, broad lively gesture. Face looks at viewer. Show complete ears and hands; bottom crop across upper thighs. Character tightly fills canvas vertically, almost no empty top/bottom margin. Genuinely transparent background, no glow, no shadow halo, no text, no scene, one character only. This is stylized-concept character artwork.

## Wave prompt

Generate a second new hero pose of this exact original Autoloot mascot Munny, using reference solely for character identity and illustration style. Preserve charcoal bob, cream cat ears, lime cropped hoodie, dark top, orange headphones around neck and orange crossbody pouch; same warm cream skin, bold ink outlines and clean flat cel shading, friendly adult chibi proportions. NEW POSE: cheerful cohost leaning slightly toward viewer's left, one hand raised in a friendly wave near her ear, other hand holding a small fan of three unbranded trading cards at chest height. Waist-up cutout with crop at upper thighs, complete ears and fingers visible, looking at viewer, balanced expressive silhouette. Character fills almost the full vertical frame without large empty margins. Transparent background, no glow/halo, no text, no logos, no other characters or scene. stylized-concept web illustration.

## 404 illustration

Saved as `public/characters/mochi-lost.png`, generated with built-in imagegen, transparent output, using `mochi-street-v3.png` as reference.

Prompt: Create a cute 404-page illustration of this exact original Autoloot catgirl mascot Munny. Preserve charcoal bob haircut, cream cat ears, lime streetwear hoodie, charcoal top and shorts, orange headphones around neck, orange crossbody pouch, cream sneakers, cat tail, bold clean black outlines and flat cel shading. A new sweet comical pose: she sits cross-legged on the floor, head tilted with a puzzled little smile, holding a small folded blank map upside down and scratching one ear with her free hand. One tiny floating question mark beside her head. Cozy, playful, lost-but-cheerful expression. Full body, complete ears/tail/shoes, centered compact composition with small margins. Transparent background, no glow or backdrop, no words/numbers/logos; the webpage will supply the 404 text. Match the original streetwear illustration style. stylized-concept.

### Munny mouth poses

The layered idle SVG is rebuilt with `assets/munny-rig/build-idle.py`. Talking uses separate closed-smile and open-mouth vector poses aligned with the face tilt. Discrete pose changes replace the earlier vertically scaled mouth, which distorted the artwork. The `#talk` fragment selects a varied 1.9-second pose cycle during browser speech; this is not phoneme alignment. Reduced motion keeps the closed smile. Tail, ears and blink animation remain independent.
