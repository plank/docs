# How do a Pages router and Cloudflare for SaaS behave on Cloudflare's free plan?

Research for [plank/docs#14](https://github.com/plank/docs/issues/14). Sources were read on 2026-09-12. Each fact cites the page it came from, with that page's "Last updated" date where one was shown. Nothing was tested live: no Cloudflare account was used.

## Question

`plank.co` DNS stays at Namecheap (BasicDNS), so `packages.plank.co` will be a CNAME at Namecheap ([plank/docs#6](https://github.com/plank/docs/issues/6)). Two shapes keep each Docs Version deploying on its own. What do they do on Cloudflare's free plan?

1. **A Pages project that only routes.** `packages.plank.co` is a custom domain on a Pages project. Its Pages Function uses Service bindings to forward `/snapshots/13.x/*` to a separately deployed Worker (with static assets) per Docs Version.
2. **Cloudflare for SaaS on a second domain.** Plank adds some other domain as a full-setup zone (Free plan), turns on Cloudflare for SaaS, and adds `packages.plank.co` as a custom hostname. Namecheap gets `packages CNAME <SaaS zone's CNAME target>`.

User-set constraints: $0 recurring cost; each Major Line's release deploys only its own Docs Version.

Everything below reports how each mechanism behaves and what it costs. None of it is a verdict.

## Short answers

### Option 1: Pages router

| Sub-question | Short answer |
| --- | --- |
| What happens past 100,000 requests/day? | The project follows its **Fail open / closed** setting. "Fail open" serves the Pages project's static assets instead of running the Function. "Fail closed" returns "an error page". The Pages page names no status code. The Workers docs name the error for Workers as **Error 1027**. |
| Does `_routes.json` limit invocations? Does an excluded request count? | Yes. Excluded routes "will not invoke the Function and will not incur a Functions invocation charge". The docs don't say whether `_routes.json` applies to an advanced-mode `_worker.js`. |
| Pages vs Worker-route fail mode | Pages fail open serves the project's static assets. A Worker route's fail open "bypasses the Worker" as if none were configured. Both fail-closed modes return an error page. |
| Is the Service binding call a second request? | For Workers, no: "billed as one request (for the initial invocation of Worker A)" plus CPU time across both Workers. The Pages pricing page doesn't mention Service bindings. |
| Are the downstream Worker's static assets free through the binding? | The docs don't say directly. Static-asset requests are "free and unlimited". The Workers Cache page lists "worker-to-worker invocations through service bindings" among requests that are "normally free". |
| Can the Function bind to an assets Worker? Does it need `main`? | Binding from Pages to "your desired Worker" is documented, with no restriction on assets Workers. `main` is "optional for assets-only Workers". The docs don't say whether an assets-only Worker (no `main`) answers a Service binding call. |
| Other costs | Each binding call counts toward the subrequest limit (50 per request on Free) and toward 32 Worker invocations per request. CPU is capped at 10 ms per invocation. The bound Worker "must be on your Cloudflare account". Adding a binding needs a Pages redeploy, after the new Worker exists. `workers.dev` isn't needed for bindings. The docs describe no URL rewriting by the binding, so the prefix stays unless router code changes it (inferred). |

### Option 2: Cloudflare for SaaS

| Sub-question | Short answer |
| --- | --- |
| Payment method? | Yes. The enable flow says: "**Non-enterprise**: Enter payment information." Free includes 100 hostnames, then $0.10 each. The quota is a soft limit, so hostnames beyond it are billed. |
| Can a route name the custom hostname with a path? | Cloudflare's "Worker as origin" page shows `*/*` and a bare `vanity.customer.com` route. It shows no path example. A 2023 Wrangler bug shows `www.example-dev.com/some-path` on a SaaS zone could be "added in the Cloudflare interface" while Wrangler rejected it (closed 2023-10-25). The docs don't state path support for custom hostname routes. |
| `…/snapshots*` vs `…/snapshots/13.x*` precedence | The only rule documented is "the most specific route pattern wins". A known bug makes `example.com/images*` win over `example.com/images/*`. No page documents a pair like Plank's. |
| What goes at Namecheap? | Minimum: `packages CNAME <CNAME target>`. The hostname then validates in real time, and the certificate validates by automatic HTTP DCV. Optional: a `_cf-custom-hostname.packages` TXT for pre-validation, removable once active. For certificates: a `_acme-challenge.packages` TXT per issuance, or a permanent `_acme-challenge.packages` CNAME (Delegated DCV). |
| Renewal | Certificates last 90 days. For a non-wildcard, active hostname not using Delegated DCV, Cloudflare "will try to perform DCV automatically … by serving the HTTP token". The docs describe no further Namecheap change in that case. |
| CAs on Free | "Selectable CA" is No on Free. "Default CA" is used. SSL for SaaS certificates come from Let's Encrypt, Google Trust Services or SSL.com, and the docs don't say which one the default picks. `plank.co` had no CAA records on 2026-09-12. |
| Other costs | The fallback origin must be a proxied record. For a Worker origin, it's an originless record (`AAAA 100::`). No real server is needed. Free lacks wildcard hostnames, custom certificates, selectable CA and apex proxying. The SaaS zone is a domain Plank must hold. A new domain is an annual registration fee (at registry cost on Cloudflare Registrar), which is a recurring cost. |

## Option 1 in detail: a Pages project that only routes

### The daily request limit

- Pages Functions requests count toward the Workers Free quota. "For example, you could use 50,000 Functions requests and 50,000 Workers requests to use your full 100,000 daily request usage. The free plan daily request limit resets at midnight UTC." [Pages Functions pricing, Sep 8 2026]
- "Requests to static assets are free and unlimited. A request is considered static when it does not invoke Functions." [Pages Functions pricing]
- "Once you add Functions on a Pages project, all requests by default will invoke your Function." `_routes.json` holds `include` and `exclude` lists, and "`exclude` always take priority over `include`". A route in `exclude` "will not invoke the Function and will not incur a Functions invocation charge". The file is generated automatically when a `functions` directory is detected. [Pages Functions routing, Apr 21 2026]
- `_routes.json` limits: at least one include rule, at most 100 include/exclude rules combined, at most 100 characters per rule. [Pages Functions routing]
- **Fail open / closed (Pages).** "If on the Workers Free plan, you can configure how Pages behaves when your daily free tier allowance of Pages Functions requests is exhausted." It's set under **Settings > Runtime > Fail open / closed**. "'Fail open' means that static assets will continue to be served, even if Pages Functions would ordinarily have run first. 'Fail closed' means an error page will be returned, rather than static assets." [Pages Functions routing]
- The Pages routing page doesn't name the status or error code of that error page. The Pages Functions metrics page lists invocation status "Exceeded resources" with Workers error codes "1102, 1027", caused by CPU time, startup time "or free tier limits". [Pages Functions metrics] *Inferred:* fail closed on Pages shows Error 1027, as it does on Workers.
- **Fail open / closed (Worker route).** "When a Worker exceeds this limit, Cloudflare returns **Error 1027**." Fail open "Bypasses the Worker. Requests behave as if no Worker is configured." Fail closed "Returns a Cloudflare 1027 error page." The mode is toggled per route. [Workers limits, Sep 5 2026]
- **The difference.** Pages fail open falls back to *the Pages project's own static assets*. A Worker route's fail open falls through to whatever serves the hostname without that Worker. *Inferred:* a router-only Pages project holds few or no Docs Version files. So past the limit with fail open, `/snapshots/13.x/*` would get whatever the router project's own assets give for that path (for example its 404), not the Docs Version.
- The advanced-mode page says a `_worker.js` Function "will assume full control of all incoming HTTP requests to your domain". It doesn't mention `_routes.json`. [Advanced mode, Apr 21 2026] The docs don't say whether `_routes.json` exclusions apply to `_worker.js`.
- For comparison, a Worker with static assets and `run_worker_first` gets "a 429 (Too Many Requests) response instead of falling back to static asset serving" once over the free limit. [Static assets billing and limitations, Apr 23 2026]

### Service bindings: request counting and static assets

- Workers pricing: "Requests made from your Worker to another worker via a Service Binding do not incur additional request fees." Worker A calling Worker B "is billed as: One request (for the initial invocation of Worker A); The total amount of CPU time used across both Worker A and Worker B". [Workers pricing, Aug 28 2026]
- The Service bindings page says: "Service bindings don't increase costs." [Service bindings, Aug 18 2026]
- The Pages Functions pricing page doesn't mention Service bindings. Its paid-plan section says Functions requests count toward the quota "including requests from your Function to KV or Durable Object bindings". [Pages Functions pricing] *Inferred:* the Workers rule (one request for the chain) applies when the caller is a Pages Function. The Pages docs don't say so explicitly.
- Workers pricing, footnote 3: "Requests to static assets are free and unlimited." [Workers pricing]
- The Workers Cache page, on opt-in caching: "every request to your Worker is charged at the standard Workers request rate, including requests that are normally free: static asset requests and worker-to-worker invocations through service bindings or `ctx.exports`." Caching is turned on in the Wrangler configuration. [Workers Cache, Jul 21 2026]
- The docs don't say directly whether a request arriving through a Service binding is matched against the downstream Worker's static assets before its script runs, the way a routed request is. Cloudflare's microfrontends guide has a router Worker forward "via service binding" to microfrontends, each of which "can be … A static site with Workers Static Assets". [Microfrontends, Jun 25 2026]
- A community thread titled "Can't fetch static asset from other worker when invoked through service binding" exists (community.cloudflare.com/t/635138). Its content was behind a bot challenge and wasn't read.

### Can a Pages Function bind to an assets Worker?

- Pages supports Service bindings "to call a Worker from within your Pages Function", configured in the Wrangler file (`services`) or the dashboard ("Under **Service**, select your desired Worker"). No restriction on Workers with assets is stated. [Pages Functions bindings, Jun 25 2026; Pages Wrangler configuration, Jun 25 2026]
- "The `main` key is optional for assets-only Workers." [Wrangler configuration, Sep 4 2026] With no Worker script, a request that matches no asset gets "a `404 Not Found`". [Static Assets, Jul 3 2026]
- Every Service binding example has the target Worker define `main` and a `fetch` handler. The RPC example notes: "Currently, entrypoints without a named handler are not supported". [Service bindings; Service bindings HTTP, Apr 23 2026] The docs don't say whether an assets-only Worker with no `main` accepts a Service binding `fetch()` call.

### Other costs of this shape

- **Limits per invocation (Free).**
  - "Each request to a Worker via a Service binding counts toward your subrequest limit."
  - "A single request has a maximum of 32 Worker invocations, and each call to a Service binding counts towards this limit."
  - Binding calls don't count toward simultaneous open connection limits.
  - [Service bindings]
  - The Free subrequest limits are 50 per invocation, and 1,000 "to internal services". [Workers limits] The docs don't say which of the two counters a Service binding call uses.
- **CPU.** 10 ms of CPU per invocation on Free. [Workers limits] Billing counts CPU "across both Worker A and Worker B". [Workers pricing] The docs don't say whether the 10 ms cap is applied to the combined time or per Worker.
- **Number of bindings.** The pages read list no cap on Service bindings per Worker or per Pages project. The docs don't say there is one.
- **Same account.** The target "Worker must be on your Cloudflare account". [Service bindings]
- **Redeploying the router.**
  - A dashboard-added binding needs this step: "Redeploy your project for the binding to take effect." [Pages Functions bindings]
  - Deploy order matters. "The target Worker … must be deployed first … Otherwise … deployment will fail." [Service bindings]
  - So a new Major Line's Worker is deployed first, then the Pages router gets a new binding and a redeploy.
  - Workers and Pages projects have separate limits of 100 each per account on Free. [Pages limits, Sep 5 2026; Workers limits]
- **`workers.dev`.** Service bindings "call into another [Worker] without going through a publicly-accessible URL". You can "deploy a Worker that is not reachable via the public Internet, and can only be reached via an explicit Service binding". [Service bindings] `workers_dev = false` disables the `workers.dev` route. [workers.dev, Aug 14 2026]
- **Path prefix.**
  - `env.WORKER_B.fetch(request)` forwards "a Request object". [Service bindings HTTP] The docs describe no rewriting of the URL by the binding.
  - Assets are matched on pathname: "Only the URL pathname is used to match assets." [Static assets binding, Sep 4 2026]
  - *Inferred:* forwarding the request unchanged sends `/snapshots/13.x/…`, so the Docs Version's assets would sit under `snapshots/13.x/` in its asset directory. This matches what the routes docs require for a Worker on a path. [Serving a subdirectory, Apr 23 2026]
  - The router can rewrite the URL instead. Cloudflare's microfrontends router "Strips the `/app-a` prefix" and rewrites HTML and CSS with HTMLRewriter to add it back. [Microfrontends]
- **Custom domain at Namecheap.** A subdomain doesn't need to be a Cloudflare zone. The domain is first added in the Pages dashboard, then CNAMEd to `<site>.pages.dev`. Adding the CNAME without associating the domain gives a 522. CAA records must allow Cloudflare's CAs. [Pages custom domains, Apr 21 2026]
- **Known Pages Functions routing bug.** [workers-sdk#1917](https://github.com/cloudflare/workers-sdk/issues/1917) is open (labels `product:pages`, `blocked`). A catch-all `functions/[[path]].js` takes `/` even when `functions/index.js` exists. A contributor replied: "this will have to wait until we have some sort of versioning mechanism in Pages Functions".

## Option 2 in detail: Cloudflare for SaaS on a second domain

### Payment method and plan

- Enable flow: go to **Custom Hostnames**, select **Enable**, then "The next step depends on the zone's plan … **Non-enterprise**: Enter payment information." [Enable Cloudflare for SaaS, Apr 29 2026]
- Free plan: 100 hostnames included, maximum 50,000, $0.10 per additional hostname. [Cloudflare for SaaS plans, Aug 14 2026]
- "The assigned quota is a soft limit. When usage reaches this limit, you can continue creating custom hostnames." The Create response "then includes a billing warning". "Each custom hostname counts toward usage until you delete it. This includes hostnames that are pending validation or activation." [Quotas and billing, Jul 30 2026]
- Billing policy: "Ensure that you are using a valid payment method before changing your plan type or enabling subscriptions." For usage-based services, "Cloudflare may preauthorize your credit card". [Billing policy, May 29 2026]
- The docs don't say whether enabling on Free, while under 100 hostnames, charges anything or places a preauthorization hold.
- Custom origin server became available on Free, Pro and Business on May 27, 2025. [Changelog: Cloudflare for SaaS PAYG updates]

### Worker routes on a custom hostname

- "When customers point their domains to your SaaS zone … their traffic enters your Cloudflare zone. Any Worker routes configured on your zone will match this incoming traffic." [Worker as origin, Jun 19 2026]
- That page lists three route setups: `*/*`; `*/*` plus Worker-less routes for the zone's own hostnames; and "Route only custom hostname traffic to the Worker: **Route**: `vanity.customer.com`". It shows no route with a path on a custom hostname. [Worker as origin]
- The routes page says "Route patterns must include your zone" and doesn't mention custom hostnames. [Routes, Jun 1 2026]
- [workers-sdk#3662](https://github.com/cloudflare/workers-sdk/issues/3662) (closed 2023-10-25) was titled "Wrangler routes don't work with Cloudflare for SaaS Custom Hostnames".
  - The reporter's pattern was `www.example-dev.com/some-path`, with `zone_name` set to the SaaS zone.
  - Wrangler 3.3.0 failed with "Could not find zone for [www.example-dev.com]". "The route can still be added in the Cloudflare interface, but wrangler won't allow it."
  - The thread read doesn't say which Wrangler release changed this, or confirm that the path-scoped route matched traffic.
- Workers for Platforms' hostname-routing page covers O2O (the customer's own zone is on Cloudflare). There, a "Custom hostname route" invokes the Worker only when the customer's record is grey-clouded. [Hostname routing, Apr 21 2026] *Inferred:* this doesn't apply here, since `plank.co` isn't a zone on Cloudflare.
- Route limits on Free: 1,000 routes per zone. [Workers limits]

### Precedence between `…/snapshots*` and `…/snapshots/13.x*`

- "When more than one route pattern could match a request URL, the most specific route pattern wins." Examples: `www.example.com/*` over `*.example.com/*`, and `example.com/hello/*` over `example.com/*`. [Routes]
- Known issue: with Worker A on `example.com/images/*` and Worker B on `example.com/images*`, `example.com/images/hello` goes to B. "A trailing `/*` in your pattern may not act as expected." Also, `a.example.com/a` goes to `a.example.com/*` rather than `*.example.com/a`. [Known issues, Apr 23 2026]
- [cloudflare-docs#2879](https://github.com/cloudflare/cloudflare-docs/issues/2879) asked Cloudflare to "Explain how to write the most specific Workers route". It was closed in 2022 with a pointer to the known-issues page.
- No page read gives a precise specificity algorithm. None covers a pair like `packages.plank.co/snapshots*` vs `packages.plank.co/snapshots/13.x*`, and none says whether custom-hostname routes follow the same rules.

### What validation adds at Namecheap

Hostname validation (sets `status`) and certificate validation (sets `ssl.status`) are separate, with different tokens. Production needs both `active` and the CNAME in place. [Hostname validation, Jun 19 2026; Getting started, Jun 19 2026]

| Record at Namecheap | Purpose | Lifetime | Source |
| --- | --- | --- | --- |
| `packages CNAME <CNAME target>` | Routes traffic. Also triggers real-time hostname validation and automatic HTTP DCV. | Permanent | [Getting started]; [Real-time validation, Apr 15 2026]; [HTTP DCV, Jun 19 2026] |
| `_cf-custom-hostname.packages TXT <value>` | Hostname pre-validation, before the CNAME | "your customer can remove the `TXT` record" once active | [Pre-validation, Jun 20 2026] |
| `_acme-challenge.packages TXT <token>` | Certificate TXT DCV | Per issuance. Tokens expire (Let's Encrypt 7 days, Google Trust Services 14, SSL.com 14). | [TXT DCV, May 7 2026]; [Token validity, Apr 15 2026] |
| `_acme-challenge.packages CNAME packages.plank.co.<hostname>` | Delegated DCV | "The CNAME record will need to stay in place" | [Delegated DCV, May 5 2026] |

- **Real-time hostname validation** "occurs automatically when your customer adds their DNS routing record". It "may cause some downtime", and the backoff grows if the record comes late. No-change PATCH requests reset the backoff. [Real-time validation]
- **HTTP pre-validation** is the other pre-validation method: a token served at `http://<host>/.well-known/cf-custom-hostname-challenge/<id>` on the current origin. [Pre-validation] `packages.plank.co` has no record or origin today ([plank/docs#6](https://github.com/plank/docs/issues/6)). *Inferred:* the TXT method is the pre-validation path that fits.
- **Certificate method.** One `ssl.method` is chosen: `http`, `txt`, or `email`. "If your custom hostname does not include a wildcard, Cloudflare attempts to complete DCV through HTTP validation after the hostname points to your SaaS target, even if you have selected **TXT**." With automatic HTTP, "all your customers have to do is add a CNAME", and the hostname "may route to Cloudflare before the certificate reaches `ssl.status: active`". [HTTP DCV]; [Validate certificates, May 7 2026]
- Getting started gives the two cutover orders. For the hostname active before DNS cutover, use pre-validation. For the certificate active before cutover, use TXT or Delegated DCV. [Getting started]
- CAA: HTTP DCV succeeds "as long as … they do not have any CAA records … blocking your chosen certificate authority". [HTTP DCV] On 2026-09-12, `dig CAA plank.co` and `dig CAA packages.plank.co` returned no records.

### Certificate renewal and CAs

- "Custom hostname certificates have a 90-day validity period and are available for renewal 30 days before their expiration." [Renew certificates, Apr 15 2026]
- Cloudflare "will try to perform DCV automatically on the hostname's behalf by serving the HTTP token" when all three hold: the hostname is non-wildcard, the hostname is active, and it isn't using Delegated DCV. If the hostname isn't active, "the custom hostname domain owner will need to add the TXT or HTTP DCV token". With Delegated DCV, "Cloudflare will continue to add TXT DCV tokens on your behalf". [Renew certificates]
- The certificate-validity page says: "HTTP validation is attempted on renewals but will fall back to TXT validation … 90-days certificates: after failing for 15 days". [Certificate validity periods, Apr 16 2026] The page doesn't say whether this applies to SaaS custom hostnames. It sends SaaS readers to the renew page.
- Renewal attempts continue until 24 hours before expiry. [Certificate validity periods]
- **CAs on Free.**
  - "Selectable CA" is No on Free, Pro and Business. [Plans]
  - "Only Enterprise customers can use the `certificate_authority` parameter." Left empty, it is "default CA", and Cloudflare "checks the CAA records before requesting the certificates". [Getting started; Issue certificates, Apr 15 2026]
  - SSL for SaaS certificates can come from Let's Encrypt, Google Trust Services or SSL.com. [Certificate authorities, Apr 16 2026] The docs don't say which one "default CA" picks.
  - Each hostname gets two certificates, ECDSA P-256 and RSA 2048. [Issue certificates]

### Other costs of this shape

- **Fallback origin.**
  - "The fallback origin is where Cloudflare will route traffic sent to your custom hostnames (must be proxied)": a proxied A, AAAA or CNAME record. [Getting started]
  - For a Worker as origin: "Ensure the fallback origin only has an originless DNS record", for example `service.example.com AAAA 100::`. A Worker route then serves the traffic. [Worker as origin]
  - So the fallback origin is a DNS record in the SaaS zone, not a server.
  - When a Worker route matches, "the `custom_origin_server` setting … is bypassed". [Worker as origin]
- **Worker requests.** The Workers Free daily limit and each route's fail open/closed apply as in any zone. [Workers limits] *Inferred:* with an originless fallback, a fail-open route over the limit falls through to `100::`, which serves nothing.
- **Free plan feature limits.** Free has no wildcard custom hostnames, custom certificates, CSR support, selectable CA, mTLS, apex proxying, custom metadata, or SNI rewrite. Non-SNI support is Pro and above. WAF for SaaS uses "WAF rules with current zone plan". [Plans]
- **Zone restriction.** "Do not configure a custom hostname which matches the zone name." [Getting started]
- **A second domain.**
  - The first step is "Add your zone to Cloudflare on a Free plan". [Getting started] That needs a domain Plank controls, other than `plank.co`.
  - A newly registered domain is an **annual registration fee, a recurring cost**. Cloudflare Registrar charges "what is charged by registries and ICANN", with no markup, and "All registrations have Auto-renew turned on by default." [Registrar about, Apr 24 2026; Register a domain, Apr 24 2026]
  - *Inferred:* a domain Plank already holds would avoid a new fee.
- **Workers for Platforms** is where the hostname-routing guide lives. It's a separate $25/month plan. [Workers for Platforms pricing, Apr 21 2026] The plain Worker routes described above are part of Workers, not Workers for Platforms.

## Open / unverified

- Whether a Service binding call into a Worker with static assets serves a matching asset without running script, and whether that is counted. The docs imply it's "normally free" but don't state the asset path.
- Whether an assets-only Worker (no `main`) can be a Service binding target.
- Whether a Service binding call from a *Pages Function* is billed like the Worker-to-Worker case (one request).
- Whether the 10 ms CPU cap applies per Worker or across the chain, and which subrequest counter (50 or 1,000) a binding call uses.
- What status code Pages "fail closed" returns (1027 is inferred), and whether `_routes.json` applies to `_worker.js`.
- Whether a Worker route on a SaaS zone can name a custom hostname with a path, and whether it matches traffic. The dashboard accepted one in 2023, according to workers-sdk#3662.
- How `…/snapshots*` vs `…/snapshots/13.x*` resolve, for zone routes or custom-hostname routes.
- Whether enabling Cloudflare for SaaS on Free charges or preauthorizes anything while under 100 hostnames.
- Which CA "default CA" picks on Free.
- Whether the "fall back to TXT after 15 days" renewal rule applies to SaaS custom hostnames.

## Sources

Cloudflare developer docs (read 2026-09-12):
- Pages Functions pricing: https://developers.cloudflare.com/pages/functions/pricing/
- Pages Functions routing (`_routes.json`, fail open/closed): https://developers.cloudflare.com/pages/functions/routing/
- Pages Functions metrics (invocation statuses): https://developers.cloudflare.com/pages/functions/metrics/
- Pages advanced mode: https://developers.cloudflare.com/pages/functions/advanced-mode/
- Pages Functions bindings: https://developers.cloudflare.com/pages/functions/bindings/
- Pages Wrangler configuration: https://developers.cloudflare.com/pages/functions/wrangler-configuration/
- Pages limits: https://developers.cloudflare.com/pages/platform/limits/
- Pages custom domains: https://developers.cloudflare.com/pages/configuration/custom-domains/
- Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Workers Cache: https://developers.cloudflare.com/workers/cache/
- Service bindings: https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/
- Service bindings HTTP: https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/http/
- Static Assets: https://developers.cloudflare.com/workers/static-assets/
- Static assets binding: https://developers.cloudflare.com/workers/static-assets/binding/
- Static assets billing and limitations: https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
- Serving a subdirectory: https://developers.cloudflare.com/workers/static-assets/routing/advanced/serving-a-subdirectory/
- Wrangler configuration: https://developers.cloudflare.com/workers/wrangler/configuration/
- workers.dev: https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
- Microfrontends: https://developers.cloudflare.com/workers/framework-guides/web-apps/microfrontends/
- Routes: https://developers.cloudflare.com/workers/configuration/routing/routes/
- Known issues: https://developers.cloudflare.com/workers/platform/known-issues/
- Cloudflare for SaaS, enable: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/enable/
- Cloudflare for SaaS, plans: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/plans/
- Cloudflare for SaaS, quotas and billing: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/quotas-and-billing/
- Cloudflare for SaaS, getting started: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/getting-started/
- Worker as origin: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/worker-as-origin/
- Custom origin: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/custom-origin/
- Hostname validation: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/domain-support/hostname-validation/
- Pre-validation: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/domain-support/hostname-validation/pre-validation/
- Real-time validation: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/domain-support/hostname-validation/realtime-validation/
- Validate certificates: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/security/certificate-management/issue-and-validate/validate-certificates/
- HTTP DCV: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/security/certificate-management/issue-and-validate/validate-certificates/http/
- TXT DCV: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/security/certificate-management/issue-and-validate/validate-certificates/txt/
- Delegated DCV: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/security/certificate-management/issue-and-validate/validate-certificates/delegated-dcv/
- Issue certificates: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/security/certificate-management/issue-and-validate/issue-certificates/
- Renew certificates: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/security/certificate-management/issue-and-validate/renew-certificates/
- Token validity periods: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/reference/token-validity-periods/
- Certificate authorities: https://developers.cloudflare.com/ssl/reference/certificate-authorities/
- Certificate validity periods: https://developers.cloudflare.com/ssl/reference/certificate-validity-periods/
- Hostname routing (Workers for Platforms): https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/configuration/hostname-routing/
- Workers for Platforms pricing: https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/reference/pricing/
- Billing policy: https://developers.cloudflare.com/billing/understand/billing-policy/
- Registrar about: https://developers.cloudflare.com/registrar/about/
- Register a domain: https://developers.cloudflare.com/registrar/get-started/register-domain/
- Changelog, Cloudflare for SaaS PAYG updates (May 27, 2025): https://developers.cloudflare.com/changelog/post/2025-05-19-paygo-updates/

GitHub issues:
- workers-sdk#1917, Pages Functions catch-all route wins over `index.js`: https://github.com/cloudflare/workers-sdk/issues/1917
- workers-sdk#3662, Wrangler routes and SaaS custom hostnames: https://github.com/cloudflare/workers-sdk/issues/3662
- cloudflare-docs#2879, Explain the most specific Workers route: https://github.com/cloudflare/cloudflare-docs/issues/2879

Community (lower trust, not read):
- "Can't fetch static asset from other worker when invoked through service binding": https://community.cloudflare.com/t/cant-fetch-static-asset-from-other-worker-when-invoked-through-service-binding/635138

Public DNS (2026-09-12): `dig CAA plank.co`, `dig CAA packages.plank.co` (no records); `dig NS plank.co` (`dns1/dns2.registrar-servers.com`).
