---
lastUpdated: '2026-10-24'
---

# Twitch

## Configure the server application

1. Create a server application in the Twitch developer console.
2. Register `http://localhost:4173/auth/twitch/callback` for local development, adjusting the port if needed.
3. Set `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` in `.env`, then restart. The local setup screen can also save the app credentials.
4. Open Connections on the local creator dashboard and connect as the broadcaster.

Autoloot requests `user:read:chat` and `user:write:chat` and sends announcements as the broadcaster.

## Bring viewers in

Use an HTTPS tunnel for remote buyers. Set `PUBLIC_URL`, add its matching `/auth/twitch/callback` redirect to the Twitch app, and preserve the external Host header. Keep the creator dashboard on localhost. Share `<PUBLIC_URL>/shop` and ask buyers to sign in before bidding.

Switch to Live mode when connected. Shared-chat messages originating from other channels cannot buy inventory.

## Chat commands

| Command      | Purpose                                      |
| ------------ | -------------------------------------------- |
| `!bid 25.00` | Bid a decimal USD amount on the active lot   |
| `!register`  | Get the buyer registration link              |
| `!lot`       | Ask for the current lot                      |
| `!vote 1`    | Pick an option in the current next-drop vote |

## Reconnect after interruption

Broadcaster OAuth tokens are memory-only; reconnect the channel after restart. Buyer sessions persist in SQLite with hashed tokens, expiry and revocation. Saved app credentials and registered buyer IDs persist. A chat disconnect pauses bidding. Reconnect and explicitly resume; missed chat is not replayed.
