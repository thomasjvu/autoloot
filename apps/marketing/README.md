# Autoloot marketing site

Independent static Cloudflare Pages target. Source: index.html and styles.css. It does not load workspace CSS/JavaScript, call its APIs, share login state or need the Node server to serve marketing pages. Shared brand illustrations, service marks and licensed fonts are copied by an explicit build whitelist.

Cloudflare Pages configuration (repository root):

- Build command: `npm run marketing:build`
- Build output directory: `apps/marketing/dist`
- Environment: `WORKSPACE_URL=https://YOUR_WORKSPACE_ORIGIN`

Locally the link defaults to http://localhost:4173. On Pages, an explicit WORKSPACE_URL is required. This is a public link only; never put credentials in it. Set it to the intended workspace entry/install destination. Existing Help/Terms/Privacy links currently point to that workspace's pages, so review them before publishing for a wider audience.

Build with `npm run marketing:build`, then preview the output with any static HTTP server. Deploy only apps/marketing/dist, never the repository or public/ workspace directory. There are no Pages Functions, bindings or secrets. Cloudflare account/domain provisioning and deployment have not been performed.

Official configuration reference: https://developers.cloudflare.com/pages/configuration/build-configuration/

## Local development

Run `npm run marketing:dev` from the repository root, then open http://localhost:4174. Source HTML/CSS changes rebuild when you refresh. The workspace remains on 4173. Set `MARKETING_PORT` to override the preview port and `WORKSPACE_URL` to change the workspace link. The preview binds only to loopback. Use `npm run marketing:build` for deployable static output.

Set `NEWSLETTER_URL` to the Beehiiv publication's HTTPS hosted subscribe page when ready. Builds without it display “Newsletter coming soon” and collect no email addresses. With it, Subscribe opens Beehiiv directly; no tracking script, embedded form or app-side email database is added. Rebuild/restart preview after changing environment variables. Pricing presents free open-source software and an unpriced Business plan coming soon.

Footer social profiles are configured with `TWITCH_URL`, `YOUTUBE_URL` and `X_URL` (HTTPS URLs on the corresponding platform). Unset profiles show noninteractive coming-soon items; no placeholder links are published. Rebuild after setting them.
