# CF Demo Home

Welcome to my personal home of Cloudflare solution demos, built with on Cloudflare Workers and Astro.

This repository is a collection of interactive demos and examples showcasing the capabilities and use cases of Cloudflare solutions — from application security and performance to the developer platform.

## Available Demos

All demos are listed in [`public/demos.json`](/public/demos.json). Demos may link to internal Astro pages or external demo URLs.

| Category | Demo |
| :--- | :--- |
| Application Security | WAF, SSL/TLS, DNSSEC |
| Application Performance | Image Optimization, Waiting Room |
| Developer Platform | Workers, R2 Object Storage, Stream |
| Platform | Resilience Matrix, Turnstile, DLS, Onboarding Guide, and more |

## Architecture

This project is a server-side rendered (SSR) Astro application deployed on **Cloudflare Workers** with **Static Assets**.

- **Framework**: [Astro](https://astro.build) with the [`@astrojs/cloudflare`](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) adapter
- **Runtime**: Cloudflare Workers (SSR entrypoint via `@astrojs/cloudflare/entrypoints/server`)
- **Static Assets**: Served via the `ASSETS` binding with `not_found_handling: "404-page"`
- **Observability**: Workers Logs enabled with 100% head sampling rate

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
│   └── pages/
│       ├── index.astro                          # Homepage — filterable demo grid
│       ├── 404.astro                            # 404 Not Found error page
│       └── demos/
│           ├── performance/
│           │   ├── dnssec.astro
│           │   ├── image-optimization.astro
│           │   └── waiting-room.astro
│           ├── security/
│           │   ├── ssl-tls.astro
│           │   └── waf.astro
│           └── serverless/
│               ├── r2.astro
│               ├── stream.astro
│               └── workers.astro
├── astro.config.mjs
├── wrangler.jsonc          # Cloudflare Workers configuration
└── package.json
```

## Commands

All commands run from the project root:

| Command | Action |
| :--- | :--- |
| `npm install` | Install dependencies |
| `npm run dev` | Start Astro dev server at `localhost:4321` (fast, no Workers runtime) |
| `npm run build` | Build Astro project for production to `./dist/` |
| `npm run preview` | Preview the production build locally |
| `npx wrangler check` | Validate `wrangler.jsonc` before deploying |
| `npx wrangler types` | Regenerate `worker-configuration.d.ts` from `wrangler.jsonc` |
| `npx wrangler dev` | Run locally with the Workers runtime (auto-runs `npm run build` first) |
| `npx wrangler deploy` | Build and deploy to Cloudflare Workers (auto-runs `npm run build` first) |
| `npx wrangler deploy --dry-run` | Validate the deploy bundle without publishing |
| `npx wrangler tail` | Stream live production logs |
| `npx wrangler rollback` | Roll back to the previous deployed version |

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
