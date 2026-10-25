# Autoloot generated icons

16 original imagegen icons generated for Autoloot: rounded near-black silhouettes with oatmeal fills and ivory highlights. Transparent 256px PNGs normalized to a 208px optical box. Decorative usage retains accessible labels on parent controls. Primary dark buttons display a white silhouette for contrast. Remaining utility actions use the existing vector fallback.

`manifest.json` maps names to assets. `autoloot-sheet.png` preserves the original generation. `preview.jpg` is the extracted contact sheet. Rebuild with `python3 scripts/split-icons.py public/icons/autoloot-sheet.png` from the project root (Pillow required). Transparent gutters are detected from the alpha channel rather than assuming exact generated grid spacing.
