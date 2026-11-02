---
lastUpdated: '2026-10-24'
---

# Troubleshooting

| Symptom                            | Check and recovery                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| Dashboard says open at localhost   | Open the creator UI using localhost; public hosts cannot bootstrap creator access                   |
| Admin session expired              | Reload the local dashboard after server restart                                                     |
| Twitch is unconfigured             | Save the app ID/secret locally or set environment values and restart                                |
| Twitch callback fails              | Match the callback URL, port, and public URL to the registered Twitch redirect                      |
| Live auction will not start/resume | Reconnect Twitch and verify stock and workspace mode                                                |
| Bid rejected                       | Check registration, blocked status, increment, leader identity, and deadline                        |
| Buy-now unavailable                | Confirm listing, price, stock, no active auction on the item, and live Checkout configuration       |
| Payment stays processing           | Inspect Stripe event forwarding and signatures; browser return alone cannot settle payment          |
| Reserved stock remains held        | Review pending orders without checkout and cancel abandoned reservations                            |
| Codex request fails                | Verify the local CLI executable and authentication, selected provider, and image/model availability |
| Metadata matching unavailable      | Check server credential and provider health; no sample fallback is supplied                         |
| Overlay is silent                  | Enable voice, interact with the source, check installed voices, and test OBS audio routing          |
| Saved data cannot be read          | Stop and restore a valid backup; do not overwrite private order data                                |

## Useful verification commands

From the app root, run `npm run check`, `npm test`, and `npm run demo:check`. The demo check uses disposable data and simulated payment. Provider credentials are not needed for that flow.

A restart changes the creator capability and clears login sessions, active proposals, and Rip history. Auctions restart paused. Export Rip pulls before restart and reconnect Twitch afterward.
