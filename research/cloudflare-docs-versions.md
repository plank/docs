# How can a Package's Docs Versions share one path on Cloudflare's free plan?

Research for [plank/docs#3](https://github.com/plank/docs/issues/3). Sources were read on 2026-09-11. Each fact cites the page it came from, with that page's "Last updated" date where one was shown.

## Question

How can several Docs Versions of one Package (e.g. `/snapshots/13.x`, `/snapshots/12.x`, and `/snapshots/` resolving to the newest) be deployed and served on Cloudflare's free plan when each Major Line releases independently? What does each approach cost?

User-set constraints this research is measured against:

- Package Docs are markdown, written in each Package's own repo.
- Each Package's release workflow builds and deploys its own section of one Docs Site at `docs.plank.co/<package>`, using shared build tooling.
- One Docs Version per Major Line (e.g. `/snapshots/13.x`).
- Hosted on Cloudflare with $0 recurring cost and no third-party runtime services.

Everything below reports how each option behaves and what it costs. None of it is a verdict.

## Summary of costs

| Option | What one Major Line's release deploys | How `/snapshots/` finds the newest | Worker slots (free: 100 per account) | Per-request cost | Payment method |
| --- | --- | --- | --- | --- | --- |
| **1. A Worker per Docs Version**, plus a per-Package root Worker | Only its own Worker (`snapshots-13x`). The root Worker is redeployed only by the newest Major Line. | `_redirects` rule, or a full copy of the newest version, in the root Worker. Alternatively a Bulk Redirect list entry. | Major Lines + 1 per Package. With 4 Major Lines that's 5, so 16 Packages use 80. | $0: static-asset requests only. | Not needed |
| **2. One Worker per Package, rebuilt with every Major Line on each release** | The whole Package (all Major Lines), built from each `N.x` branch or composed from stored builds. Unchanged files aren't re-uploaded. | `_redirects` (302 redirect, or 200 proxy) in the same Worker, computed at build time. | 1 per Package | $0: static-asset requests only. | Not needed |
| **3. Router Worker in front** (service bindings to version Workers, or to Pages) | Its own version Worker. The router is redeployed when the set of Major Lines changes. | Router code at request time | Option 1's count + 1 | Every routed request counts against 100,000/day, account-wide. | Not needed |
| **3′. Router only on the exact `/snapshots/` URL** (Option 1 serves the versions) | Same as Option 1 | Router code, or a config value set at deploy | Option 1's count (the router can replace the root Worker) | Only landing-page hits count against 100,000/day. | Not needed |
| **4a. R2 + Worker** | Syncs its own prefix into one bucket | Pointer object or listing, read by the Worker | 1 (or more) | Every request: 1 Worker request (100k/day) and 1+ Class B operation (10M/month) | R2 subscription through checkout. Billing policy asks for a valid payment method. Usage over the free tier is billed. |
| **4b. R2 public bucket on a custom domain** | Syncs its own prefix | Single Redirect or Bulk Redirect via API | 0 | $0 Worker requests; Class B operations per uncached read | Same as 4a. The custom domain is a whole hostname, so all of `docs.plank.co` would be the bucket. |
| **4c. R2 behind a path via Origin Rules** | Syncs its own prefix | As 4b | 0 | As 4b | Host-header and DNS-record overrides are Enterprise-only. |
| **5. KV + Worker** (Workers Sites pattern) | Writes its own keys | KV pointer key | 1 | Every request: 1 Worker request and 1+ KV read (100k/day) | Not needed. Free plan allows 1,000 KV writes/day (1 per file). |
| **6. Pages** | A complete Pages deployment | Only through a Worker in front (reduces to Option 3) | Plus Pages projects (100 per account) | Worker in front counts | Not needed |

## Platform facts every option touches

### Workers routes

- A route pattern can include a path. `*` is the only operator and matches zero or more of any character. Patterns can't contain infix wildcards or query parameters. "When more than one route pattern could match a request URL, the most specific route pattern wins" (e.g. `example.com/hello/*` beats `example.com/*`). [Routes, Jun 1 2026]
- A pattern without a trailing `*` doesn't match the same path with a query string: "the only way to have a route pattern match URLs with query parameters is to terminate it with a wildcard". [Routes]
- A route with no Worker attached negates less specific patterns: that path bypasses Workers. [Routes]
- **Known bug:** with Worker A on `example.com/images/*` and Worker B on `example.com/images*`, the request `example.com/images/hello` goes to B. "A trailing `/*` in your pattern may not act as expected." [Known issues, Apr 23 2026] The page only documents same-prefix pairs. How a pair like `docs.plank.co/snapshots*` vs `docs.plank.co/snapshots/13.x*` resolves isn't documented, so it needs testing.
- A route needs "an active Cloudflare zone" and a proxied (orange-cloud) DNS record for the hostname. [Routes]
- The route prefix is **not stripped**. A Worker's assets "must be nested in a directory structure that mirrors the desired path" (e.g. `dist/blog/…` for `example.com/blog/*`). Files outside that path aren't served. This needs Wrangler v3.98.0 or later. [Serving a subdirectory, Apr 23 2026]
- Workers Custom Domains "point all paths of a domain or subdomain to your Worker". They match on hostname only. [Custom Domains, Aug 14 2026]
- Free-plan limits: 1,000 routes per zone, 100 custom domains per zone, 1,000 routed zones per Worker. [Limits, Sep 5 2026]

### Workers Static Assets: billing and deploys

- "Requests to static assets are free and unlimited. Requests to the Worker script … are billed according to Workers pricing." "There is no additional cost for storing Assets." [Billing and Limitations, Apr 23 2026; Pricing, Aug 28 2026]
- A matching asset is served "without invoking Worker code". If nothing matches and no Worker script exists, the response is `404 Not Found`. `main` is optional for assets-only Workers. [Static Assets, Jul 3 2026; Wrangler configuration, Sep 4 2026]
- The free plan allows 100,000 Worker requests per day, resetting at midnight UTC. Past that, a route returns Error 1027 ("fail closed") or bypasses the Worker ("fail open"). With `run_worker_first`, requests over the limit get a 429 "instead of falling back to static asset serving". [Limits; Billing and Limitations]
- A Worker calling another Worker through a Service Binding incurs no additional request fee. [Pricing]
- The asset manifest "is used to track assets associated with each Worker version". Unchanged files aren't returned in the upload `buckets` "if they have recently been uploaded in previous versions of your Worker". `keep_assets` reuses the *existing whole set* when uploading new code. There is no per-prefix merge. [Direct Upload, Aug 10 2026]
- Free-plan limits: 20,000 files per Worker version, 25 MiB per file, 100 Workers per account, 10 ms CPU per request. [Limits]
- `_redirects` in the asset directory allows 2,000 static and 100 dynamic rules. Rules apply to static-asset responses, not to responses from Worker code. The default status is 302. **Proxying** (status `200`) "will only support relative URLs on your site. You cannot proxy external domains." The docs suggest a canonical `Link` header via `_headers` when proxying. [Redirects, Aug 25 2026]
- `html_handling` defaults to `auto-trailing-slash`: `/folder/` serves `folder/index.html`. [HTML handling, Apr 23 2026]

### Rules products on a free zone

| Product | Free quota | Notes | Source |
| --- | --- | --- | --- |
| Single Redirects | 10 rules per zone; wildcard yes, regex no | Runs first among Rules (`http_request_dynamic_redirect`). API token needs *Zone > Single Redirect > Edit*. | [Redirects, Aug 14 2026]; [Single Redirects API, Aug 25 2026] |
| Bulk Redirects | 15 rules, 5 lists, 10,000 URL redirects across lists (per account) | Static source→target only. List-item writes are asynchronous (they return an `operation_id`). API token needs *Account Filter Lists Edit*. | [Redirects]; [Bulk Redirects API, Aug 25 2026] |
| URL Rewrite (Transform) Rules | 10 active Transform Rules; regex no | Wildcard replacement (`${1}`) is supported. The hostname can't be rewritten. | [Transform Rules, Aug 14 2026]; [URL Rewrite Rules, May 5 2026]; [Create URL rewrite in dashboard, May 5 2026] |
| Origin Rules | 10 rules | *Override Host header* and *Override DNS records* are Enterprise-only. | [Origin Rules, Aug 14 2026] |
| Snippets | Not available on Free | | [Snippets, Aug 14 2026] |

I didn't find whether Workers route matching sees the path *after* a URL Rewrite Rule. The Rules docs place URL rewrites before origin processing, but no Workers page says which URL routes are matched against.

### Pages

- Pages custom domains are hostnames (an apex domain, or a subdomain via CNAME to `<site>.pages.dev`). The page describes no path-level attachment. [Pages custom domains, Apr 21 2026]
- Free-plan limits: 100 projects per account, 20,000 files per site, 25 MiB per file, 500 builds/month for Git-triggered builds. Pages Functions requests count against the same 100,000/day Workers quota. `_redirects` proxying is relative-only, as for Workers. [Pages limits, Sep 5 2026; Pages Functions pricing, Sep 8 2026; Pages redirects, Aug 25 2026]

### R2

- Free tier: 10 GB-month of storage, 1 million Class A operations/month (e.g. `PutObject`, `ListObjects`), 10 million Class B operations/month (e.g. `GetObject`, `HeadObject`). Egress is free, and `DeleteObject` is free. This applies to Standard storage only. [R2 pricing, Aug 7 2026]
- "You need a Cloudflare account with an R2 subscription … Complete the checkout flow to add an R2 subscription to your account." [R2 get started, Apr 21 2026]
- The billing policy says: "Ensure that you are using a valid payment method before changing your plan type or enabling subscriptions." For usage-based services, "Cloudflare may preauthorize your credit card". If payment fails, R2 buckets become inaccessible. [Billing policy, May 29 2026] The R2 pages don't themselves say "payment method". The requirement is inferred from the checkout flow together with the billing policy.
- A public bucket is exposed through a custom domain, which must be a zone in the same account, or through `r2.dev`. `r2.dev` is "rate-limited and should only be used for development purposes". The public-bucket page describes no index-document or directory-index setting. [Public buckets, Jun 16 2026; R2 limits, Jun 8 2026]
- Cloudflare's tutorial for putting an R2 bucket behind a *path* of another hostname uses an Origin Rule that overrides the Host header and DNS record. On the free plan those two overrides are Enterprise-only. [Point to R2 bucket with a custom domain, Oct 13 2025; Origin Rules]

### KV

- Free plan: 100,000 reads/day, 1,000 writes/day to different keys, 1 write/second to the same key, 1 GB storage, 25 MiB per value. [KV limits, Apr 21 2026]

### GitHub Actions and Releases

- Concurrency groups: "By default, any existing `pending` job or workflow in the same concurrency group will be canceled and the new queued job or workflow will take its place." `queue: max` allows up to 100 pending runs (it can't be combined with `cancel-in-progress: true`). [Control workflow concurrency]
- Release assets: up to 1,000 per release, each under 2 GiB. "There is no limit on the total size of a release, nor bandwidth usage." [About releases]

### Scale reference

On 2026-09-11, `gh repo list plank --source --no-archived --visibility public` showed 16 public PHP source repos: blueprint-data, laravel-mediable, publisher, snapshots, laravel-hush, laravel-schema-events, laravel-model-resolver, before-and-after-model-events, frontdesk, contentable, laravel-metable, model-cache, polyglot, wcmtl-api, larelations, laravel-checkpoint. The arithmetic below uses this as an upper bound for "Packages with docs". The 100-Workers limit is per account, so any other Workers on Plank's account share it.

## Options in detail

### Option 1: A Worker per Docs Version, plus a per-Package root Worker

**How it works.** Each Docs Version is an assets-only Worker, e.g. `snapshots-13x`. Its assets sit under `dist/snapshots/13.x/`, and its route is `docs.plank.co/snapshots/13.x*` (or `…/13.x/*` plus `…/13.x`). A per-Package root Worker takes the less specific `docs.plank.co/snapshots/*` (plus `docs.plank.co/snapshots`). It answers `/snapshots/`, and it answers unknown versions with a 404. The Docs Site shell's `docs.plank.co/*` stays the least specific route.

**What one Major Line's release deploys.** Only its own Worker. No other Major Line's deploy is touched, so independent releases don't race. The root Worker changes only when "newest" changes.

**How `/snapshots/` finds the newest.**
- *Static redirect:* the root Worker's `_redirects` contains `/snapshots/ /snapshots/13.x/ 302`. This is an asset rule with no Worker invocation, so it's free.
- *Copy:* the root Worker carries a full copy of the newest Docs Version at `dist/snapshots/`. `/snapshots/` then serves content instead of redirecting. That duplicates content, which the docs suggest pairing with a canonical `Link` header.
- *Bulk Redirect entry:* one entry per Package in a shared list, updated via API. This removes the root Worker's `/snapshots/` role. Unknown versions then fall through to the shell's route.
- In each case, the release workflow decides at build time whether its Major Line is the newest. For example, it compares its own line to the highest `N.x` branch or tag. That logic would live in the shared build tooling, and only the newest line redeploys the root Worker.

**Free-plan limits touched.**
- Workers per account: (Major Lines + 1) per Package. With 4 Major Lines that's 5 per Package, and 16 Packages would use 80 of 100. That leaves 20 for the shell and anything else on the account. Retiring a Major Line leaves its Worker in place until it is deleted.
- Routes: about 2–3 per Worker, against 1,000 per zone.
- Files: 20,000 per Docs Version.
- Requests: static-asset only, so $0.
- The route-specificity known bug means the chosen pattern pair needs testing.

**Setup and payment.** `plank.co` must be an active Cloudflare zone, with a proxied DNS record for `docs.plank.co`. Each Package repo needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets; Cloudflare's CI guide uses the "Edit Cloudflare Workers" token template. No payment method is needed.

### Option 2: One Worker per Package, rebuilt with every Major Line at each release

**How it works.** One assets-only Worker per Package, routed at `docs.plank.co/snapshots*` (or `/snapshots/*` plus `/snapshots`). Its assets hold `dist/snapshots/10.x/ … 13.x/` together with a `_redirects` file.

**What one Major Line's release deploys.** The whole Package, because each Worker version carries a complete manifest. There are two ways to source the other Major Lines:
- *2a. Rebuild all.* The workflow checks out each `N.x` branch and builds every Docs Version. Unchanged files aren't re-uploaded (hash dedupe), so the upload cost is roughly the changed files. Build time grows with the number of Major Lines.
- *2b. Compose from stored builds.* Each release attaches its built Docs Version to its GitHub Release (under 2 GiB per asset, 1,000 assets per release). Deploying downloads the latest asset for every Major Line and deploys the combined set. This is build-time only, on GitHub.

**Concurrency.** Lockstep releases of 10.x–13.x start up to four deploys to one Worker, and the last deploy wins. A repo-level concurrency group serialises them. Under the default `queue: single`, older *pending* runs are cancelled. That is harmless in 2a if every run builds from current branch heads. In 2b it depends on whether each release asset was uploaded before the surviving run read it. `queue: max` keeps up to 100 pending runs instead.

**How `/snapshots/` finds the newest.** The build has every Major Line in hand, so it writes `_redirects` itself. That can be a 302 to `/snapshots/13.x/`, or a 200 proxy (allowed because it's a relative URL within the same Worker) with a canonical `Link` header.

**Free-plan limits touched.** 1 Worker per Package (16 of 100). 20,000 files in total across *all* Major Lines of one Package. Requests are $0.

**Setup and payment.** Same as Option 1.

### Option 3: A router Worker in front

**How it works.** A Worker *script* on `docs.plank.co/snapshots/*` forwards each request to per-version Workers through service bindings (no extra fee per binding call), or fetches a Pages project.

**What one Major Line's release deploys.** Its own version Worker. Service bindings are declared in the router's configuration, so adding or retiring a Major Line means redeploying the router.

**How `/snapshots/` finds the newest.** At request time, from router code or config: an env var set at deploy, a KV key, or the highest bound version.

**Free-plan limits touched.** Every request routed to the router counts against the account-wide 100,000/day. Over the limit, the route fails closed (1027) or fails open (bypasses the Worker, so the request falls to the next matching route or origin). The router also has 10 ms of CPU per request. Worker count is Option 1's plus one.

**Variant 3′.** Put the router script only on the exact `docs.plank.co/snapshots/` and `docs.plank.co/snapshots` patterns, and serve versions with Option 1's Workers. Only landing-page hits then count toward the daily quota. A pattern without a trailing `*` doesn't match the same URL with a query string.

### Option 4: R2-backed

**4a. R2 plus a Worker.**
- *How it works.* A Worker script on `docs.plank.co/snapshots/*` reads `snapshots/13.x/…` objects from a bucket binding. The Worker has to handle index files, trailing slashes, content types and caching itself.
- *What one Major Line's release deploys.* Only its own prefix, via an S3-compatible sync (build-time tooling) or `wrangler r2 object put` per object. Each write is a Class A operation; deletes are free.
- *How `/snapshots/` finds the newest.* A pointer object, or a `ListObjects` call (Class A).
- *Free-plan limits touched.* Every page view is a Worker request (100k/day) plus at least one Class B operation (10M/month).
- *Payment.* R2 subscription through checkout. Usage beyond the free tier is billed, whereas Workers Free returns errors when over its limit.

**4b. R2 public bucket on a custom domain.**
- *How it works.* The custom domain is a whole hostname, so `docs.plank.co` itself would be the bucket, holding every Package's prefix and the shell. Requests don't invoke Workers.
- *Index files.* The public-bucket docs describe no index document. A wildcard URL Rewrite Rule (10 per zone on free) could map `…/` to `…/index.html`.
- *How `/snapshots/` finds the newest.* A Single Redirect (10 per zone, shared by every Package) or a Bulk Redirect list entry (10,000 per account), updated via API.
- *Payment.* Same as 4a.

**4c. R2 behind a path of another hostname.** Cloudflare's documented approach uses an Origin Rule that overrides the Host header and DNS record. Those overrides are Enterprise-only.

### Option 5: KV-backed (Workers Sites pattern)

A Worker script serves files stored as KV keys. A release writes one key per file. The free plan allows 1,000 writes/day across different keys, so a 300-file Docs Version released on four Major Lines in lockstep would need 1,200 writes. Storage is capped at 1 GB. Every page view is a Worker request plus at least one KV read (both 100k/day). No payment method is needed.

### Option 6: Pages

Pages custom domains are hostnames, so a Pages project reaches a *path* of `docs.plank.co` only through a Worker in front (Option 3 with Pages as the origin). Pages Functions count against the same 100,000/day. Direct-upload deployments are complete sites, just like Worker versions. The account allows 100 Pages projects.

## Mechanisms for "`/snapshots/` → newest"

| Mechanism | Lives in | Updated by | Request cost | Quota |
| --- | --- | --- | --- | --- |
| `_redirects` 302 | Asset dir of the Worker that owns `/snapshots/` | Redeploying that Worker | $0 | 2,000 static rules per file |
| `_redirects` 200 proxy | Same Worker as the target files | Redeploying that Worker | $0 | Relative URLs only |
| Full copy of the newest version at `/snapshots/` | Root Worker's assets | Newest line's release | $0 | 20,000 files per version |
| Single Redirect rule | Zone ruleset | Rulesets API (*Single Redirect Edit*) | $0 | 10 per zone, shared zone-wide |
| Bulk Redirect list item | Account list | Lists API (*Account Filter Lists Edit*), asynchronous | $0 | 10,000 URLs; 5 lists; 15 rules |
| Router Worker script | Worker code or config | Deploy or config write | 1 Worker request per hit | 100,000 per day |

## Open questions (not verified)

- Whether route specificity between `…/snapshots*` and `…/snapshots/13.x*` behaves as "longest wins". The known-issues page only documents same-prefix cases.
- Whether Workers route matching uses the path after a URL Rewrite Rule.
- Whether enabling R2 is possible without a card: checkout is required, and the billing policy lists the approved payment methods.
- Whether `plank.co` is already an active zone on the Cloudflare account, and how many Workers that account already has.

## Sources

Cloudflare developer docs (read 2026-09-11):
- Routes: https://developers.cloudflare.com/workers/configuration/routing/routes/
- Known issues: https://developers.cloudflare.com/workers/platform/known-issues/
- Custom Domains: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- Limits: https://developers.cloudflare.com/workers/platform/limits/
- Pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Static Assets: https://developers.cloudflare.com/workers/static-assets/
- Billing and Limitations (static assets): https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
- Direct Upload: https://developers.cloudflare.com/workers/static-assets/direct-upload/
- Serving a subdirectory: https://developers.cloudflare.com/workers/static-assets/routing/advanced/serving-a-subdirectory/
- Worker script and assets: https://developers.cloudflare.com/workers/static-assets/routing/worker-script/
- Redirects (static assets): https://developers.cloudflare.com/workers/static-assets/redirects/
- HTML handling: https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/
- Wrangler configuration: https://developers.cloudflare.com/workers/wrangler/configuration/
- CI/CD with GitHub Actions: https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- Pages custom domains: https://developers.cloudflare.com/pages/configuration/custom-domains/
- Pages limits: https://developers.cloudflare.com/pages/platform/limits/
- Pages Functions pricing: https://developers.cloudflare.com/pages/functions/pricing/
- Pages redirects: https://developers.cloudflare.com/pages/configuration/redirects/
- R2 pricing: https://developers.cloudflare.com/r2/pricing/
- R2 get started: https://developers.cloudflare.com/r2/get-started/
- R2 public buckets: https://developers.cloudflare.com/r2/buckets/public-buckets/
- R2 limits: https://developers.cloudflare.com/r2/platform/limits/
- Point to R2 bucket with a custom domain: https://developers.cloudflare.com/rules/origin-rules/tutorials/point-to-r2-bucket-with-custom-domain/
- Billing policy: https://developers.cloudflare.com/billing/understand/billing-policy/
- KV limits: https://developers.cloudflare.com/kv/platform/limits/
- Redirects (Single and Bulk, availability and execution order): https://developers.cloudflare.com/rules/url-forwarding/
- Single Redirects API: https://developers.cloudflare.com/rules/url-forwarding/single-redirects/create-api/
- Bulk Redirects API: https://developers.cloudflare.com/rules/url-forwarding/bulk-redirects/create-api/
- Transform Rules: https://developers.cloudflare.com/rules/transform/
- URL Rewrite Rules: https://developers.cloudflare.com/rules/transform/url-rewrite/
- URL Rewrite (dashboard, wildcard): https://developers.cloudflare.com/rules/transform/url-rewrite/create-dashboard/
- Origin Rules: https://developers.cloudflare.com/rules/origin-rules/
- Snippets: https://developers.cloudflare.com/rules/snippets/
- Phases list: https://developers.cloudflare.com/ruleset-engine/reference/phases-list/

GitHub docs:
- Control workflow concurrency: https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency
- About releases: https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases
