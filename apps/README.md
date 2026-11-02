# Applications

`marketing/` owns the standalone static marketing site, its preview server and
its build configuration. Use `npm run marketing:dev` or `npm run marketing:build`
from the repository root. Only `marketing/dist/` is deployed for that site.

The commerce application still starts at root `server.mjs`, serves `public/`,
and shares `lib/` with the Cloudflare adapter. Those are kept together for now;
moving that runtime into `apps/` would require a separate deployment migration.

Creative drafts and submission artwork belong in `../creative/marketing/`.
