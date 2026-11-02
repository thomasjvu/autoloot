# SQLite storage and recovery

Autoloot now uses Node's built-in SQLite module (Node 22.16+). This is a production-oriented **single-host, single-writer** foundation, not a claim of infallibility or production certification.

## What is persisted

`.data/autoloot.sqlite` contains a revisioned workspace document plus relational inventory, order, processed-payment and NFT-delivery indexes. SQLite constraints enforce nonnegative inventory, positive prices/amounts, unique order numbers, checkout IDs, NFT inventory assets and per-asset transfer receipts. Workspace and indexes commit in one transaction. The workspace document still contains the broader state machine; this is not yet a fully normalized, independently concurrent entity repository.

SQLite WAL mode, `synchronous=FULL`, revision checks and a separate `runtime.sqlite` writer-ownership record protect local commits and prevent two app processes from using stale in-memory state against one data directory. A dead process's lock can be recovered after its PID is no longer alive. Another live writer is rejected, even on a different port. These guarantees depend on a correctly functioning local filesystem, SQLite and the host; do not use this on shared/network storage or deploy replicas against the same files.

If persistence fails, the engine restores its last committed in-memory snapshot and halts. Sales/API operations fail closed until the operator recovers/restarts. Twitch chat does not continue accepting bids while halted. Restart pauses active auctions/runs. `/api/health` reports a minimal status without buyer data. Settings shows the SQLite revision/health.

## Canonical storage

SQLite is the only state source. Fresh installations create the current schema directly; unsupported schema versions fail startup. There is no JSON import path or legacy schema upgrade shim. Images and locally configured Twitch application credentials remain separate files. Sessions persist in SQLite under SHA-256 token digests with expiry and revocation; bearer tokens are not stored in plaintext. Workspace content is checked against its committed digest on startup (corruption detection, not tamper resistance against an OS administrator).

## Backups and restore

The server creates an integrity-checked local database backup at startup and every 60 minutes by default. It publishes only a completed backup filename after verification and retains the most recent 24 automatically managed backups. Configure `AUTOLOOT_BACKUP_MINUTES` and `AUTOLOOT_BACKUP_KEEP`. Manual and pre-restore backups are not pruned by that retention rule. Backup failures are exposed in storage status; add external alerting before unattended use.

- `npm run storage:check`: read-only integrity/schema check and counts.
- `npm run storage:backup -- /absolute/new-backup.sqlite`: consistent online SQLite backup, safe while the writer is running. Omitting the filename creates a uniquely named local backup.
- `npm run storage:restore -- /absolute/backup.sqlite`: offline restore; refuses while a writer is alive, verifies the backup, preserves the prior database as a pre-restore backup and installs the restored file. Restore uploaded images separately.

Published backups use rollback-journal mode and are self-contained verified SQLite files. Startup, backup, restore and command-line checks validate the workspace commit digest as well as SQLite integrity. Use SQLite's backup mechanism rather than copying only a live database file and forgetting its WAL. Keep encrypted off-site backups of both database and uploads, and test a full restore regularly. Local automatic backups do not protect against loss of the whole disk, theft or host compromise.

## Security boundaries still requiring operations work

Database files use mode 0600 and newly created data directories use 0700. This is filesystem access control, **not encryption**. Anyone who controls the OS account/root can read or modify the database and application. Configure full-disk/encrypted-volume storage, an appropriately restricted OS/service account, secret management, updates and external monitoring. Keep `.data`, its backups and credentials out of source control and public static hosting.

The creator bootstrap remains localhost-only; there is no hosted admin identity, multi-tenant isolation yet. Buyer sessions persist across restart; Twitch access/refresh tokens remain in memory and the streamer reconnects after restart. Uploaded assets, external services, wallet custody/signing, tax/dispute procedures and eligibility/retention requirements have their own controls. Signer private keys must stay outside the browser and preferably outside this server in a constrained wallet service.

## Verification boundary

Tests exercise session persistence/expiry/revocation, a second writer, constraint rollback and engine halt, online backup, offline restore and SIGKILL/WAL recovery. Other HTTP tests exercise order/runner persistence across process restart. They do not establish behavior under every hardware/filesystem failure, large production load or adversarial compromise. A transactional snapshot write can still become expensive as history grows; load testing and an incremental entity repository are needed before scaling.
