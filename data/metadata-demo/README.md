# Bounded Metadata identity demo

Failure conditions checked before export: mixed-source field drift; upstream name mismatch; missing or duplicate IDs; missing set links; artwork or price leakage; missing license notice; unexpected source license digest. The exporter stops on any mismatch rather than publishing an aggregate catalog.

This is a 34-card Japanese CP1 identity sample, not the full Metadata catalog. Canonical Metadata IDs are preserved. Only names, collector numbers, set IDs/codes/names, language, game and provenance links are exported. No descriptions, rules, rarity enrichment, prices, artwork, image URLs or official-site enrichment are included.

Every displayed name and set name is checked against pinned TCGdex TypeScript sources. Source hashes and selected IDs are recorded in provenance.json; acceptance.json records the repeatable export checks. TCGdex database text is MIT licensed; retain LICENSE-TCGdex.txt. This does not grant rights to Pokémon artwork, logos or trademarks or suggest affiliation.

Rebuild sequentially from a hydrated Metadata checkout:

    python3 data/metadata-demo/build-snapshot.py --metadata-root /Users/area/@metadata

The command fetches 36 pinned upstream text files (34 cards, set, license); it never fetches images or prices. Running the application with this bundled snapshot needs no API key or network access.
