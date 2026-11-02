---
lastUpdated: '2026-10-24'
---

# Codex companion

![Munny presents a reviewed listing and microphone controls.](/images/mochi/companion-banner.webp)

Munny supports scripted local demo replies and an optional Codex provider. Install and authenticate the official CLI on the streamer machine, then select Codex in Companion. The adapter uses the CLI's existing login; `CODEX_BIN` can point to its executable.

An optional server-side `CODEX_API_KEY` supports invocation-scoped API authentication. Autoloot does not collect a ChatGPT password or provide its own hosted subscription OAuth client.

## What the companion can do

Ask for the next lot, pause or resume an auction, or draft a product listing. Mutation proposals appear for review before Apply. The server validates stock, state, and fields again when you accept.

Catalog search and selection can run directly from a request, using server-controlled Metadata results. They do not create inventory. Review and add the selected card in Catalog.

## Photo and vision requests

[Photo to listing](/docs/streamer/inventory) retains creator-supplied price, condition, quantity, and image. [Rip studio](/docs/streamer/catalog-and-rip) transcribes visible card identity for reviewed matching. Model/image support depends on the CLI account and available model.

## Trust boundary

Codex receives product, sanitized auction, and order-status information, not shipping addresses. It runs in a temporary directory with structured output, read-only sandboxing, ignored user config, ephemeral sessions, and execution tools disabled. Provider secrets are excluded from its subprocess environment.

The companion cannot select winners, mark payments, or replace server validation. Requests are independent rather than persistent chat sessions. The UI offers optional browser speech; the avatar is original artwork rather than a Live2D or VRM rig.
