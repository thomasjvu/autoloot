# Autoloot marketing site

Independent static Cloudflare Pages target. Source: index.html and styles.css. It does not load workspace CSS/JavaScript, call its APIs, share login state or need the Node server to serve marketing pages. Shared brand illustrations, service marks and licensed fonts are copied by an explicit build whitelist.

Cloudflare Pages configuration (repository root):

- Build command: `npm run marketing:build`
- Build output directory: `marketing/dist`
- Environment: `WORKSPACE_URL=https://YOUR_WORKSPACE_ORIGIN`

Locally the link defaults to http://localhost:4173. On Pages, an explicit WORKSPACE_URL is required. This is a public link only; never put credentials in it. Set it to the intended workspace entry/install destination. Existing Help/Terms/Privacy links currently point to that workspace's pages, so review them before publishing for a wider audience.

Build with `npm run marketing:build`, then preview the output with any static HTTP server. Deploy only marketing/dist, never the repository or public/ workspace directory. There are no Pages Functions, bindings or secrets. Cloudflare account/domain provisioning and deployment have not been performed.

Official configuration reference: https://developers.cloudflare.com/pages/configuration/build-configuration/
