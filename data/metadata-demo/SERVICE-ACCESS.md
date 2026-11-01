# Optional full-catalog service access

Provisioned 2026-11-01: separate `svc-live-shopping-companion-dev` and
`svc-live-shopping-companion-prod` accounts on Metadata production. Both grant
only the `tcg` catalog, 300 requests/minute, 50,000 daily units, no ops privilege,
and expire 2027-01-30. Other verticals and contribution moderation were verified
403; a one-card catalog request was verified 200 for each credential.

The local ignored `.env` holds the development key and `METADATA_MODE=demo`.
The separate production key is staged in ignored mode-0600
`.data/credentials/metadata.prod.env`; the private directory is mode 0700.
Neither key belongs in browser JavaScript, a public environment prefix, Git,
logs, screenshots or a bundled demo. Metadata stores only their SHA-256 hashes.

Both credentials are also saved and read-back verified in the dedicated Infisical
`Autoloot` project (`42512b7f-c6a3-4ec9-9424-1b6ed0c25285`) at
`https://infisical.thomasjvu.com`, path `/`. Environments `dev` and `prod`
each contain `METADATA_SERVICE_KEY`, `METADATA_API_URL`, and `METADATA_MODE`.
Development keeps `demo`; production selects `api`. This project is separate
from shared coding-agent credentials. Saving secrets does not automatically
inject them into the running app; configure a deployment-scoped read identity
and startup injection when the production host is chosen.

There is no configured production deployment target for this app yet. The
production credential is provisioned and staged, not installed on an app server.
Once the target is established, transfer it through the deployment secret store
or merge those two variables into the host's protected environment file
(`/etc/autoloot.env` for the supplied systemd unit), preserving unrelated values.
Use mode 0600, choose `METADATA_MODE=api` deliberately, then restart and verify
through the authenticated server proxy. Production API URL:
`https://metadata.fyi`; header: `X-Metadata-Service-Key`; vertical header: `tcg`.
Use this app's own secret store, not Metadata's provider/operator folders.

Keep demo mode for an offline demonstration. To exercise local full access,
change only `METADATA_MODE=api` and restart. Explicit API failures must remain
visible; do not silently substitute demo data after an authentication failure.

Rotate before expiry through Metadata's operator mint command using the same
account ID and explicit `--verticals tcg --rpm 300 --daily-units 50000
--expires-days 90`. Minting that ID replaces its hash and invalidates the old key.
Capture its secret directly into the consumer's protected secret store without
terminal output. Update only the corresponding environment and verify a catalog
read and rejected non-TCG/ops requests. For emergency revocation, mark the account
`disabled: true` on Metadata's service-account file. Runtime reload behavior
should be verified against the deployed version before relying on it.
