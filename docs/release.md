# Repository and release

Primary source: https://forgejo.thomasjvu.com/phantasy/autoloot (private).

Main is the integration branch. Forgejo Actions checks syntax, tests, and the disposable shopping journey on Node 22. The workflow requires a runner with the `docker` label and outbound access to the checkout action/npm. Local credentials, show data and the separate documentation checkout are ignored.

Deployment is not configured. The current server binds to localhost and runs a local Codex CLI; a public deployment needs a deliberately chosen host, persistent storage, admin authentication, secrets, HTTPS/public callback URL, and a strategy for the local cohost process. Do not expose the streamer admin bootstrap via a public reverse proxy.

The standalone icon package lives in `packages/autoloot-icons`, under MIT. The application as a whole has no open-source license grant. Reference TCG imagery has separate provenance in `public/demo/SOURCES.md`.
