# Maintenance review — October 30, 2026

Scope: source review of HTTP policy, administrator authentication, buyer/order handling, media/static routes, module ownership and operational documentation. Automated checks use disposable data and provider fixtures.

## Changes

- Static serving returns 404 for directories and uses own-property lookup for legal routes. Requests such as `/styles/` and `/constructor` no longer reach invalid file reads. Legal pages support HEAD consistently.
- The repository operator skill now requires administrator setup/login, a retained session cookie and the dashboard capability. Architecture guidance documents password sessions, logout and restart behavior.
- Added HTTP regression coverage for static directory/prototype paths and legal-page HEAD responses.

## Assessment

Keep the existing composition root, common HTTP policy and domain command boundaries. Routes depend on explicit services; Engine, Payments and Shipping own authoritative transitions. Broad restructuring would add risk without resolving a demonstrated defect in this review.

The reviewed paths retain local-only administrator access, session plus capability authentication, origin checks, request/body limits, buyer ownership checks and server-priced payment verification. These controls reduce manipulation risk; this review is not a guarantee that every attack path has been excluded. A user controlling the local filesystem remains outside the administrator security boundary.

## Validation and remaining work

Run `npm run check`, `npm test` and `npm run demo:check` for the implementation. Relative file links resolve across all 64 tracked Markdown files; external links and section anchors were not checked. The optional ignored Papers checkout is not the portable documentation source.

Browser visual/accessibility review, real provider account rehearsal, deployment/TLS validation and independent penetration/load testing remain release work. Use [release rehearsal](live-rehearsal.md) and [production verification](production-audit.md). This pass does not certify rendered UI polish or live integrations.
