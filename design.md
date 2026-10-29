# Autoloot web UI design

Autoloot is a Twitch selling workspace: calm enough to operate during a live show, with a playful cohost and a clear focus on the current lot. Use flat color, rounded geometry, strong type, and direct labels.

## Source of truth

The application loads the ordered imports in [`public/styles/app.css`](public/styles/app.css). Follow the [stylesheet ownership guide](public/styles/README.md) when editing or adding styles; it records the current cascade and verification rules.

The **street palette** below is the current direction. Earlier purple, pink, blue, and mint declarations remain in the cascade; they do not define the current global identity. Read the final computed style before reusing an older component color.

## Color

| Role          | Value       | Use                                                             |
| ------------- | ----------- | --------------------------------------------------------------- |
| Paper         | `#f3efdf`   | Page canvas, inputs, product image surrounds, quiet cards       |
| Ink           | `#252823`   | Main text, primary buttons, active navigation, show header      |
| Sage          | `#e6e8d8`   | Working panels, secondary surfaces, badges                      |
| Lime          | `#d2ee64`   | Show stats, selected lineup item, focus sections, Munny backing |
| Orange        | `#ed844f`   | Occasional emphasis and warm status accents                     |
| Muted         | `#62665a`   | Supporting text, timestamps, secondary labels                   |
| Hairline      | `#25282324` | Quiet 1px separators and panel outlines                         |
| Focus         | `#71882c`   | Keyboard focus outlines                                         |
| Error surface | `#f2d5bf`   | Error messages                                                  |
| Error text    | `#713e23`   | Readable text on error surfaces                                 |

Use ink on paper, sage, lime, and orange. Primary buttons use paper on ink. Lime identifies a selected or emphasized surface; do not use it as small text on paper. Keep orange occasional, and always label status in words.

Legacy token names such as `--purple`, `--mint`, and `--coral` are compatibility aliases in `workspace.css`. Prefer semantic roles when adding new tokens.

## Typography

- **Controls and supporting UI:** self-hosted Maple Mono variable, weight 100–800, with monospace fallbacks. Use medium or semibold for buttons and labels.
- **Main headings and wordmark:** `Arial Rounded MT Bold`, then system rounded/sans fallbacks. Keep the title prominent and compact.
- **Secondary headings, navigation, prices, and companion messages:** Maple Mono.
- Use tight tracking for large display text and comfortable line height for descriptions. Avoid tiny, low-contrast labels for essential actions.
- Keep font ligatures disabled in the app so prices, identifiers, and controls remain predictable.

The bundled Maple Mono font is licensed under SIL OFL 1.1. Preserve `public/fonts/OFL.txt`, `AUTHORS.txt`, and `SOURCE.md` when redistributing it.

## Layout and hierarchy

The current lot is the main workspace focus. Put its image, price, clock, and primary controls ahead of the lineup and history. Keep optional form settings in disclosures.

Desktop uses the fixed sidebar described below; mobile uses a dismissible navigation drawer. Main content is constrained to approximately 1500px. Catalog and Rip layouts collapse to one column at their own breakpoints.

Working panels generally use 20–26px corners and 24–28px padding. Controls use approximately 10–14px corners. Group related information through surface color and spacing; use thin borders and restrained shadows. Stronger outlines and a small offset shadow are reserved for the floating Munny control and transient menus.

## Component treatment

| Component              | Treatment                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------- |
| Show header            | Ink surface, paper text, a restrained lime graphic                                 |
| Auction workspace      | Sage panel, paper image surface, clear clock and bid hierarchy                     |
| Primary action         | Ink fill with paper label; one obvious primary action per task                     |
| Selected lineup item   | Lime surface with ink text                                                         |
| Chat and settings      | Sage working surfaces with quiet separators                                        |
| Orders and bidders     | Paper table body, warm neutral header (`#e6e5db`), ink text, subtle row separators; no green slab |
| Inputs                 | Light surfaces, explicit labels, clear focus and validation                        |
| Status badges          | Compact, readable labels; never communicate payment status by color alone          |
| Munny                  | Character art on lime, secondary to auction and order controls                     |
| OBS overlay            | Transparent canvas; paper speech bubble, ink outline and nameplate, lime name text |

Use the app's icon assets and inline SVG symbol system consistently. Pair unfamiliar icons with text. Product photos and card art supply detail; surrounding controls should remain visually quiet.

## Studio welcome hero

The empty Studio opens directly with its lime welcome hero. Do not add a separate “Studio” page heading or a “Your workspace” badge. “Add your first lot” is the page's semantic h1. Keep catalog/manual-add/channel actions together in the text area.

Munny uses purpose-made waist-up art, enlarged to meet the hero's top and bottom boundaries on desktop. Clip the lower figure within the rounded hero; keep her face, ears and gesture legible. Reserve roughly the right 42% for art so the text and controls remain clear. On narrow screens, stack text above a large, bottom-cropped character instead of shrinking her to a thumbnail. Do not animate or randomly rotate the pose.

Hero art: `public/characters/mochi-hero-welcome.png` is the active welcoming open-palm pose; `mochi-hero-wave.png` is the alternate waving-with-cards pose. Both preserve the streetwear character identity and transparent backgrounds. The original full-body illustration remains the reference for other placements. See [generation prompts](docs/hero-art.md).

## Interaction and motion

Use short feedback: 120ms for controls and 180ms for toggles, toasts, and supporting transitions, with `cubic-bezier(.2,.7,.2,1)` where physical feedback helps. Keep hover movement subtle and apply it only for fine pointers. Pressing the Munny launcher moves it down 3px and reduces its offset shadow.

Honor `prefers-reduced-motion`. Preserve visible keyboard focus, disabled states, semantic buttons, and status announcements. Screen/camera capture and browser speech begin through explicit controls. Auction timing and payment state come from the server, never animation completion.

## Content

Write direct task labels: **Start lot**, **Pause**, **Apply**, **Add tracking**. State what happened and the next useful action. Distinguish simulated payment, external payment, processing, and verified payment. Review screens must show the actual listing fields or transaction details being accepted.

## Documentation theme

`documentation/themes/autoloot/` maps the same palette into Papers tokens. Light mode is the default: paper canvas, ink text, sage code/panel surfaces, and lime selected navigation. Maple Mono is used for code and utility labels; longer documentation retains the existing readable sans-serif body.

The optional docs dark mode is a derived companion palette: olive-charcoal `#20231e` canvas, ink surfaces, paper text, and lime accents. The commerce web UI currently uses the light street palette; this dark variant applies to documentation only.

Keep the docs homepage disabled and preserve the grouped, concise navigation. Configure the theme through `VITE_PAPERS_THEME=autoloot`; edit theme sources and rebuild rather than changing generated CSS or `dist/`.

## Documentation artwork

Use the current streetwear Munny from `public/characters/mochi-street-v3.png`: charcoal bob and cat ears, lime hoodie, orange headphones and pouch. Preserve her identity across illustrations. Use paper/sage backgrounds, bold ink outlines, lime accents, and small orange details.

Documentation banners are wide 3:1 illustrations with no embedded text. Keep them inside the article above the opening instructions; do not reinstate a separate landing page or cover the page with a full-screen hero. Keep faces and gestures legible on mobile, supply descriptive alt text, and leave instructional content as searchable HTML.

Original PNG exports are stored under `documentation/assets/mochi/`; optimized WebP assets are served from `documentation/public/images/mochi/`. Preserve the original generation and rebuild Papers after adding page references.

## Settings and automation

Settings is an everyday control surface, not an installation manual. Use four concise integration cards with recognizable icons, a short status, one sentence and a direct action. Use official unmodified Twitch/Stripe marks with original colors and proportions; custom app functions use the existing outline icons. Keep connection errors visible when actionable.

Lead with user intent: “I lead”, “Check with me”, and “Keep it moving”. Save the choice for the next run; an active run keeps its existing permission snapshot. “Check with me” requires server-enforced approval for each lot. The run dialog can override that review choice for a particular queue. No preference grants wallet authority; existing payment, transfer and queue limits still apply. Manual companion proposals continue to require Apply.

Keep OBS layout/copy/preview together. Put practice controls and system information behind collapsed disclosures. Route installation, credentials and deeper explanations to setup/Help. Avoid schema numbers, command examples, network units and repeated responsibility notices on the main Settings view. Detailed permissions still belong at the point where the user authorizes a run or transfer.

The 404 page uses a compact puzzled seated Munny with an upside-down map, a friendly heading and a clear route home. Keep the HTTP 404 status. Public changelog UI is deferred until beta readiness.

## Workspace navigation and naming

The cohost’s public name is **Munny** throughout the app, assistant prompts, Help and marketing. Existing asset filenames/CSS identifiers may retain `mochi` as internal references; do not duplicate artwork merely to rename a file.

Use a fixed 232px desktop sidebar (204px at intermediate widths) with icons and visible labels. Keep all workspace sections reachable without a More menu. At 760px and below, use a compact brand header and an explicit navigation toggle; the menu opens as a drawer with a dismissible backdrop. Choosing a section closes the drawer. Preserve keyboard focus and Escape dismissal.

Notifications live in Munny’s floating panel, not a header toolbar. They reflect current actionable state and clear when the underlying condition resolves; they are not a historical inbox or push service.

Remove ornamental page subtitles. Keep useful counts, status and task-specific instructions. The marketing site is a separate static build in `marketing/`, published at its own origin; `/` on the Node server remains the local workspace. Marketing describes implemented features and clearly labels the current pre-beta status; a public changelog remains deferred.

## Munny side panel

Do not repeat the current section title in a toolbar above the page. The floating bottom-right Munny launcher includes a red numeric count of current actionable notifications. Opening it reveals a full-height right-side panel, with Chat, Notifications and Activity tabs. Notifications jump to the relevant workspace section and close the panel. Activity uses recorded show/run events; it is not a fabricated chat transcript. Chat retains the existing proposal/Apply boundaries and preserves unsent text across tab switches and live updates.

The panel uses paper/ink surfaces, a compact avatar header and a dark selected tab. On desktop it is at most 480px wide; on mobile it uses the viewport width. Background controls are inert while open. Support Escape, backdrop dismissal, focus containment/return and arrow-key tab navigation. Keep the launcher above the mobile safe area. Do not add a second notification entry point to the header.

Settings integration cards use official Twitch purple `#9146ff` and Stripe purple `#635bff`, white text, and rounded white tiles behind unmodified service logos. Use white action surfaces with ink text. The sidebar labels the cohost section **Companion**; the character remains Munny.

Service logo tiles are 64 × 64px squares with rounded corners and white backgrounds. Button hover preserves its surface, text and border colors; only corner radius shifts from the resting pill shape to a clearly rounded rectangle (10px on hover). The floating Munny launcher uses a red circular numeric badge at the top-right, hidden when there are no actionable notifications. No bell icon appears on the launcher.

Use distinct outline icons for Seller details (identity card), Shipping (delivery truck), and Companion (cat face). The app has no Next up section; future feature plans belong in `docs/roadmap.md`, not operational navigation.

## Optional guided tour

Show a dismissible chat bubble above Munny rather than forcing a modal on arrival. “Show me around” begins a five-step tour of Studio, Inventory, Orders, automation in Settings, and the floating Munny panel. Every step has Skip; Back and Next let users control the pace. Escape skips. The tour only navigates and highlights—it never creates inventory, starts a sale, changes permissions or sends a message.

Use the native modal spotlight described below for focus containment, clear step progress and an undimmed target window. Keep the dialog compact and usable on mobile. Remember started/skipped/completed locally under a versioned key; unavailable storage must not break navigation. Settings offers “Take a tour” to replay it. Do not show the operator tour on the storefront, stream overlay or marketing page.

The optional tour invitation is a chat bubble directly above Munny’s floating launcher, with her name, a short invitation, “Show me around” and an accessible close button. Never insert it as a page banner. Hide it while Munny’s panel is open and remember dismissal locally. Browse/search actions say **Catalog**; Metadata is attributed as a data provider, not used as the feature name.

## App boundaries and compact activity

Workspace navigation is rendered by `public/workspace-navigation.js`; notification rules and feed rendering live in `public/activity-feed.js`. Neither module fetches data or mutates sale state. `app.js` supplies snapshots and wires actions; backend modules remain authoritative for identity, permissions and commerce transitions.

Place Companion immediately after Studio. Keep the signed-in Twitch channel (or explicit local-workspace state), sign-in/switch-account action, and Settings in the sidebar footer. This is the existing Twitch broadcaster login, not a new cloud admin identity.

Use compact, solid-colored feed rows: lime Review, sand Payment, sage Delivery, peach System, lavender Connection, neutral Show. Each notification includes a descriptive title and icon; activity rows also include a compact category label. Meaning never depends on color alone. Activity combines category and timestamp on one line; details use small readable text with tight spacing. Notifications retain their section jump.

The marketing target owns its HTML/CSS and deploys only `marketing/dist` to Cloudflare Pages. It has no workspace JavaScript, API/session access or database dependency. Shared visual assets are copied using an explicit build allowlist. Configure the workspace origin via `WORKSPACE_URL`; never deploy the backend directory as a Pages site.

## Studio overview and notification simplicity

The empty Studio hero is followed by three functional snapshot widgets: Twitch connection, orders needing follow-up, and the chosen automation pace/current-run state. Use paper cards, compact icons, truthful empty states and direct actions. Never invent sales or activity to fill the dashboard.

Notifications show the action title and one short detail; omit category eyebrows. Retain solid category background colors. Twitch-specific notifications and activity use the unmodified official Twitch Glitch, with fixed square sizing and enough flex space to avoid clipping. Activity rows may retain their compact category/time metadata.

## Setup checklist

Studio includes a five-step configuration checklist for Twitch, an owned inventory item, seller details, checkout and an explicit automation pace. Show a percentage and real completed count, with every row linking directly to its task. Recalculate from the current workspace; do not let users mark unconfigured services complete. Exclude sample stock from the inventory step. Label test checkout clearly and explain that configuration completion is not a live-sale certification.

The optional quick tour is separate from setup completion: show its local completed/skipped status and replay action without reducing setup percentage for skipping. The guided tour itself shows step count and percentage. Settings connection pills say Online/Offline, preserving a Test qualifier for sandbox services. Omit the welcome hero’s catalog/manual-add sentence.

## Munny-led tour spotlights

Munny speaks in first person with a visible character portrait in each coach card. Use a viewport-sized native modal with a transparent, explicitly unblurred backdrop. An SVG mask lightly dims the workspace while leaving a clear window over the actual target, outlined in olive. Position the coach beside, above or below that window so it does not cover the target. Recompute after navigation, live updates, scrolling and resizing.

Point at specific controls rather than dimmed page headings: Studio’s hero actions, Add product, the orders table, automation choices, and Munny’s launcher. On narrow screens spotlight the selected automation choice and provide enough scroll space to keep the target above the coach. Preserve Skip/Back/Next, Escape, focus containment and the existing optional local progress behavior. The tour explains only; it never performs sales or grants authority.

Munny chat shows the reply, optional action proposal, short prompt shortcuts and composer. Show a thinking indicator only while busy; omit the constant Ready label, repeated provider footer and large disclaimer block. Keep one quiet Demo replies/AI limitations link and retain full context in Companion settings and Terms. The drawer header needs only the avatar, Munny name and close control.

Agent replies use a compact sage message bubble with a 30px Munny avatar alongside, 12px text and no redundant author heading. Suggestion chips use lime green with ink text and retain their color on hover. Notification counts inside the panel use red with white numerals, matching the floating launcher badge.

## Lightweight sales accounting

Sales & numbers is a seller-only view of collected money, refunds, awaiting payment and recorded costs. Use simple filter controls, paper summary cards and a sage contribution summary. Separate real orders from practice/test activity by default. Store item cost, payment fees, delivery costs, other costs and notes separately from buyer-visible orders. Blank means unknown; zero means confirmed zero. Label incomplete costs and estimated contribution clearly. This is an operational worksheet, not tax accounting, profit certification, provider payout reconciliation or a bank balance. CSV export includes all orders with an explicit mode column.

## Companion profiles and integrated catalog

Munny is the default profile, not a mandatory identity. Companion → Customize companion edits name, tone, response preferences and an optional uploaded avatar. Restore Munny resets those profile fields while preserving provider, voice and visibility settings. Treat preferences as presentation data; they cannot expand tools or bypass approval/payment guards. Custom avatars must be app uploads, never remote tracking URLs.

Inventory combines Your inventory and Browse catalog views. Remove the separate Catalog sidebar entry. Existing Browse catalog shortcuts select the catalog view within Inventory. Catalog reference selection still needs an owned quantity, price and condition before creating an unlisted product.

### Composer and Rip Studio

The companion composer has a visible message label, a light solid input surface, clear focus outline and a sage/lime Send button with text. Avoid relying on a tiny arrow alone. Rip Studio prioritizes one camera surface and one current-card review panel; provider/crop details sit under Capture settings. Keep manual search below the reveal, market-guide selection optional, and recent pulls compact. Do not present one-frame scans as continuous watching.

Activity mixes compact domain events with private admin audit outcomes; Audit history opens paginated records. Completed HTTP requests must not be labeled as verified payments or deliveries.

## Autoloot display wordmark

The application and marketing `.wordmark` use the customized **Autoloot Display Black** web font (`public/fonts/AutolootDisplay-Black.woff2`, weight 900), inspired by the selected charcoal submission cover. Keep this face for the brand title; interface typography remains Maple Mono. The installable TTF, character coverage and rebuild instructions are in `public/fonts/AutolootDisplay-README.md`. The v4 title uses an upright a aligned to the o’s, while preserving the cover’s joined o’s, differing t’s and spacing. The original tilted opening is available through `font-feature-settings: "ss01" 1;` and is off by default. The remaining known lowercase letters are traced; absent letters remain inferred extensions from OFL-licensed Fredoka. Retain common ligatures on `.wordmark` so the original lettering renders. Rebuild source lives in `scripts/fonts/build-autoloot-display.py`; retain `public/fonts/AutolootDisplay-OFL.txt`.

Load only `public/styles/app.css`; module ownership and cascade rules are in `public/styles/README.md`. Storefront variants use explicit component classes, never positional selectors for surface colors.
