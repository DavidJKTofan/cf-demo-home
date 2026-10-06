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
- **Runtime**: Cloudflare Workers (entrypoint via `@astrojs/cloudflare/entrypoints/server`)
- **Static Assets**: Served through the `ASSETS` binding; unmatched asset requests use the nearest `404.html`
- **Client-Side Security demo**: Uses the `BROWSER` Browser Run binding and a `BROWSER_RUN_LIMITER` rate-limit binding
- **Observability**: Workers Logs enabled with 100% head sampling rate

## Client-Side Security demo

The [Client-Side Security demo](https://automatic-demo.com/demos/security/client-side-security) offers a repeatable Browser Run sequence: baseline script, changed script, and an optional Cloudflare test script. The changed script uses only fixed synthetic form values. Its server-side Browser Run endpoint is `src/pages/api/client-side-security/browser-run.ts`; the stable test-script endpoint is `src/pages/demos/security/client-side-security-change-test.js.ts`.

The run controls are production-origin-only. Browser Run Quick Actions require remote mode when used with `wrangler dev`; this project does not enable a remote Browser Run binding for local development.

If a Precursor Configuration Rule challenges requests on `automatic-demo.com`, excluding only the demo document is not enough for the interactive flow. Also exempt the Browser Run API, the dynamic test-script endpoint, and the built CSS under `/_astro/`. For example:

```text
(http.host eq "automatic-demo.com" and not (
  http.request.uri.path in {
    "/demos/security/client-side-security"
    "/demos/security/client-side-security/"
    "/api/client-side-security/browser-run"
    "/demos/security/client-side-security-change-test.js"
  }
  or starts_with(http.request.uri.path, "/_astro/")
))
```

## Project Layout

```text
/
├── public/
│   ├── _headers            # Custom HTTP response headers (security, caching, noindex)
│   ├── .assetsignore       # Files excluded from the static asset bundle
│   ├── demos.json          # Master list of all demos (title, description, url, category, labels)
│   ├── demos/
│   │   ├── performance/img/  # Screenshots and images for performance demos
│   │   ├── security/img/     # Screenshots and images for security demos
│   │   └── serverless/img/   # Screenshots and images for serverless demos
│   ├── favicon.ico / .png / .svg
│   ├── robots.txt
│   ├── sitemap.xml
│   └── thumbnail.png       # Open Graph / Twitter card image
├── src/
│   ├── components/
│   │   └── DemoCard.astro  # Card component rendered on the homepage grid
│   ├── layouts/
│   │   ├── Layout.astro    # Base HTML layout (meta tags, global CSS, theme)
│   │   └── DemoLayout.astro # Layout for individual demo pages (nav, header, footer)
│   ├── env.d.ts             # Astro/Cloudflare runtime type augmentation
│   └── pages/
│       ├── index.astro                          # Homepage — filterable demo grid
│       ├── 404.astro                            # 404 Not Found error page
│       ├── api/
│       │   └── client-side-security/
│       │       └── browser-run.ts                # Same-origin Browser Run API
│       └── demos/
│           ├── performance/
│           │   ├── dnssec.astro
│           │   ├── image-optimization.astro
│           │   └── waiting-room.astro
│           ├── security/
│           │   ├── client-side-security.astro
│           │   ├── client-side-security-change-test.js.ts
│           │   ├── ssl-tls.astro
│           │   └── waf.astro
│           └── serverless/
│               ├── r2.astro
│               ├── stream.astro
│               └── workers.astro
├── astro.config.mjs
├── package.json
├── package-lock.json
├── tsconfig.json
├── worker-configuration.d.ts # Generated Cloudflare binding/runtime types
└── wrangler.jsonc          # Cloudflare Workers configuration
```

## Commands

All commands run from the project root:

| Command | Action |
| :--- | :--- |
| `npm install` | Install dependencies, including the project-local Wrangler CLI |
| `npm run dev` | Start Astro's development server at `localhost:4321` |
| `npm run build` | Build Astro project for production to `./dist/` |
| `npm run preview` | Preview the production build locally |
| `npm install -D wrangler@latest` | Update the project-local Wrangler CLI to the latest release |
| `npm run generate-types` | Regenerate `worker-configuration.d.ts` from `wrangler.jsonc` |
| `npm run build && npx wrangler dev` | Build, then run the built Worker locally |
| `npm run build && npx wrangler deploy --dry-run` | Build and validate the deployment bundle without publishing |
| `npm run deploy` | Build and deploy to Cloudflare Workers |
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
