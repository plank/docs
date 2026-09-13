# Packages declare themselves in a Docs Config, read by a scheduled router run

Each Package puts itself on the Docs Site with a Docs Config on its default branch. The file lists the Package's Major Lines and how the Package is presented on the landing page.

A router run in `plank/docs` reads those files. It's scheduled at most daily and can also be run by hand. Each run:

1. lists the `plank` org's public, non-archived repos with no GitHub token, and reads each one's Docs Config;
2. routes only the Docs Versions that are both listed and deployed as a `docs-<repo>-<major>` Worker;
3. redeploys the router only when that list has changed: its Service bindings, the landing page, `404.html` and `/versions.json`;
4. then deletes the Docs Version Workers it no longer routes.

The User chose this on 2026-09-12 in [How do the landing page and version switcher learn which Packages and Docs Versions exist?](https://github.com/plank/docs/issues/11), and set that a private repo never has published docs.

## Considered Options

- **A registry file in `plank/docs`.** Router deploys stay in one repo and need no cross-repo token. But every new Package or Major Line needs a second PR, in a second repo.
- **A list built from the Workers on Cloudflare**, with each Package's deploy redeploying the router. GitHub documents `concurrency` groups per repo, so deploys from different Package repos can't queue behind each other. Lockstep releases can race, and the last router deploy to finish can miss a Docs Version.
- **Actions variables or secrets in each Package.**
  - Another repo can read variables only with a collaborator-access token. It can't read secrets at all.
  - There's no review, no history and no event when they change.
- **Finding Packages by GitHub topic or code search.**
  - A topic is a second thing to set on each Package.
  - Code search needs a token, and its index lags behind a push.
- **Each Package's deploy triggering the router run.**
  - It's faster, but it needs a GitHub App or personal access token shared with every Package.
  - A Package made private or archived never triggers anything, so its docs would stay up.
- **Forwarding by URL to `workers.dev` instead of a binding per Docs Version**, so the router never redeploys.
  - Every Docs Version would need a public `workers.dev` copy, and how its requests are counted is untested.
  - ADR 0003's bindings stay.
- **Writing the list into each Docs Version at build time.** Every sibling Docs Version would need a rebuild whenever one goes live.

## Consequences

- **The Docs Config on `main` decides both what the Docs Tooling builds and what the router routes.** The Docs Tooling refuses to build a Major Line the Docs Config doesn't list.
- **Paths come from repo names.** A Package's path is its repo name (`packages.plank.co/<repo>`), so renaming a repo moves its path.
- **The newest Docs Version** is the highest routed Major Line, compared as numbers.
- **The list is read at runtime.** The landing page and version switchers read `/versions.json`. The router serves it as a static file excluded from its Function.
- **Changes wait for the next router run.** Until then a new Docs Version 404s, and a Package made private or archived stays live. That's up to about a day, unless someone runs it by hand.
- **Keeping private repos off the Docs Site takes three guards besides discovery:**
  - The Cloudflare token is shared with selected repos only.
  - The Docs Tooling refuses private repos.
  - Docs Version Workers deploy with `workers_dev = false` and previews off, so a Docs Version isn't viewable before it's routed.
- **Errors fail safe:**
  - A failed scan stops the run.
  - If a Docs Config can't be read, its Package's entries carry over unchanged from the live `/versions.json`. The run still routes, redeploys and deletes as usual, then fails, naming each Package whose Docs Config couldn't be read. It stays red, with a notice each day, until the Docs Config is fixed.
- **The router run keeps its own schedule on.** GitHub turns a public repo's schedule off after 60 days with no activity, and doesn't define activity. So each run re-enables its own workflow through GitHub's API, with the run's own token (`actions: write`), in a job of its own that runs even when the router job fails. GitHub doesn't document that this resets the 60 days. It's seen working on Silverstripe's repos, and the builder confirms the call and the run's actor on the stand-in. Decided on 2026-09-13 in [How does anyone notice when the router run stops working?](https://github.com/plank/docs/issues/24).
- **A failed run is noticed only through GitHub's own notice** to the user the cron line belongs to, and only if that user's Actions notifications are on. That user is one of the named few (ADR 0008). If their GitHub account is deleted, the schedule stops (community reports), and nothing notices. Scheduled runs can also be delayed, or dropped at busy times.
- **The router run needs its own Cloudflare token.** It must be able to deploy the router's Pages project and list and delete Workers.
