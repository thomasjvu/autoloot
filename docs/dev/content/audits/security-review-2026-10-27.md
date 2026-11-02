# Security verification — October 27, 2026

Scope: current local-first single-streamer app, admin setup/session boundaries, buyer identity, server-priced checkout, stock reservations, paid fulfillment and OAuth. This is source/fixture/HTTP verification, not external penetration testing or live-provider certification.

## Changes

- Expired/revoked administrator sessions close their private SSE streams on broadcast, drain or keepalive. Streams no longer retain authorization for their whole connection lifetime.
- Administrator sessions are bounded and expire after twelve hours; session tokens are stored hashed in process memory. Password storage uses salted scrypt. Server restart clears sessions.
- Added an explicit browser permissions policy disabling microphone/geolocation and restricting camera to the same origin.
- HTTP/demo test clients now create or authenticate an administrator through the real setup/login endpoints. No production authentication bypass was introduced.

## Verified boundaries

Dedicated HTTP tests reject cross-origin initial setup, duplicate setup, unauthenticated bootstrap, token-only mutations and reuse after logout. Public shop/state remains accessible without leaking orders or audit records. Password tests cover hashing, failed-login throttling and expiry.

Commerce regression coverage validates checkout/order identity, exact amount/currency/environment, idempotent payment/refund processing, stock reservation boundaries, buyer ownership, refund holds, live fulfillment payment evidence, and separation of practice delivery from live signing/shipping. OAuth tests retain browser nonce binding and restricted streamer handoff. No frontend amount is treated as payment evidence.

## Remaining operational requirements

Keep the administrator on localhost; do not expose its bootstrap/setup via reverse proxy. Anyone with local machine/filesystem control can replace the admin credential file and is outside this boundary. Initial setup must be performed on the trusted local machine. Use a public HTTPS buyer origin, explicit trusted proxy settings and private secret storage. Password change/recovery UI, multi-user access and continuous provider health are not implemented.

Real Twitch/Stripe/Shippo/NFT requests, live account configuration, OBS behavior, load tests, independent penetration testing and deployment-specific headers/TLS remain separate verification gates. Signed fixture tests do not prove a real account is correctly configured. Restore procedures and off-site encrypted backups must be rehearsed. See live-rehearsal.md and production-audit.md.
