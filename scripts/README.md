# Repository commands

Use root npm scripts as the stable public command interface.

| Directory | Responsibility |
| --- | --- |
| `build/` | Wallet bundle and Papers documentation builds |
| `check/` | Module checks, HTTP/demo rehearsals, Worker and container checks |
| `deploy/` | Worker production preflight/deploy and secret injection |
| `maintenance/` | Database integrity, backups and restore |
| `runtime/` | Container startup, companion bridge and local vision adapter |

Only `runtime/` is copied into the production Node image. Creative tools belong
in `creative/`, not in the application image. The wallet build helper is copied
only into the Docker build stage.
