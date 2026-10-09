# CF Demo Home

Welcome to my personal home of Cloudflare solution demos, built with Astro and Cloudflare Workers.

This repository is a collection of interactive demos and examples showcasing the capabilities and use cases of Cloudflare solutions — from application security and performance to the developer platform.

## Available Demos

All demos are listed in [`public/demos.json`](/public/demos.json). Demos may link to internal Astro pages or external demo URLs.

| Category | Demo |
| :--- | :--- |
| Application Security | Client-Side Security, WAF, SSL/TLS, DNSSEC |
| Application Performance | Image Optimization, Waiting Room |
| Developer Platform | Workers, R2 Object Storage, Stream |
| Platform | Resilience Matrix, Turnstile, DLS, Onboarding Guide, and more |

## Architecture

This Astro application is deployed on **Cloudflare Workers** with **Static Assets**. Prerendered pages and other files are served as static assets; dynamic Astro endpoints run in the Worker.

- **Framework**: [Astro](https://astro.build) with the [`@astrojs/cloudflare`](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) adapter
- **Runtime**: `src/worker.ts` serves the isolated sandbox, delegates other dynamic requests to Astro, and exports the demo Durable Object.
- **Static Assets**: Served through `ASSETS`, with a custom `404.html`. All dynamic routes are explicitly listed in `assets.run_worker_first`; paths outside that list go directly to assets.
- **Client-Side Security demo**: Uses `BROWSER`, `BROWSER_RUN_LIMITER`, and SQLite-backed `CLIENT_SIDE_SECURITY_RUNS` Durable Objects
- **Observability**: Workers Logs enabled with 100% head sampling rate

## Client-Side Security demo

The [Client-Side Security demo](https://automatic-demo.com/demos/security/client-side-security/?pageshieldforcecsp) has three actions, each making four managed Chrome visits:

1. **Collect new baseline** creates an isolated run at `/demos/security/client-side-security-change-test.js?run=<run-id>`.
2. Wait for Cloudflare to fetch that baseline, confirm the checkbox, then **publish changed code** at the same URL. The changed script sends fixed synthetic checkout values to `cf-testing.com`.
3. Optionally **load the hosted skimmer fixture** in an isolated iframe to exercise classification.

SQLite-backed Durable Objects retain runs for seven days. Publishing is authorized by a hashed control token kept in the initiating tab's session storage. Runs only move from baseline to changed; creating a new baseline cannot reset an old scanner URL. Script responses are `no-store` and do not depend on Referer or cookies.

The sandbox document is `/_astro/client-side-security/sample`; its [pinned Sanguine Security fixture](https://gist.githubusercontent.com/gwillem/5d936f5a84837d5c1dcb488ce256294a/raw/94d96dbd2a81a3d4a78740517f5a04d46d3901b2/decoded.js) is `/_astro/client-side-security/skimmer-test.js`. Both use the existing Precursor asset exclusion. The fixture has JavaScript MIME, anonymous CORS, and `no-store`. It runs with `sandbox="allow-scripts"`, synthetic read-only fields, and an enforced CSP blocking external exfiltration, forms, images, and nested frames.

The POST API is `/api/client-side-security/browser-run`: production-origin-only, validated fields, a 256-byte streamed body limit, and one action per 10 seconds per client. Local tests simulate Durable Objects; Browser Run requires a remote binding or production deployment.

Every demo-page visit also loads `https://client-side-security.davebuilds.net/script.js`. It listens for input events and posts identifiers and metadata, never values, to `/api/demo-exfil`. This production-origin-only endpoint returns 204 and discards the body without reading, logging, or storing it. The outer page uses report-only CSP; repeated browser visits may be needed for dashboard visibility.

### Cloudflare monitoring setup

- Enable Client-Side Security monitoring and connection URL-path tracking. Code-change and malicious-script classification require **Advanced**.
- Two enabled **Log** rules were configured through `POST /zones/{zone_id}/page_shield/policies`. Both match only `automatic-demo.com`'s demo and sandbox document paths, with or without a trailing slash. Log rules are unsampled and do not block execution:
  - Collection (`56a7d5536781428aa2baad6313a3d67f`): `script-src 'unsafe-inline' 'unsafe-eval'; connect-src 'none'`.
  - Expected resources for scoped alerts (`0f8126f8dd374122aa6dd83b7ba1a563`): `script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://cf-testing.com https://www.cf-testing.com https://csp-reporting.cloudflare.com`.
- Inspect all resource statuses with `status=active,infrequent,inactive&exclude_duplicates=false`. Wait for a fetched baseline hash/version before publishing. Malicious-resource alerts require Active resources.
- The UI distinguishes execution, script-reporting headers, and report forwarding. Supplementary forwarding uses actual violation events only with a configured same-origin collector. Cross-origin collectors and opaque sandbox frames use native reporting; `native-only` and `unconfirmed` do not establish delivery. Advanced customers can select [Same hostname reporting](https://developers.cloudflare.com/client-side-security/reference/settings/#reporting-endpoint), with `/cdn-cgi/*` excluded from custom and rate-limiting rules. Verify inventory, classification, and notification history separately.

### Live verification — October 6, 2026

- Baseline, changed, and hosted-fixture actions returned **HTTP 200 JSON** with successful browser execution. Anonymous scanner requests retained the changed version after deployment; invalid control tokens returned 403. Clicking the fixture checkout confirmed its external request was blocked by CSP.
- The Cloudflare API confirmed the SQLite namespace, exported `ClientSideSecurityRun` class, migration, Browser Run binding, limiter, and Worker-first routes.
- API writes and read-back confirmed both new Log rules. Live responses include their report-only headers, and managed Chrome confirmed script and connection reporting with a successful hosted-fixture run. The evidence parser handles Browser Run's newline-joined repeated headers as well as Fetch's comma-joined headers.
- Five zone-filtered alert policies are enabled. Notification history records earlier new-resource and new-host email/webhook sends for the demo's same-origin connection. Fresh per-run versions, fixture classification, and code-change alerts are **not verified**; the new baseline remains unpublished while waiting for a fetched version. The cross-origin collector uses native reporting without supplementary CORS requests.

References: [Monitoring](https://developers.cloudflare.com/client-side-security/how-it-works/), [Scoped alerts](https://developers.cloudflare.com/client-side-security/alerts/#scoped-alerts), [Code changes](https://developers.cloudflare.com/client-side-security/detection/review-changed-scripts/), and [internal demo guide](https://wiki.cfdata.org/spaces/SOLUTIONS/blog/2024/01/29/815235815/Page+Shield+demo+from+Start+to+Finish).

### Third-party script deployment verification

- Version `e8718d95-72a4-4f09-8605-8d9cb6ef8062` serves the new script tag with no blocking outer-page CSP. The external script returns JavaScript with HTTP 200; its same-origin sink returns 204 and rejects cross-origin requests with 403.
- Production baseline and sandboxed-fixture actions each completed four managed Chrome visits with script- and connection-reporting headers. The new baseline remains unpublished pending its fetched version.
- Cloudflare's inventory records the third-party script as **Infrequent**; inspect **View all scripts**. Its fetched versions, classification, and notification delivery are not yet verified. Chrome DevTools MCP was unavailable for visual review.

### Precursor configuration

The live **max-security** rule excludes the demo document, APIs, dynamic script, and `/_astro/` (including the sandbox and fixture). The zone default remains `min-friction`:

```text
(http.host eq "automatic-demo.com" and not (
  http.request.uri.path in {
    "/demos/security/client-side-security"
    "/demos/security/client-side-security/"
    "/api/client-side-security/browser-run"
    "/api/demo-exfil"
    "/demos/security/client-side-security-change-test.js"
  }
  or starts_with(http.request.uri.path, "/_astro/")
))
```

## Project Layout

| Path | Purpose |
| :--- | :--- |
| `public/` | Demo catalog, images, sitemap, headers, and static fixture |
| `src/pages/` | Astro pages and dynamic API/script endpoints |
| `src/components/`, `src/layouts/` | Shared UI and layouts |
| `src/lib/client-side-security/` | Run state, script versions, browser controls/evidence, response parsing, sandbox, and CSP forwarding |
| `src/worker.ts` | Worker entrypoint and Durable Object export |
| `tests/` | Evidence, authorization/isolation, and built-Worker routing regressions |
| `wrangler.jsonc` | Bindings, migrations, custom domain, and asset routing |
| `worker-configuration.d.ts` | Generated Cloudflare runtime/binding types |

## Commands

All commands run from the project root:

| Command | Action |
| :--- | :--- |
| `npm install` | Install dependencies, including the project-local Wrangler CLI |
| `npm run dev` | Start Astro's development server at `localhost:4321` |
| `npm run build` | Build Astro project for production to `./dist/` |
| `npm test` | Run evidence, response-handling, sample-race, and Durable Object regressions |
| `npm run test:worker` | Build and test real Worker/asset routing locally |
| `npm run preview` | Preview the production build locally |
| `npm install -D wrangler@latest` | Update the project-local Wrangler CLI to the latest release |
| `npm run generate-types` | Regenerate `worker-configuration.d.ts` from `wrangler.jsonc` |
| `npm run build && npx wrangler dev` | Build, then run the built Worker locally |
| `npm run build && npx wrangler deploy --dry-run` | Build and validate the deployment bundle without publishing |
| `npm run deploy` | Build and deploy to Cloudflare Workers |
| `npm run build && npx wrangler deploy` | Build, then deploy directly with Wrangler |
| `npx wrangler tail` | Stream live production logs |
| `npx wrangler rollback [VERSION_ID]` | Roll back to the previous or specified deployed version |

## Contributing

Contributions are welcome. To add or update a demo:

1. Fork the repository and create a new branch.
2. Add a new entry to `public/demos.json` with `id`, `title`, `description`, `url`, `category`, and `labels`.
3. If the demo has its own page, create a new `.astro` file under `src/pages/demos/` using `DemoLayout.astro`.
4. Add any relevant screenshots to the appropriate `public/demos/<category>/img/` folder.
5. Update `public/sitemap.xml` with the new page URL.
6. Submit a pull request with a clear description of the changes.

---

## Disclaimer

This is an **unofficial** demonstration website and is **not affiliated with or endorsed by Cloudflare**. All product names, logos, and brands are property of their respective owners. This site is for **informational and educational purposes only** and comes with no warranty or guarantee of accuracy.
