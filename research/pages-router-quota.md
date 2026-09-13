# What happens when the Docs Site nears or passes 100,000 requests a day?

Research for [plank/docs#18](https://github.com/plank/docs/issues/18). Sources were read on 2026-09-13. Each fact cites its source, with the page's "Last updated" date where one was shown. Nothing was tested live: no Cloudflare account was used.

Markers: **[documented]** a primary source says it. **[community]** only a Cloudflare Community thread says it (poster and role given). **[inferred]** follows from documented facts but no source says it. **[not documented]** no source found.

`community.cloudflare.com` returned 403 to direct fetches, so threads were read from Internet Archive snapshots (`web.archive.org/web/<timestamp>id_/…`). Each thread link below is the original URL; the snapshot date is given.

## Setup (from ADR 0003)

`packages.plank.co` is a CNAME at Namecheap, with no Cloudflare zone for `plank.co`. It points to a Cloudflare Pages project on the Free plan. That project's Pages Function (the router) forwards each Docs Version's path through a Service binding to that Docs Version's Worker, which holds only static files. The router project also serves its own static files `/`, `404.html` and `/versions.json`, excluded from the Function by `_routes.json`.

## Short answers

| Question | Short answer |
| --- | --- |
| 1. Fail open: a Function-only path such as `/snapshots/13.x/getting-started/` | Pages serves the project's static assets instead of running the Function **[documented]**. No page says what a path with no matching asset gets. Pages' own asset rules give the nearest `404.html` with a 404, and fall back to SPA-style `index.html` only when there's no top-level `404.html` **[documented]**. The router ships a `404.html`, so the router's `404.html` with a 404 **[inferred]**. |
| 1. Fail open: `/` | `/` is excluded from the Function, so it's a static request either way, and static requests are "free and unlimited" **[documented]**. It gets the landing page before and after the limit **[inferred]**. |
| 1. Is fail open the default? Where is it set? | The default is **[not documented]**. It's set in the dashboard: **Workers & Pages** > project > **Settings** > **Runtime** > **Fail open / closed** **[documented]**. The API schema has a `fail_open` boolean on a Pages deployment config, described differently (below) **[documented]**. No Wrangler setting found **[not documented]**. |
| 2. Fail closed | "an error page will be returned" **[documented]**. The Workers docs name that error **1027** **[documented]**. That Pages returns 1027 is **[inferred]**. The HTTP status of the 1027 page is **[not documented]**. Cloudflare's old limit emails said users "will experience 5XX errors" **[community]**. |
| 2. Customising the error page on Free with no zone | Custom Errors plan table: Free "Availability: No", "Error Pages: No" **[documented]**. Account-level Error Pages are "on paid plans" **[documented]**. Whether any custom error applies to a Pages custom domain with no zone is **[not documented]**. |
| 3. Warnings before the limit | The Notifications catalog lists no Workers or Pages usage or limit alert. Its only usage alert, "Usage Based Billing", is Pro+ and Pay-as-you-go only **[documented]**. Emails at 75%, 90% and 100% of the daily limit are reported in the community, not in the docs **[community]**. Who receives them is **[not documented]**. Dashboard banners are **[not documented]**. |
| 4. Polling usage | GraphQL (`pagesFunctionsInvocationsAdaptiveGroups`, `workersInvocationsAdaptive`) with an **Account Analytics: Read** token **[documented]**. Delay is only described as "a slight delay" **[documented]**, with no figure **[not documented]**. Retention: 3 months in the dashboard, one-month query windows reaching back 3 months in the Workers tutorial **[documented]**. Exact Free limits for the Pages node can be read from the GraphQL `settings` node **[documented]**. No REST endpoint for request counts found **[not documented]**. |
| 5. After the limit | The limit is per account and shared by Workers and Pages Functions **[documented]**. Every Worker script and Pages Function on the account hits its own fail mode **[inferred]**. The Docs Version Worker has no script, and static-asset requests are "free and unlimited" **[documented]**. Behind the router, the binding isn't called once the Function stops running **[inferred]**. Deploys being blocked is **[not documented]**. Daily "[ACTION REQUIRED]" emails are reported **[community]**. |

## 1. Fail open, exactly

### What the docs say

- **The setting.** "If on the Workers Free plan, you can configure how Pages behaves when your daily free tier allowance of Pages Functions requests is exhausted." **[documented]** [Pages Functions routing, Apr 21 2026]
- **Where.** Dashboard: **Workers & Pages** > select the Pages project > **Settings** > **Runtime** > **Fail open / closed**. **[documented]** [Pages Functions routing]
- **What fail open does.** "'Fail open' means that static assets will continue to be served, even if Pages Functions would ordinarily have run first." **[documented]** [Pages Functions routing]
- **History.** The section was restored to the docs by cloudflare-docs PR #22331 (merged 2025-05-14, by a Cloudflare Pages engineer). The PR summary: "Mistakenly removed from the dashboard and documentation." **[documented]** [cloudflare-docs#22331]
- **Excluded routes.** Paths excluded by `_routes.json` "will not invoke the Function and will not incur a Functions invocation charge". Requests to static assets are "free and unlimited" on both plans, and "a request is considered static when it does not invoke Functions". **[documented]** [Pages Functions routing; Pages Functions pricing]

### A Function-only path (`/snapshots/13.x/getting-started/`)

- No page says what fail open returns for a path that has no static asset in the project. **[not documented]**
- How Pages serves static assets when no file matches: "Pages will then attempt to find the closest 404 page … ending in `/404.html`." "If your project does not include a top-level `404.html` file, Pages assumes that you are deploying a single-page application" and matches all paths to `/`. **[documented]** [Serving Pages, Apr 21 2026]
- The live test ([plank/docs#15](https://github.com/plank/docs/issues/15)) saw this asset layer at work under the limit, for paths the Function passed to `next()`. With no `404.html` in the router project, unknown paths got the router's `index.html` with a 200. After adding `404.html` they got a 404. [research/pages-router-live-test.md on `research/pages-router-live-test`]
- **[inferred]** Past the limit in fail open, the router project answers from its own static files as if the Function weren't there. It holds no Docs Version files, so `/snapshots/13.x/getting-started/` gets the router's `404.html` with a 404. With no top-level `404.html` it would get `index.html` with a 200 instead (the SPA fallback). This hasn't been observed past the limit.
- **[inferred]** The redirect from `/snapshots/` to the newest Docs Version is done by the Function (ADR 0003), so in fail open it doesn't run. `/snapshots/` gets the same not-found response.
- **[inferred]** The router's pass-through code (the `next()` fallback) runs the same asset layer. That layer is what workers-sdk's local Pages template calls "the fallback service (`env.ASSETS.fetch` in Pages' case)" [workers-sdk `pages-template-worker.ts`]. Whether Cloudflare's hosted fail open uses this same path isn't documented.

### `/`, `/404.html`, `/versions.json`

- They are excluded from the Function, so they are static requests that don't count and don't invoke the Function **[documented]** [Pages Functions routing; Pages Functions pricing].
- **[inferred]** They are served the same way under and over the limit, in either fail mode. The docs describe fail closed as returning an error page "rather than static assets". They don't say whether that also applies to paths `_routes.json` excludes. **[not documented]**

### Is fail open still the default?

- No Cloudflare page states the default. **[not documented]**
- **API.** The Cloudflare OpenAPI schema has a `fail_open` boolean on Pages deployment configs (production and preview), described as "Whether to fail open when the deployment config cannot be applied." (example `true`, required in responses). **[documented]** [cloudflare/api-schemas `openapi.json`; cloudflare-typescript `pages/projects.ts`] The description doesn't mention the daily limit. That it's the same dashboard toggle is **[inferred]**.
- **Wrangler.** Wrangler's `pages download config` test fixtures include `fail_open: true` in mocked API responses [workers-sdk `pages-download-config.test.ts`]. A code search of workers-sdk found no other `fail_open` handling, and no Pages Wrangler config key for it. **[not documented]** `@cloudflare/pages-shared` added a `failOpen` prop to deployment metadata in PR #2146 [pages-shared CHANGELOG].
- **Signal from the community.** In Dec 2024 a user with Pages static sites got "[ACTION REQUIRED] Daily request limit exceeded for Cloudflare Workers and/or Pages Functions" daily, and wrote: "even after exceeding that limit, the site continues to work." Their fail mode isn't stated. **[community]** [thread 744279, snapshot 2025-03-28]
- For comparison, on Worker routes fail open "Bypasses the Worker. Requests behave as if no Worker is configured." Fail mode is "toggl[ed] [per] route" in the dashboard **[documented]** [Workers limits, Sep 5 2026]. A Wrangler setting for route fail mode was requested in workers-sdk#2078 (closed) and asked about in the community in Mar 2024 (unanswered) [workers-sdk#2078; thread 634992, snapshot 2025-03-23]. **[not documented]**

## 2. Fail closed, exactly

- **Pages.** "'Fail closed' means an error page will be returned, rather than static assets." No status or error code is given. **[documented]** [Pages Functions routing]
- **Workers.** "When a Worker exceeds this limit, Cloudflare returns **Error 1027**." Fail closed "Returns a Cloudflare 1027 error page." **[documented]** [Workers limits, Sep 5 2026] Error 1027: "Worker exceeded free tier daily request limit." **[documented]** [Workers errors]
- **Pages metrics.** Invocation status "Exceeded resources" carries Workers error codes "1102, 1027". Causes include "excessive CPU time … startup time or free tier limits". **[documented]** [Pages Functions metrics, Apr 21 2026]
- **[inferred]** A Pages project in fail closed returns the Cloudflare 1027 error page.
- **HTTP status.** Not given on the Workers limits page, the Workers errors page, or the Cloudflare 1xxx errors index (which doesn't list 1027). **[not documented]** Cloudflare's limit emails (2020–2021, quoted in the community) said: "your end users will experience 5XX errors until the limit resets". **[community]** [threads 142671, 237040, 325405, 331556]
- **Page text.** A 2021 community answer guessed the page reads "Error 1027 This website has been temporarily rate limited", with no screenshot. **[community, unconfirmed]** [thread 283327, snapshot 2022-05-20]
- **A different mechanism, for context.** On Workers static assets with `run_worker_first`, requests over the free-tier limit "will receive a 429 (Too Many Requests) response instead of falling back to static asset serving". **[documented]** [Workers static assets billing, Apr 23 2026] That page is about Workers, not Pages.

### Can the page be customised on Free with no zone?

- Custom Errors plan table: Free has "Availability: No", "Number of rules: 0", "Error Pages: No". **[documented]** [Custom Errors, Sep 8 2026]
- "Error Pages can be defined at the zone level and at the account level on paid plans." Custom Errors cover errors from "a Cloudflare product (including Cloudflare Workers)". The 1000-class Error Page covers Cloudflare 1xxx errors. **[documented]** [Custom Errors; Error page types]
- Whether an account-level custom error applies to a Pages custom domain that has no zone on Cloudflare is **[not documented]**.
- The Pages Fail open / closed section offers no page option. **[documented]** [Pages Functions routing]

## 3. Warnings before the limit

### Cloudflare Notifications

- The Available Notifications catalog has no Workers section. **[documented]** [Available Notifications, Apr 24 2026] The related entries:
  - **Pages > Project updates.** Deployment started, failed or succeeded. "All Cloudflare plans." Not about usage.
  - **Billing > Usage Based Billing.** "a notification when the usage of a product goes above a set level". "Included with: Professional plans or higher." "available to Pay-as-you-go accounts only."
- **Who receives them.** Creating a notification takes the Super Administrator or Administrator role (or account edit). Each notification sends to an email address entered when it's created. Pro and Business get PagerDuty. "Accounts with a paid service" get webhooks. "Some notifications can only be created if you have a Professional, Business or Enterprise account". **[documented]** [Configure Cloudflare Notifications, May 4 2026]
- **Budget alerts and Billable Usage (2026).** "available to Pay-as-you-go accounts with usage-based products". Dollar-based thresholds. On by default from June 2026 for "eligible Pay-as-you-go accounts", at $10. **[documented]** [Changelog 2026-04-13; Changelog 2026-06-15] They measure spend, not Free-plan request counts.
- **Workers usage notifications (2021).** Cloudflare launched a weekly Workers usage summary and a CPU usage report ("triggered when a worker's CPU usage is 25% above its average"). "If you create a new free account with Workers, we'll enable both … by default." Both were opt-in under Notifications. Neither is about the daily request limit. **[documented, 2021]** [Cloudflare blog, Jul 22 2021] Neither appears in the current catalog. In Nov 2024 a user asked whether they'd changed, and got no answer [thread 681687, snapshot 2025-03-24]. Whether they still exist is **[not documented]**.

### Automatic emails about the daily limit

No Cloudflare doc describes them. **[not documented]** Community reports:

- Jan 2020: "You have exceeded the daily Cloudflare Worker limit of 100000 requests. If you do not take any action, your end users will experience 5XX errors until the limit resets …", received even with routes set to fail open. The same user also mentions emails "saying my limit is close/reached". **[community]** [thread 142671, snapshot 2021-05-02]
- Jan 2021: "90% of daily request limit for Cloudflare Workers reached". **[community]** [thread 235641, snapshot 2021-01-22]
- Nov 2021: subject "[ACTION REQUIRED] Daily request limit exceeded for Cloudflare Workers", with the same body and "set the route to fail open in the dashboard to continue to pass requests to your origin." **[community]** [threads 325405, 331556]
- Sep 2022: "75% of daily request limit reached for workers", then a "fully reached" email. **[community]** [thread 417495, snapshot 2022-10-06]
- Sep 2023: "From 75% to exceeded in 1 hour", warnings "emailed" while the user was away. **[community]** [thread 558419, snapshot 2023-12-03]
- Dec 2024 (Pages): "[ACTION REQUIRED] Daily request limit exceeded for Cloudflare Workers and/or Pages Functions", received daily. **[community]** [thread 744279]
- Jan 2025, answer from a Community MVP account (WalshyMVP): "Yes, I believe the alerts are at 75%, 90% and 100%. You can see usage stats on the dashboard or you can query GraphQL yourself as well." The asker's follow-up ("sent to the email registered with Cloudflare?") got no answer. **[community]** [thread 755523, snapshot 2025-03-26]

**Recipients.** Which address or which account members get these emails is **[not documented]**. One quoted email names the account ("… 's Account") [thread 237040].

### Dashboard banners

- **[not documented]** No doc describes a banner. In Dec 2024 a user wrote: "When I go to the dashboard, I can see that the request limit has been hit" (screenshot) **[community]** [thread 744279]. In 2022 a user saw the dashboard's account request summary show less than the emails; Cloudflare staff said it was being fixed **[community]** [thread 417495].

## 4. Polling usage ourselves

- **Endpoint and token.** All analytics go through `https://api.cloudflare.com/client/v4/graphql` [Querying Workers Metrics with GraphQL, Apr 23 2026]. The token needs Account > **Account Analytics** > **Read**. **[documented]** [Configure an Analytics API token, Apr 23 2026]
- **Datasets.** `pagesFunctionsInvocationsAdaptiveGroups` is listed under Cloudflare Pages, and `workersInvocationsAdaptive` under Workers. **[documented]** [Metadata boundary GraphQL datasets; Querying Workers Metrics with GraphQL] Nodes with the `Adaptive` suffix use adaptive sampling. **[documented]** [Datasets, Apr 23 2026] How much sampling applies at ~100,000 requests a day is **[not documented]**.
- **On Free.** "We allow access to ALL plans for the essential datasets". A query can read each node's `enabled`, `notOlderThan` (how far back) and `maxDuration` from the `settings` node for the account. **[documented]** [GraphQL settings node, Apr 23 2026] Whether the Pages node counts as "essential" isn't stated. The live test queried both nodes on a Free account successfully [research/pages-router-live-test.md].
- **Delay.** "Request traffic data may display a drop off near the last few minutes … a slight delay in aggregation and metrics delivery." **[documented]** [Pages Functions metrics; Workers metrics, Jul 1 2026] No figure is given. **[not documented]**
- **Retention.** Pages Functions metrics: "up to three months in the past in maximum increments of one week" (dashboard). **[documented]** [Pages Functions metrics] Workers GraphQL tutorial: "We can query up to one month of data for dates up to three months ago." **[documented]** [Querying Workers Metrics with GraphQL] Exact per-node limits on Free come from the `settings` node. **[not documented]** as fixed numbers.
- **Rate limits.** 300 GraphQL queries per 5 minutes per user. An account-scoped query covers 1 account. **[documented]** [GraphQL limits, Aug 25 2026]
- **What to sum.** The 100,000 is per account: "you could use 50,000 Functions requests and 50,000 Workers requests to use your full 100,000 daily request usage. The free plan daily request limit resets at midnight UTC." **[documented]** [Pages Functions pricing] **[inferred]** "Today's" count is the sum of both nodes from 00:00 UTC. Counting only the router's Pages node leaves out any Worker scripts elsewhere on the account.
- **A REST endpoint.** Found **[not documented]**. The Cloudflare OpenAPI schema has no Workers or Pages REST path that returns request counts (searched for paths containing usage, analytics, metrics, telemetry, observability, stats). The closest match:
  - `GET /accounts/{account_id}/workers/observability/usage` ("Get event count") returns Workers Observability **event** counts by dataset and service, bucketed by day, for up to 90 days. Its token groups are Workers Observability Read or Write. **[documented]** [cloudflare/api-schemas `openapi.json`] These are log events, not requests.
  - Workers Logs is marked unsupported for Pages in the Pages-to-Workers compatibility matrix. **[documented]** [Migrate from Pages to Workers, Aug 14 2026]
  - **[inferred]** So this endpoint doesn't cover the router.
- **Logs.** `wrangler pages deployment tail` streams live logs for a Pages deployment. **[documented]** [Pages Functions debugging and logging] It's a live stream, not a count.

## 5. After the limit

- **Scope.** "The 100K daily limit of Workers requests applies to the account." (Community answer, Dec 2024.) **[community]** [thread 746426] The docs say the same through the shared quota example. **[documented]** [Pages Functions pricing]
- **Other Workers.** Every Worker with a script, and every Pages Function, on the account is past the same limit. Each follows its own fail mode (per route for Workers, per project for Pages). **[inferred]** from the account-level limit [Workers limits; Pages Functions routing]. A 2021 community answer: the failure mode "only triggers when a worker would have been invoked had the 100k limit not been hit". **[community]** [thread 283327]
- **The Docs Version Worker behind the Service binding:**
  - It holds only static files. In the live test it recorded no invocations, directly or through the binding [research/pages-router-live-test.md]. "Requests to static assets are free and unlimited." **[documented]** [Workers static assets billing]
  - **[inferred]** Past the limit the router's Function doesn't run, so it makes no binding call. The Docs Version Worker gets no traffic through the router, in either fail mode.
  - **[inferred]** Requests straight to the Docs Version Worker (e.g. its `workers.dev` URL, if enabled) are static-asset requests and are unaffected.
  - **[not documented]** No doc says whether a files-only Worker is affected by an account over the daily limit.
- **Deploys.** No source ties the daily request limit to deploys, builds or bindings. **[not documented]** Pages' separate build limit is 500 builds a month per account [thread 431961, answer from a Community MVP account].
- **Emails.** "[ACTION REQUIRED]" emails when the limit is exceeded, reported as daily while it keeps being exceeded. **[community]** [threads 744279, 558419] Their wording since 2021 has said to upgrade to the Paid plan, or set routes to fail open. **[community]**
- **History, for context.** In 2022, before Pages Functions billing existed, a Cloudflare Pages team member offered a free Functions limit increase through a form "while we don't have billing". **[community]** [thread 377828, snapshot 2022-05-23] In 2023 one user said Cloudflare support "removed the limit" during an incident. **[community, one account]** [thread 558419] Neither is in the current docs.
- **Reset.** The limit resets at midnight UTC, and the fail mode ends then. **[documented]** [Workers limits; Pages Functions pricing]

## Open, not documented

- What fail open returns for a path with no static asset in the Pages project (router `404.html` with a 404 is inferred).
- Whether fail open is the default for a new Pages project, and whether the API's `fail_open` field is the same toggle.
- The HTTP status of the Pages fail-closed page, and whether it's the 1027 page.
- Whether fail closed also blocks paths excluded by `_routes.json`.
- Whether any custom error page applies to a Pages custom domain with no zone.
- Who receives the 75% / 90% / 100% limit emails, and whether they are still sent.
- Whether the 2021 Workers weekly summary and CPU notifications still exist.
- GraphQL delay in minutes, and `notOlderThan` / `maxDuration` for `pagesFunctionsInvocationsAdaptiveGroups` on Free.
- Whether a files-only Worker is affected when the account is over the daily limit.

## Sources

Cloudflare docs:

- Pages Functions routing (Fail open / closed, `_routes.json`): https://developers.cloudflare.com/pages/functions/routing/
- Pages Functions pricing: https://developers.cloudflare.com/pages/functions/pricing/
- Pages Functions metrics: https://developers.cloudflare.com/pages/functions/metrics/
- Pages Functions debugging and logging: https://developers.cloudflare.com/pages/functions/debugging-and-logging/
- Serving Pages (404 and SPA behaviour): https://developers.cloudflare.com/pages/configuration/serving-pages/
- Pages custom domains: https://developers.cloudflare.com/pages/configuration/custom-domains/
- Workers limits (daily requests): https://developers.cloudflare.com/workers/platform/limits/#daily-requests
- Workers errors (1027): https://developers.cloudflare.com/workers/observability/errors/
- Workers metrics and analytics: https://developers.cloudflare.com/workers/observability/metrics-and-analytics/
- Workers static assets billing: https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
- Migrate from Pages to Workers (compatibility matrix): https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/
- Workers Observability Query Builder: https://developers.cloudflare.com/workers/observability/query-builder/
- Cloudflare 1xxx errors: https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/
- Custom Errors: https://developers.cloudflare.com/rules/custom-errors/
- Error page types: https://developers.cloudflare.com/rules/custom-errors/reference/error-page-types/
- Available Notifications: https://developers.cloudflare.com/notifications/notification-available/
- Configure Cloudflare Notifications: https://developers.cloudflare.com/notifications/get-started/
- GraphQL limits: https://developers.cloudflare.com/analytics/graphql-api/limits/
- GraphQL settings node: https://developers.cloudflare.com/analytics/graphql-api/features/discovery/settings/
- GraphQL datasets: https://developers.cloudflare.com/analytics/graphql-api/features/data-sets/
- Analytics API token: https://developers.cloudflare.com/analytics/graphql-api/getting-started/authentication/api-token-auth/
- Querying Workers Metrics with GraphQL: https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-workers-metrics/
- Metadata boundary GraphQL datasets: https://developers.cloudflare.com/data-localization/metadata-boundary/graphql-datasets/
- Changelog, Billable Usage and Budget alerts: https://developers.cloudflare.com/changelog/post/2026-04-13-billable-usage-dashboard-and-budget-alerts/
- Changelog, Budget alerts on by default: https://developers.cloudflare.com/changelog/post/2026-06-15-budget-alerts-default-on/

Cloudflare blog and source:

- Introducing Workers Usage Notifications (Jul 22 2021): https://blog.cloudflare.com/introducing-workers-usage-notifications/
- cloudflare-docs PR #22331 (Pages Fail open/closed docs restored): https://github.com/cloudflare/cloudflare-docs/pull/22331
- Cloudflare OpenAPI schema (`fail_open`, `/workers/observability/usage`): https://github.com/cloudflare/api-schemas/blob/main/openapi.json
- cloudflare-typescript Pages projects (`fail_open`): https://github.com/cloudflare/cloudflare-typescript/blob/main/src/resources/pages/projects/projects.ts
- workers-sdk `pages-download-config.test.ts`: https://github.com/cloudflare/workers-sdk/blob/main/packages/wrangler/src/__tests__/pages/pages-download-config.test.ts
- workers-sdk `pages-template-worker.ts`: https://github.com/cloudflare/workers-sdk/blob/main/packages/wrangler/templates/pages-template-worker.ts
- workers-sdk pages-shared CHANGELOG (`failOpen`, PR #2146): https://github.com/cloudflare/workers-sdk/blob/main/packages/pages-shared/CHANGELOG.md
- workers-sdk#2078 (route `fail_open` in Wrangler): https://github.com/cloudflare/workers-sdk/issues/2078

Cloudflare Community (read via Internet Archive):

- 142671 Worker limit fail open not working (Jan 2020): https://community.cloudflare.com/t/worket-limit-fail-open-not-working/142671
- 235641 Daily request limit for Cloudflare Workers reached (Jan 2021): https://community.cloudflare.com/t/daily-request-limit-for-cloudflare-workers-reached/235641
- 237040 Daily request limit exceeded for Cloudflare Workers (Jan 2021): https://community.cloudflare.com/t/daily-request-limit-exceeded-for-cloudflare-workers/237040
- 283327 100k+ requests per day Workers question (Jul 2021): https://community.cloudflare.com/t/100k-requests-per-day-workers-question/283327
- 288306 Introducing Workers Usage Notifications (Jul 2021): https://community.cloudflare.com/t/introducing-workers-usage-notifications/288306
- 325405 [ACTION REQUIRED] Daily request limit exceeded (Nov 2021): https://community.cloudflare.com/t/cloudflare-action-required-daily-request-limit-exceeded-for-cloudflare-workers/325405
- 331556 [ACTION REQUIRED] Daily request limit exceeded (Nov 2021): https://community.cloudflare.com/t/action-required-daily-request-limit-exceeded-for-cloudflare-workers/331556
- 377828 Increased Pages functions limit (Apr 2022): https://community.cloudflare.com/t/increased-pages-functions-limit/377828
- 407342 Unable to create workers usage notification (Aug 2022): https://community.cloudflare.com/t/unable-to-create-workers-usage-notification-no-support-response/407342
- 417495 Cloudflare Workers Limit Notification (Sep 2022): https://community.cloudflare.com/t/cloudflare-workers-limit-notification/417495
- 431961 Cloudflare Pages limits (free plan) (Nov 2022): https://community.cloudflare.com/t/cloudflare-pages-limits-free-plan/431961
- 558419 [ACTION REQUIRED] Daily request limit exceeded (Sep 2023): https://community.cloudflare.com/t/cloudflare-action-required-daily-request-limit-exceeded/558419
- 634992 Configure worker to fail open with wrangler (Mar 2024): https://community.cloudflare.com/t/configure-worker-to-fail-open-with-wrangler/634992
- 681687 How to create an alert for the workers (Jul 2024): https://community.cloudflare.com/t/how-to-create-an-alert-for-the-workers/681687
- 744279 Troubleshooting daily request limit exceeded (Dec 2024, Pages): https://community.cloudflare.com/t/troubleshooting-daily-request-limit-exceeded-identifying-the-requests/744279
- 746426 Clarification on Free Request Limit for Workers and Pages (Dec 2024): https://community.cloudflare.com/t/clarification-on-free-request-limit-for-cloudflare-workers-and-pages/746426
- 755523 Monitoring usage limits and notifications, Workers Free (Jan 2025): https://community.cloudflare.com/t/monitoring-usage-limits-and-notifications-for-cloudflare-workers-free-plan/755523

This repo:

- ADR 0003: `docs/adr/0003-pages-router-in-front-of-a-worker-per-docs-version.md`
- Live test: `research/pages-router-live-test.md` on branch `research/pages-router-live-test`
- Earlier research: `research/cloudflare-pages-router-saas.md` on branch `research/cloudflare-pages-router-saas`
