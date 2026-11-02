# Creative production

- `character/`: editable character rigs and archived animation exports.
- `fonts/`: font-building tools, traces and upstream font sources/licenses.
- `marketing/`: submission artwork, cover variants and visual experiments.
- `video/`: video compositions, stream-room sources and recording tools.
- `tools/`: reusable illustration and sprite-processing scripts.

Only reviewed exports needed by the application belong in `public/`. The current
character SVG, default-avatar image, welcome/wave illustrations and error artwork
remain there. Eleven unreferenced legacy character export entries were moved
into `character/legacy-exports/`; they remain available to creative tooling.

Run tools from the repository root unless their own README says otherwise.
Caches, third-party processing output, recorded takes and rendered videos stay
local and are excluded from source control. Production Docker builds exclude
this entire directory.
