# Runtime authenticity audit — October 27, 2026

## Fixed

- Startup sample inventory (`AUTOLOOT_DEMO=1`) now carries `practiceOnly`, matching samples loaded from Settings. Live auction/purchase guards and mode switching reject it.
- Scripted companion responses moved out of the real Codex module into `practice-companion.mjs`. Offline is no longer treated as an implicit scripted provider, even in practice mode.
- The companion menu no longer reports online merely because Codex was selected. Green requires an actual successful request; this is last-success evidence, not a continuous provider health probe.
- Clearing samples checks explicit practice ownership or exact legacy seed identity. It no longer deletes arbitrary products solely because their IDs are p1–p4.

## Intentional simulations retained

Settings practice mode, simulated payments/NFT delivery, demo chat and fixture-backed automated tests remain explicit rehearsal tools. They are not production provider implementations. Test dependencies inject HTTP/signing/provider fixtures to exercise failures without spending money or accessing real accounts.

## Limits not disguised as production verification

Real Stripe webhooks/checkout/refunds, Twitch account and reward delivery, Metadata availability, OBS audio, carrier label purchases and blockchain signer delivery require real-service rehearsal. Passing local tests is not evidence those accounts are configured. Provider failures must remain errors; vision does not silently fall back to another paid provider.

Keep recovery compatibility for existing paid orders and database migration paths: removing historical records or payment provenance handling is not cosmetic cleanup. No live data was deleted by this audit.
