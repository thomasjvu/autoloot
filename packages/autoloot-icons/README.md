# Autoloot Icons

19 code-native SVG icons. 24 × 24 grid, 2px rounded strokes, `currentColor`, no raster dependencies. Black and white by default; inherit any theme color. MIT licensed; package prepared locally, not published.

Use individual SVG files inline, or the sprite:

```html
<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="sprite.svg#bag" /></svg>
```

Decorative icons use `aria-hidden`; give icon-only controls an accessible label. Set `color` on the SVG or parent for optional colored treatments. Maintain geometry and stroke consistency when contributing. Generated raster concepts are separate reference material and are not part of this package.
