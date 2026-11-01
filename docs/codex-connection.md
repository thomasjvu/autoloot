# Connect Codex

Open **Companion → Connect Codex** in your local administrator dashboard.

- If Codex is already signed in on this computer, choose **Use this account**.
- Otherwise choose **Sign in with ChatGPT**, then **Continue to OpenAI**. Complete sign-in in the OpenAI tab and return to Autoloot. The dialog checks completion and selects Codex automatically.
- To use API billing instead, open **Use an API key instead** and enter your OpenAI API key. Codex stores it using its credential configuration on this computer. Autoloot does not save it in workspace data, send it to buyers, or echo it in status responses. API account billing applies.

The Codex CLI must be installed on the machine running Autoloot. If the dialog reports it missing, install/update with `npm install -g @openai/codex`, then retry. Existing `CODEX_BIN` and `CODEX_HOME` settings still apply, as do the runtime's configured API/authentication environment variables. If those variables manage authentication, update them on the server rather than expecting a different CLI sign-in to override them.

Autoloot uses Codex's app-server authentication protocol for setup and its existing restricted `codex exec` path for cohost requests. Sign-in success confirms an account, not remaining quota or a successful model request. The companion's online indicator still requires a successful cohost response. Authentication changes use the same local Codex credentials as other Codex clients; API-key login can replace that shared sign-in. The UI's **Disconnect** disables the Autoloot companion and cancels pending sign-in; it does not globally log out the Codex CLI or desktop app.

Connection endpoints are local administrator commands requiring the admin session and dashboard capability. Sign-in links are restricted to OpenAI's authentication origin, raw provider errors are redacted, and status responses omit email, tokens and keys. Pending sign-in is cancelled after ten minutes. Closing the dialog stops browser polling; cancel explicitly to end sign-in immediately. Server shutdown stops the auth sidecar. No model thread or tool execution is started by the connection check.

For environments where the browser callback is unavailable, run `codex login --device-auth` on the Autoloot machine, finish the documented device flow, then use **Connect Codex → Use this account**. Third-party hosted/multi-user account linking is outside this local setup.

Official references: [Codex authentication](https://learn.chatgpt.com/docs/auth), [Codex app-server authentication](https://learn.chatgpt.com/docs/app-server).
