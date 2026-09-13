# Search engines and the Docs Site

Facts gathered 2026-09-13 for planning how search engines see the Docs Site (`packages.plank.co`), its Docs Versions, and the `*.pages.dev` / `*.workers.dev` stand-ins. Costs and mechanisms only; nothing here decides anything. "Inferred" marks anything not stated by a source or seen in a test.

Starlight facts come from its source at `withastro/starlight@39d4e71` (2026-09-08, `@astrojs/starlight` 0.42.0) and from a probe build (Starlight 0.42.0, Astro 7.3.2, `@astrojs/sitemap` 3.7.4) with `site: 'https://packages.plank.co'`, `base: '/snapshots/13.x/'`.

## 1. What Starlight emits

**With `site` set**, every page gets an absolute self-canonical that includes `base`, plus a matching `og:url`. The probe's output:

```html
<link rel="canonical" href="https://packages.plank.co/snapshots/13.x/guides/intro/"/>
<link rel="sitemap" href="/snapshots/13.x/sitemap-index.xml"/>
<meta property="og:url" content="https://packages.plank.co/snapshots/13.x/guides/intro/"/>
```

The canonical is `new URL(context.url.pathname, context.site)`, formatted by `trailingSlash`/`build.format` ([head.ts L21–27](https://github.com/withastro/starlight/blob/39d4e71f23b3fb6fde0e77eb983fcd38629b70b9/packages/starlight/src/utils/head.ts#L21-L27), [canonical.ts](https://github.com/withastro/starlight/blob/39d4e71f23b3fb6fde0e77eb983fcd38629b70b9/packages/starlight/src/utils/canonical.ts)).

**Without `site`**, pages have no canonical, `og:url` or `rel="sitemap"`, and no sitemap is written. The build logs `The Sitemap integration requires the astro.config option. Skipping.` This was seen in the probe; it matches [head.ts L21, L104–113](https://github.com/withastro/starlight/blob/39d4e71f23b3fb6fde0e77eb983fcd38629b70b9/packages/starlight/src/utils/head.ts#L104-L113) and [sitemap index.ts L100–105](https://github.com/withastro/astro/blob/7a698ca6e70d778343786cbf8fedd5f49d169ea4/packages/integrations/sitemap/src/index.ts#L100-L105).

**Sitemap.** Starlight adds `@astrojs/sitemap` itself unless one is already in the integrations ([index.ts L104–106](https://github.com/withastro/starlight/blob/39d4e71f23b3fb6fde0e77eb983fcd38629b70b9/packages/starlight/src/index.ts#L104-L106)). The integration runs only when `site` is set ([Starlight guide](https://starlight.astro.build/guides/customization/): "Enable sitemap generation by setting your URL as `site`").
- Files are written to the build root, not under the `base` folder: `dist/sitemap-index.xml` and `dist/sitemap-0.xml`. Astro's `dist/` doesn't nest by `base`; ADR 0003 has the Docs Tooling move files under the path prefix.
- The index's `<loc>` and every page URL are absolute and include `base`, e.g. `https://packages.plank.co/snapshots/13.x/sitemap-0.xml` (probe).
- So once served it sits at `/snapshots/13.x/sitemap-index.xml`, which is where the `rel="sitemap"` link points (`fileWithBase('/sitemap-index.xml')`).

**404.**
- **Sitemap.** The 404 page is left out of the sitemap: `@astrojs/sitemap` drops any path equal to `404` or `500` ([index.ts L63–81, L122, L136](https://github.com/withastro/astro/blob/7a698ca6e70d778343786cbf8fedd5f49d169ea4/packages/integrations/sitemap/src/index.ts#L63-L81)). Confirmed in the probe.
- **Canonical, robots and search.** The built `404.html` still carries `<link rel="canonical" href="https://packages.plank.co/snapshots/13.x/404/">` and no robots meta. Starlight's fallback 404 entry sets `pagefind: false` ([routing/data.ts L125–154](https://github.com/withastro/starlight/blob/39d4e71f23b3fb6fde0e77eb983fcd38629b70b9/packages/starlight/src/utils/routing/data.ts#L125-L154)).
- *Inferred:* when a Worker serves this file for a missing URL, the page names `/snapshots/13.x/404/` as its canonical.

**Robots.** Starlight and Astro emit no `robots.txt` and no robots meta by default.
- The Starlight source has no `robots` string, and the probe produced neither.
- The [Astro sitemap guide](https://docs.astro.build/en/guides/integrations-guide/sitemap/) says to add `Sitemap: https://<YOUR SITE>/sitemap-index.xml` to a `robots.txt` you write yourself.

**Per-page `head`.** Frontmatter `head` takes `HeadConfig[]` ([frontmatter reference](https://starlight.astro.build/reference/frontmatter/)). Heads merge in the order defaults, then config `head`, then page `head`. A later entry replaces an earlier one that matches it:
- any `<title>`;
- a `<meta>` with the same `name`, `property` or `http-equiv`;
- any `<link rel="canonical">`;
- any `<link rel="sitemap">`.

([head.ts L127–195](https://github.com/withastro/starlight/blob/39d4e71f23b3fb6fde0e77eb983fcd38629b70b9/packages/starlight/src/utils/head.ts#L127-L195)).

In the probe, a page setting its own canonical plus `robots: noindex` got exactly one canonical (its own) and the robots meta. Its `og:url` still named its own URL, and the page stayed in the sitemap: the sitemap doesn't read page heads.

The global config `head` goes through the same merge, so one entry there reaches every page of that build.

**Confidence:** high (source plus probe build).

## 2. Sitemap scope

- **A sitemap covers only its own directory.** A sitemap at `/snapshots/13.x/sitemap-index.xml` covers only `https://packages.plank.co/snapshots/13.x/…`.
  - sitemaps.org: "A Sitemap file located at http://example.com/catalog/sitemap.xml can include any URLs starting with http://example.com/catalog/ but can not include URLs starting with http://example.com/images/". The URLs must also share its protocol and host ([protocol](https://www.sitemaps.org/protocol.html)).
  - Google: "Unless you submit your sitemap through Search Console, a sitemap affects only descendants of the parent directory" ([build-sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), updated 2026-07-08).
- **Index children must be on the same site, in the same directory or lower.**
  - Google: "The referenced sitemaps must be hosted on the same site as your sitemap index file" and "must be in the same directory as the sitemap index file, or lower in the site hierarchy". This is waived with cross-site submission ([large-sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps), updated 2025-12-10).
  - sitemaps.org: "A Sitemap index file can only specify Sitemaps that are found on the same site as the Sitemap index file."
  - So a root index may list `/snapshots/13.x/…` sitemaps. Whether an index may list another index: both sources are silent.
- **Root `robots.txt` can list sitemaps anywhere, several of them.**
  - Google: the `sitemap` line must be "a fully qualified URL". "The URL doesn't have to be on the same host as the robots.txt file." "You can specify multiple `sitemap` fields, with no limit". It "isn't tied to any specific user agent" ([robots.txt spec](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt), updated 2026-08-31).
  - sitemaps.org: "You can specify more than one Sitemap file per robots.txt file".
  - Bing's help page didn't render when fetched. Bing's 2008 post says a `robots.txt` reference lets sitemap files live "just about anywhere", with URLs "within the same domain as the robots.txt file" ([Bing blog](https://blogs.bing.com/webmaster/February-2008/Microsoft-to-support-cross-domain-Sitemaps)). None of the Bing pages fetched explicitly says whether several `Sitemap:` lines are honoured.
- **`rel="sitemap"` isn't a Google submission method.** Google documents four methods: the Search Console Sitemaps report, the Search Console API, a `robots.txt` line, and WebSub for feeds. `<link rel="sitemap">` isn't among them ([build-sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)).
- **Only the router can serve root files.** Serving `/robots.txt` or a root sitemap index means the Pages router serving it (ADR 0003).

**Confidence:** high for Google and sitemaps.org; low for Bing (no current first-party page read).

## 3. Versions, duplicates, canonicals, redirects

**Google's guidance.** A search of developers.google.com turned up no page specific to versioned documentation; these are its general canonicalization pages.

- **Canonical is a hint.** "Indicating a canonical preference is a hint, not a rule". "Google may choose a different page as canonical than you do" ([canonicalization](https://developers.google.com/search/docs/crawling-indexing/canonicalization), updated 2026-08-20).
- **Near-duplicates are clustered.** Google clusters near-duplicates and picks the one that is "objectively the most complete and useful". The factors it lists are HTTPS, redirects, sitemap presence and `rel="canonical"`.
- **Signal strength.** Redirects are "a strong signal that the target of the redirect should become canonical". `rel="canonical"` is "a strong signal". Sitemap inclusion is "a weak signal" ([consolidate-duplicate-urls](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), updated 2026-07-10).
- **Don'ts.** Google says not to use `robots.txt` for canonicalization ("Google may still index URLs that are disallowed in robots.txt without their content"). It says not to use `noindex` to steer canonical selection ("it will completely block the page from Search. `rel="canonical"` link annotations are the preferred solution").
- **Canonical to a page with different content.** Google's 2013 post lists this among the common mistakes: rel=canonical is meant for duplicate or very similar content ([5 common mistakes](https://developers.google.com/search/blog/2013/04/5-common-mistakes-with-relcanonical)).
- **What Search Console reports.** Its statuses include "Duplicate, Google chose different canonical than user" and "Alternate page with proper canonical tag" ([page indexing report](https://support.google.com/webmasters/answer/7440203)).
- **`noindex`.** Set by `<meta name="robots" content="noindex">` or `X-Robots-Tag: noindex`. It works only if the URL isn't blocked by `robots.txt`, and takes effect on recrawl, which "can take months" ([block-indexing](https://developers.google.com/search/docs/crawling-indexing/block-indexing), updated 2025-12-10).

**Redirects** ([redirects](https://developers.google.com/search/docs/crawling-indexing/301-redirects), updated 2026-04-14):
- **301/308:** "the indexing pipeline uses the redirect as a signal that the redirect target should be canonical."
- **302/303/307:** "Googlebot follows the redirect, but the indexing pipeline doesn't use the redirect as a signal that the redirect target should be canonical."
- The page says nothing about temporary redirects being treated as permanent over time.
- "Page with redirect … this URL will not be indexed" ([page indexing report](https://support.google.com/webmasters/answer/7440203)).
- *Inferred:* a 302 from `/snapshots/` to `/snapshots/13.x/` gives Google no canonical signal toward `/snapshots/13.x/`. A 301 or 308 would, and the target would then change as the newest Docs Version changes.

**What others do** (live HTML and `robots.txt`, fetched 2026-09-13):

| Site | Canonical | Robots | Sitemap |
|---|---|---|---|
| laravel.com | `/docs/12.x/routing` 301s to `/framework/docs/12.x/routing`, which self-canonicals; 11.x does the same. Unversioned `/docs/routing` 301s to `/framework/docs/routing`, 200, self-canonical. | No robots meta. `robots.txt` has only `Disallow: /cdn-cgi/` and no `Sitemap:`. | `/sitemap.xml` is an index. Its `website-sitemap.xml` lists unversioned `/framework/docs/…` URLs and no `/N.x/` URLs. |
| docs.python.org | `/3.10/`, `/3.12/` and `/3/` pages all canonical to `/3/library/os.html`. | No robots meta. `robots.txt` has `Disallow: /2/`, `/2.0/` … `/3.9/` ("Disallow EOL versions"), plus `/dev` and `/release`. | `Sitemap: https://docs.python.org/sitemap.xml`, which lists `/3/` and `/3.10/`–`/3.16/` roots. |
| symfony.com | `/doc/6.4/…` and `/doc/7.3/…` canonical to `/doc/current/…`. | `<meta name="robots" content="index, follow, all">` on every version. | `robots.txt` lists `Sitemap: https://symfony.com/sitemap.xml`. |
| Read the Docs (documented) | Canonical URL "takes into account … The default version of your project (usually 'latest' or 'stable')" and the primary custom domain; passed to builds as `READTHEDOCS_CANONICAL_URL` ([canonical-urls](https://docs.readthedocs.com/platform/stable/canonical-urls.html)). Live, its own docs' `/latest/` canonicals to `/latest/` and `/stable/` to `/stable/`. | Generated `robots.txt` "Hides versions which are set to Hidden" and allows the rest ([robots reference](https://docs.readthedocs.com/platform/stable/reference/robots.html)). Live: `Disallow: /platform/latest/ # Hidden version`. | The sitemap "includes public and not hidden versions … sorted by version number" ([sitemaps reference](https://docs.readthedocs.com/platform/stable/reference/sitemaps.html)). |

**Confidence:** high for Google quotes and live observations. The Read the Docs doc and its live output differ in form; both are recorded as seen.

## 4. Temporary 404s

**Google on 4xx:**
- "Google doesn't index URLs that return a `4xx` status code, and URLs that are already indexed and return a `4xx` status code are removed from the index". "The crawling frequency gradually decreases" ([HTTP status codes](https://developers.google.com/search/docs/crawling-indexing/http-network-errors), updated 2026-02-04).
- For a 404 in Search Console: "Googlebot will probably continue to try this URL for some period of time" ([page indexing report](https://support.google.com/webmasters/answer/7440203)).
- Google states no timing for how fast a 404ing URL drops, or how fast it returns after 200 resumes.
- On a whole-site removal: "There's no fixed time for a recovery from a complete removal, and there's no mechanism to speed that up." It says not to use 403/404/410 for a temporary closure, since "This will remove the website's URLs from Google Search" ([pause online business](https://developers.google.com/search/docs/crawling-indexing/pause-online-business), updated 2025-12-10).

**Google on 5xx and 429:**
- 5xx and 429 slow crawling. "Already indexed URLs are preserved in the index, but eventually dropped" ([HTTP status codes](https://developers.google.com/search/docs/crawling-indexing/http-network-errors)).
- For emergencies Google suggests `500`/`503`/`429`, but not "longer than 1-2 days"; after multiple days "the URL may be dropped from Google's index" ([reduce crawl rate](https://developers.google.com/crawling/docs/crawlers-fetchers/reduce-crawl-rate), updated 2025-12-18).
- A 2xx page showing an error is reported as a soft 404.

**Cloudflare Pages when the Function doesn't run:**
- Fail open means "static assets will continue to be served, even if Pages Functions would ordinarily have run first" ([Functions routing](https://developers.cloudflare.com/pages/functions/routing/)). Pages serves the nearest `404.html` for a missing path ([serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/)).
- `_headers` sets headers, not status ([headers](https://developers.cloudflare.com/pages/configuration/headers/)).
- `_redirects` supports 301/302/303/307/308 and 200 "Proxying" to relative URLs on the same site. Its table marks "Rewrites (other status codes) ❌", with the example `/blog/* /blog/404.html 404` ([redirects](https://developers.cloudflare.com/pages/configuration/redirects/)).
- `_redirects` "are not applied to requests served by Pages Functions".
- The docs are silent on whether `_redirects`/`_headers` apply in fail-open mode. None of the pages read documents a way to give a static response a 503 or 429.
- *Inferred, untested:* in fail-open mode, a `_redirects` 200 proxy rule would serve a file with 200, and Google treats a 200 error page as a soft 404.

**Confidence:** high for Google quotes; medium for the Cloudflare fail-open edge (docs silent, untested).

## 5. Cloudflare stand-ins and `X-Robots-Tag`

- **Pages preview deployments** get it automatically: "By default, every preview deployment generated by Cloudflare Pages includes the `X-Robots-Tag: noindex` HTTP response header" ([preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/); also [serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/)).
- **Pages production `*.pages.dev`:**
  - Docs: silent.
  - Live: `hono.pages.dev` and `astro.pages.dev` returned 200 with no `X-Robots-Tag`.
  - Pages documents a `_headers` recipe that adds `X-Robots-Tag: noindex` to `https://:project.pages.dev/*` and `https://:version.:project.pages.dev/*` ([headers](https://developers.cloudflare.com/pages/configuration/headers/)).
- **`*.workers.dev`:**
  - Docs: no automatic header is documented ([workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/), [preview URLs](https://developers.cloudflare.com/workers/configuration/previews/): silent).
  - The Workers static-assets `_headers` doc gives an example "to prevent your `*.*.workers.dev` URLs from being indexed" ([static-assets headers](https://developers.cloudflare.com/workers/static-assets/headers/)).
  - Live: three `*.workers.dev` hosts returning 200 sent no `X-Robots-Tag`.
- **`_headers` can set `X-Robots-Tag`** in both products (examples above). In each, it applies only to static-asset responses:
  - Pages: "not applied to responses generated by Pages Functions, even if the request URL matches a rule"; headers there go on the Function's `Response`.
  - Workers: "not applied to responses generated by your Worker code".
- **Through a Service binding:**
  - Docs: the Service binding docs are silent on header changes ([service bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/http/)).
  - *Inferred:* a response the router Function returns from `env.X.fetch()` keeps the headers the Docs Version Worker set, including its own `_headers` rules. It is a Function response, so the router's `_headers` rules don't apply to it.
  - Untested: whether Pages' automatic preview `X-Robots-Tag` is added to Function responses on a preview deployment.

**Confidence:** high for the documented rules; medium for production `pages.dev`/`workers.dev` (docs silent, a few live samples); low for Service-binding pass-through (inferred).

## 6. Search Console verification

- **Property types** ([add a property](https://support.google.com/webmasters/answer/34592)):
  - **Domain property:** covers all subdomains and protocols, and can be a subdomain such as `m.example.com`. "DNS record verification only".
  - **URL-prefix property:** covers one protocol and host prefix; "Many possible methods".
- **Methods** ([verification](https://support.google.com/webmasters/answer/9008080)):
  - **HTML file upload** (URL-prefix only): the file sits at the property's root, e.g. `https://packages.plank.co/<file>.html`. "Search Console does not follow redirects when looking for this file", except same-domain ones such as http to https.
  - **HTML `<meta>` tag** (URL-prefix only): in the homepage `<head>`; the homepage can't require sign-in.
  - **Google Analytics / Google Tag Manager** (URL-prefix only): the snippet on the homepage, same Google account.
  - **Google Sites / Blogger:** not relevant here.
  - **DNS TXT or CNAME record** at the domain provider: required for Domain properties. "Verifying ownership of a root domain automatically verifies ownership of all subdomains". It can take "up to two or three days", and the record must stay in place.
- **DNS at Namecheap, CNAME at `packages.plank.co`:**
  - RFC 1034 §3.6.2: "If a CNAME RR is present at a node, no other data should be present" ([RFC 1034](https://www.rfc-editor.org/rfc/rfc1034.html)).
  - *Inferred:* a TXT at the `packages.plank.co` name conflicts with its CNAME. A Domain property for `plank.co` (TXT at the apex) or a URL-prefix property for `https://packages.plank.co/` avoids that name. Where Google's generated record for a subdomain Domain property must go wasn't confirmed.
  - The HTML file and meta tag methods need the router to serve that file or tag at `/`.
  - Whether the zone is on Cloudflare doesn't enter into any Google method.

**Confidence:** high for methods; medium for the CNAME/TXT interaction (RFC is primary, placement inferred).
