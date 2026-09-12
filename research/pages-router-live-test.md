# Live test: a Pages router in front of a Docs Version Worker

Ticket: [Prove a Pages router can serve a Docs Version's Worker on Cloudflare's free plan](https://github.com/plank/docs/issues/15)

Run on 2026-09-12 (12:15–12:30 UTC) in a personal Cloudflare account of the User's, on the Free plan, with Wrangler 4.131.1. It used `*.pages.dev` and `*.workers.dev` only. `packages.plank.co` and Namecheap weren't touched. Everything deployed was deleted afterwards. The harness is in `live-test/` on this branch.

## Setup

- **Docs Version Worker** `docs-test-snapshots-13x`: static files only, no script (`live-test/docs-version-worker/wrangler.jsonc`). The files are a default Astro Starlight build with `base: '/snapshots/13.x'`, copied to `assets/snapshots/13.x/` (34 files, 1.1 MB). `not_found_handling: "404-page"`.
- **Router Pages project** `docs-router-test`: one Pages Function, `functions/[[path]].js`. It forwards `/snapshots/13.x` and everything under it with `env.SNAPSHOTS_13X.fetch(request)` (a Service binding), redirects `/snapshots` and `/snapshots/` to `/snapshots/13.x/` with a 302, and passes everything else to `next()`.

## Findings

### A Service binding serves a static-files-only Worker's files

- Through the router, every page, CSS, JS, image, favicon and Pagefind file came back with the same status and **byte-identical** body as fetching the Docs Version Worker directly (13 paths compared).
- A missing path under `/snapshots/13.x/` returned the Docs Version's own `404.html` with a 404.
- `/snapshots/13.x` got a 307 to `/snapshots/13.x/` from the static-assets layer. The `Location` header is relative, so the reader stays on the router's hostname.
- The path prefix isn't stripped: the Docs Version's files have to sit under `snapshots/13.x/` in its Worker.
- Starlight's search (Pagefind) worked through the router: typing "example" gave 3 results, and the Pagefind WebAssembly, index and fragments all loaded through the binding.
- The `workers.dev` `fetch()` fallback and a pass-through script in the Docs Version Worker weren't needed, so they weren't tried.

### What counts against 100,000 requests a day

From the account's GraphQL Analytics (`pagesFunctionsInvocationsAdaptiveGroups`, `workersInvocationsAdaptive`):

- Every request to the router invokes the Pages Function once. That includes requests it forwards, redirects, or passes to `next()`.
- Each forwarded request, and each `next()`, is one **subrequest** of that invocation.
- The Docs Version Worker recorded **no invocations**, whether reached directly on `workers.dev` or through the binding.

Requests per reader step, from a live log of the router deployment (`wrangler pages deployment tail`), on a fresh hostname so the browser cache started cold. No other traffic arrived during the window.

| Reader step | Router requests | What |
| --- | --- | --- |
| First visit to `/snapshots/` | 9 | 302, page, 2 CSS, 3 JS, 1 image, favicon |
| Second page | 4 | page + 3 scripts not loaded before |
| Third page | 1 | page only |
| First search | 9 | `pagefind.js`, worker, entry JSON, meta, WebAssembly, index, 3 fragments |

- This is the default Starlight template. The Docs Site adds its own font files (Newsreader, Instrument Sans) and logo, so a first visit will be a few requests more (inferred, not measured).
- Unattributed traffic: in 12:17–12:19 UTC, right after the `pages.dev` hostname was created, the router recorded about 27 more requests than this session sent. The live log wasn't running then, so their source is unknown.

### Cache headers

- By default, Workers static assets served the hashed `_astro/*` files with `Cache-Control: public, max-age=0, must-revalidate`. Browsers re-check them on every page view, and each check is a router request.
- A `_headers` file at the Docs Version Worker's assets root (`/snapshots/13.x/_astro/*` → `public, max-age=31536000, immutable`) fixed this. The header came through the binding unchanged. With it, cached files made no requests (the second- and third-page rows above).
- HTML stays `max-age=0, must-revalidate`, so every page view is at least one router request.

### The router's own responses

- With no `404.html` in the router project, unknown paths (`/snapshots/12.x/`, `/elsewhere`) got the router's `index.html` with a **200**. Adding `404.html` made them 404 (`cache-control: no-store`).

### CPU time

- Pages Function CPU time per request, per minute: median 0.7–2.2 ms, p99 up to 5.2 ms. The Free limit is 10 ms per invocation.

## Not tested

- Behaviour past 100,000 requests a day (the docs describe fail open / fail closed; see [How do a Pages router and Cloudflare for SaaS behave on Cloudflare's free plan?](https://github.com/plank/docs/issues/14)).
- `packages.plank.co` as a custom domain on the Pages project, with a CNAME at Namecheap.
- More than one Docs Version or Package behind one router, and how many Service bindings a Pages project can hold.

## Side effects on the account

- Deploying registered the account's `workers.dev` subdomain as `docs-version-worker.workers.dev`. It remains after cleanup.
