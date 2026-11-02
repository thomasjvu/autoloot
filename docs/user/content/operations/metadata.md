# Metadata catalog access

The authenticated local `GET /api/metadata/status` endpoint reports the running
mode, source and whether a key is configured; it never returns the key. Startup
logs also name the active mode. Changes to `.env` require a server restart;
Infisical values are not automatically injected into an already running process.
If an old access error remains in an open page, reload and repeat the search.

Catalog search and rip identification use a bounded demo snapshot without API credentials. It contains identity data only, with no market guides or card artwork. See `data/metadata-demo/` for provenance and notices. Sellers enter price, quantity and condition manually. Vision needs its own provider.

Set `METADATA_MODE` in the server environment:

- `auto` (default): demo without a service key; hosted API with one.
- `demo`: bundled snapshot, even with a key installed.
- `api`: hosted API; access failures remain errors with no fallback.

Catalog shows the active source. The bundled sample has 34 Japanese CP1 Pokémon cards and one set; search with Japanese names or collector numbers, or browse with an empty query. Empty demo searches only mean the card is outside this snapshot. Demo search and selection make no network requests.

For full access, set `METADATA_API_URL=https://metadata.fyi`, `METADATA_SERVICE_KEY` and `METADATA_MODE=api`, then restart. Use separate development and production credentials scoped to `tcg`, without operational privileges. Track expiry and daily quotas. The proxy sends `X-Metadata-Service-Key` and `X-Metadata-Vertical: tcg`; the browser and companion never receive the key.

Local startup loads ignored `.env`; keep it mode 0600. The bundled systemd service reads `/etc/autoloot.env`: install production values through the host's private secret workflow, restrict file access and restart `autoloot.service`. Do not reuse development credentials in production or commit keys. Verify a real search and selection after installation. Demo tests do not verify hosted access, credit or quote availability.

The provisioned keys expire January 30, 2027. Each allows 300 requests/minute and 50,000 daily units. See [service access and rotation](https://github.com/thomasjvu/autoloot/blob/main/data/metadata-demo/SERVICE-ACCESS.md) for installation and renewal. Re-minting the same Metadata account ID invalidates the old key immediately, so coordinate replacement with the consuming server.
