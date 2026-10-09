# AGENTS.md

## Project

Astro + TypeScript demos deployed on Cloudflare Workers with Static Assets at `https://automatic-demo.com`. Read `README.md` for setup and demo details.

- `src/worker.ts`: custom entrypoint, Astro delegation, and Durable Object export.
- `src/pages/`: pages and API endpoints; `src/lib/`: modular demo logic.
- `public/`: static assets and `demos.json`; reuse `src/layouts/DemoLayout.astro` for demo pages.
- `wrangler.jsonc`: bindings, migrations, routing, and observability.

## Cloudflare Target

- Account: **DavidT ENT** — `eb72da6777f630a3116117a141717763`.
- Zone: **automatic-demo.com** — `2bb1a91e4cde44fe323f5bac5e84b569`.

## MCP Servers

| Server | Use |
| :--- | :--- |
| `cloudflare-api` (standalone) | Cloudflare REST reads **and writes**. Search endpoint schemas before executing; read back changes to verify them. |
| `chrome-devtools` | Verify public UI, network responses, and console behavior; use the `web-perf` skill for performance reviews. |
| `cloudflare-docs` (standalone) | Documentation fallback and the Pages-to-Workers migration guide. |
| `cloudflare-blog` | Product announcements and background context. |

Use `cf-portal`'s `portal_list_servers` for current integration availability; its API proxy may be disabled while standalone `cloudflare-api` remains available.

## Development Standards

- Review [Workers Best Practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/) before Worker changes; use the `workers-best-practices` and `wrangler` skills.
- Default to TypeScript and separate major features into modules. Prefer bindings over REST inside Workers; stream large bodies and await promises or use `ctx.waitUntil()`.
- Keep bindings, Durable Object exports/migrations, and **all dynamic routes** in `assets.run_worker_first` consistent with the implementation.
- Use secrets for credentials, structured logs for failures, and no request-scoped mutable global state.
- Preserve the Client-Side Security demo's synthetic data, iframe sandbox/CSP, and per-run authorization. Confirm a fetched baseline before publishing; browser execution alone does not prove classification or alert delivery.
- Update the demo catalog and sitemap when adding demos. Preserve existing user changes and keep README updates concise.

## Commands

- Develop: `npm run dev`; build: `npm run build`.
- Validate code changes as appropriate: `npm test`, `npm run test:worker`, `npx --no-install tsc --noEmit`.
- After binding changes: `npm run generate-types`; do not manually edit generated types or `dist/`.
- Validate deployment: `npm run build && npx wrangler deploy --dry-run`.
- Deploy: `npm run deploy` (builds first); inspect production logs with `npx wrangler tail`.
