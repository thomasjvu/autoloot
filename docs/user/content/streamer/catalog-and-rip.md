---
lastUpdated: '2026-10-24'
---

# Catalog and Rip studio

## Browse the catalog

Catalog searches the hosted Metadata TCG catalog across games. Filter by game ID when needed and page through results. Review the canonical card image, set, and collector number before creating inventory.

Supply your own opening price, quantity, and actual condition. The picker supports card records; it does not cover every Metadata vertical or sealed-product SKU.

With Codex selected, ask to find a named card, then choose a specific name/set/number from the results. Search and selection use server-controlled IDs. Review the selected card in Catalog and add it yourself.

## Scan a reveal

1. Open Rip studio and explicitly share a screen/window or select a camera.
2. Choose the whole source or center crop. Hold up one card and scan.
3. Wait for Codex to transcribe the visible identity and Metadata to resolve candidates.
4. Review set and collector number, choose a raw quote variant or leave the card unpriced, then confirm.
5. Confirm another copy explicitly if it represents another physical card.

Only the selected JPEG crop goes to the local server and CLI. Temporary frame files are deleted after analysis and are not broadcast. Stop sharing ends capture tracks. Model data handling follows your account settings.

## Quotes and session history

Pack scans return set candidates rather than exact sealed SKU appraisals. The workflow does not infer grading, authenticity, pull odds, or guaranteed resale value. Quote exports retain dates, stale flags, and source records.

Auto scan reads the next reveal and pauses for review. CLI image analysis can take up to 90 seconds. The latest 200 confirmed pulls live in server memory: export before restart.

## Provider requirements

Set `METADATA_SERVICE_KEY` on the server and restart. Metadata matching and prices require a healthy authorized API. Provider failures are shown without invented sample matches. Catalog reference images load directly from HTTPS URLs returned by the live API; no card scans are bundled. Practice lots use original placeholders. Use only images you are authorized to display or record; API access does not grant artwork publication rights.

Rip Studio is a coming-soon preview, disabled by default. Enable `AUTOLOOT_RIP_STUDIO=1` and restart to use the scanning workflow above. Catalog browsing remains available without this flag.
