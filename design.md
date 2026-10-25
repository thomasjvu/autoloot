# Autoloot web UI design

Autoloot is a Twitch selling workspace: calm enough to operate during a live show, with a playful cohost and a clear focus on the current lot. Use flat color, rounded geometry, strong type, and direct labels.

## Source of truth

The application loads these styles in order:

1. `public/style.css` — base layout, controls, and component structure.
2. `public/drop.css` — editorial layout, Maple Mono, display typography, and interaction feedback.
3. `public/street.css` — current palette and final component overrides.

The **street palette** below is the current direction. Earlier purple, pink, blue, and mint declarations remain in the cascade; they do not define the current global identity. Read the final computed style before reusing an older component color.

## Color

| Role          | Value       | Use                                                             |
| ------------- | ----------- | --------------------------------------------------------------- |
| Paper         | `#f3efdf`   | Page canvas, inputs, product image surrounds, quiet cards       |
| Ink           | `#252823`   | Main text, primary buttons, active navigation, show header      |
| Sage          | `#e6e8d8`   | Working panels, secondary surfaces, badges                      |
| Lime          | `#d2ee64`   | Show stats, selected lineup item, focus sections, Mochi backing |
| Orange        | `#ed844f`   | Occasional emphasis and warm status accents                     |
| Muted         | `#62665a`   | Supporting text, timestamps, secondary labels                   |
| Hairline      | `#25282324` | Quiet 1px separators and panel outlines                         |
| Focus         | `#71882c`   | Keyboard focus outlines                                         |
| Error surface | `#f2d5bf`   | Error messages                                                  |
| Error text    | `#713e23`   | Readable text on error surfaces                                 |

Use ink on paper, sage, lime, and orange. Primary buttons use paper on ink. Lime identifies a selected or emphasized surface; do not use it as small text on paper. Keep orange occasional, and always label status in words.

Legacy token names such as `--purple`, `--mint`, and `--coral` are compatibility aliases in `street.css`. Prefer semantic roles when adding new tokens.

## Typography

- **Controls and supporting UI:** self-hosted Maple Mono variable, weight 100–800, with monospace fallbacks. Use medium or semibold for buttons and labels.
- **Main headings and wordmark:** `Arial Rounded MT Bold`, then system rounded/sans fallbacks. Keep the title prominent and compact.
- **Secondary headings, navigation, prices, and companion messages:** Maple Mono.
- Use tight tracking for large display text and comfortable line height for descriptions. Avoid tiny, low-contrast labels for essential actions.
- Keep font ligatures disabled in the app so prices, identifiers, and controls remain predictable.

The bundled Maple Mono font is licensed under SIL OFL 1.1. Preserve `public/fonts/OFL.txt`, `AUTHORS.txt`, and `SOURCE.md` when redistributing it.

## Layout and hierarchy

The current lot is the main workspace focus. Put its image, price, clock, and primary controls ahead of the lineup and history. Keep optional form settings in disclosures.

Desktop uses one top navigation row with secondary tools under **More**. The current header is 80px tall with 40px horizontal padding. Main content is constrained to approximately 1500px. At 700px and below, the header wraps and navigation stays in normal document flow. Specialized catalog and Rip layouts collapse from columns to one column at their own breakpoints.

Working panels generally use 20–26px corners and 24–28px padding. Controls use approximately 10–14px corners. Group related information through surface color and spacing; use thin borders and restrained shadows. Stronger outlines and a small offset shadow are reserved for the floating Mochi control and transient menus.

## Component treatment

| Component              | Treatment                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------- |
| Show header            | Ink surface, paper text, a restrained lime graphic                                 |
| Auction workspace      | Sage panel, paper image surface, clear clock and bid hierarchy                     |
| Primary action         | Ink fill with paper label; one obvious primary action per task                     |
| Selected lineup item   | Lime surface with ink text                                                         |
| Orders, chat, settings | Sage working surfaces with quiet separators                                        |
| Inputs                 | Light surfaces, explicit labels, clear focus and validation                        |
| Status badges          | Compact, readable labels; never communicate payment status by color alone          |
| Mochi                  | Character art on lime, secondary to auction and order controls                     |
| OBS overlay            | Transparent canvas; paper speech bubble, ink outline and nameplate, lime name text |

Use the app's icon assets and inline SVG symbol system consistently. Pair unfamiliar icons with text. Product photos and card art supply detail; surrounding controls should remain visually quiet.

## Interaction and motion

Use short feedback: 120ms for controls and 180ms for toggles, toasts, and supporting transitions, with `cubic-bezier(.2,.7,.2,1)` where physical feedback helps. Keep hover movement subtle and apply it only for fine pointers. Pressing the Mochi launcher moves it down 3px and reduces its offset shadow.

Honor `prefers-reduced-motion`. Preserve visible keyboard focus, disabled states, semantic buttons, and status announcements. Screen/camera capture and browser speech begin through explicit controls. Auction timing and payment state come from the server, never animation completion.

## Content

Write direct task labels: **Start lot**, **Pause**, **Apply**, **Add tracking**. State what happened and the next useful action. Distinguish simulated payment, external payment, processing, and verified payment. Review screens must show the actual listing fields or transaction details being accepted.

## Documentation theme

`documentation/themes/autoloot/` maps the same palette into Papers tokens. Light mode is the default: paper canvas, ink text, sage code/panel surfaces, and lime selected navigation. Maple Mono is used for code and utility labels; longer documentation retains the existing readable sans-serif body.

The optional docs dark mode is a derived companion palette: olive-charcoal `#20231e` canvas, ink surfaces, paper text, and lime accents. The commerce web UI currently uses the light street palette; this dark variant applies to documentation only.

Keep the docs homepage disabled and preserve the grouped, concise navigation. Configure the theme through `VITE_PAPERS_THEME=autoloot`; edit theme sources and rebuild rather than changing generated CSS or `dist/`.
