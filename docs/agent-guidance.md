---
lastUpdated: '2026-10-24'
---

# Agent guidance

## Understand the app first

Read the introduction, architecture, configuration, and HTTP API pages before modifying Autoloot. Use `/llms.txt`, `/llms-full.txt`, and `/agents.json` for machine-readable discovery.

## Preserve commerce authority

Keep winners, inventory reservations, order ownership, and payment state under server validation. Browser redirects and model replies cannot establish a successful payment. Do not publish private data, session tokens, shipping details, or provider secrets.

## Verify changes

Run the relevant tests in `tests/`, `npm run check`, and the disposable `npm run demo:check` for commerce changes. For docs changes, update Markdown and navigation sources, rebuild, and run docs checks. Do not claim live provider verification from mocked fixtures.
