# Autoloot Display Black — v4

The default lowercase `a` is upright, with a level bowl, vertical terminal and round counter. The default `autoloot` wordmark aligns that a to the o’s baseline and x-height. Accented a forms inherit the upright outline.

The original cover-traced tilt is preserved as `a.tilted` and `autoloot.wordmark.tilted`, enabled through stylistic set `ss01`. This is opt-in: the site uses the upright form. Both wordmarks retain the original joined o’s, differing t’s and spacing.

Other letters and symbols remain inferred extensions based on OFL Fredoka, not lettering recovered from the image. The full alphabet must not be described as an exact reconstruction of a font from the generated cover.

Contains 448 encoded characters, including Latin-1 accents, common extended Latin accents, currencies, typographic punctuation, and combining accent marks. Includes Romanian comma-below, Czech/Slovak side carons, Turkish dotted/dotless I, Polish accents and Welsh W/Y accents. This does not cover every Latin extension or every writing system.

## OpenType

- `liga`: the upright `autoloot` wordmark plus ff, fi, fl, ffi, ffl. Corrected the upstream reverse fi/fl decomposition.
- `ss01` (“Tilted opening a”): original tilted wordmark; in ordinary text, only unaccented word-initial a changes. Interior a’s remain upright. Enable with `font-feature-settings: "ss01" 1;`.
- `dlig`: optional decorative ft, jj, ll, tt; not enabled by default.
- `kern`: native kerning plus restrained Autoloot-specific pairs. CSS tracking is zero.
- `mark`, `mkmk`: combining mark positioning inherited from Fredoka; added below-comma positioning.
- Upstream fractions, superscripts and ordinals are retained.

## Files and rebuilding

- `AutolootDisplay-Black.woff2`: self-hosted web font.
- `AutolootDisplay-Black.ttf`: installable desktop font; version 4.000.
- `AutolootDisplay-OFL.txt`: license, shipped with the marketing build.
- `../../creative/fonts/build-autoloot-display.py`: reproducible build from committed cover outlines and vendored source.
- `../../creative/fonts/check-autoloot-display.py`: coverage and HarfBuzz shaping checks.
- `../../creative/fonts/render-autoloot-specimen.py`: static specimen rendering.

Install `fonttools[woff] uharfbuzz pillow` in a Python environment. Run the build and check scripts from any directory. Source provenance and checksum are in `creative/fonts/vendor/fredoka/SOURCE.md`.

## Cover tracing

`../../creative/fonts/trace-cover-wordmark.py` extracts the cover’s lettering to `cover-wordmark-outlines.json` and `public/brand/autoloot-wordmark-tilted.svg`. The font build exports both `public/brand/autoloot-wordmark.svg` (upright) and `public/brand/autoloot-wordmark-tilted.svg` (original). Optional regeneration requires `pillow numpy vtracer`; the ordinary font build needs only the committed JSON and upstream TTF. Browser reference comparison: `creative/marketing/autoloot-wordmark-alternates.html`.

## Attribution and license

Based on Fredoka, Copyright 2016 The Fredoka Project Authors (https://github.com/hafontia/Fredoka-One), licensed under SIL Open Font License 1.1. Autoloot Display is a renamed derivative and remains OFL-licensed. This supersedes the original v1 ownership note. Maple Mono retains its separate OFL attribution.
