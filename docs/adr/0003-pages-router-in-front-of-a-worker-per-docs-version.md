# A Pages router in front of a Worker per Docs Version

`plank.co`'s DNS stays at Namecheap, so `packages.plank.co` is a CNAME to a Cloudflare Pages project on the free plan. That project holds only a router: a Pages Function that forwards each Docs Version's path (e.g. `/snapshots/13.x/`) through a Service binding to that Docs Version's own Worker, and sends `/snapshots/` to the newest Docs Version. Each Docs Version's Worker holds only static files, under its path prefix, and is deployed by its Major Line's release workflow, so no release redeploys anything else. The User chose this on 2026-09-12, after a live test showed it working ([Prove a Pages router can serve a Docs Version's Worker on Cloudflare's free plan](https://github.com/plank/docs/issues/15)).

## Considered Options

- **A whole-site Pages project.** Its requests are free and unlimited, but every release deploys the whole site, lining up releases across Package repos. The User called that "a big can of worms".
- **Cloudflare for SaaS on a second domain.** It needs a payment method on file and a second domain on Cloudflare, which means an annual fee. Worker routes by path on a custom hostname aren't documented ([How do a Pages router and Cloudflare for SaaS behave on Cloudflare's free plan?](https://github.com/plank/docs/issues/14)).
- **Moving `plank.co`'s DNS to Cloudflare.** A Worker route per Docs Version would count no requests and allow rate limiting, but the User doubts the DNS can move. It stays the upgrade path (below).
- **Plank's Dokploy.** It runs no production work and has had downtime.
- **A new small VPS.** A recurring cost, and a new server to maintain.

## Consequences

- Every request to the router counts against the Workers Free limit of 100,000 a day. Per reader, in the live test: a first visit is 9 requests, later pages 1–4, and a first search 9. The Docs Version Workers count none.
- Past the limit the site fails until 00:00 UTC. Without a Cloudflare zone there's no rate limiting.
- A Service binding is fixed when the router is deployed, so adding or retiring a Docs Version means redeploying the router.
- Each Docs Version is one Worker, against 100 Workers per account.
- The Docs Tooling puts a Docs Version's files under its path prefix (the prefix isn't stripped) and ships a `_headers` file marking hashed files `immutable`. The router ships its own `404.html`.
- If the limit bites and the DNS can move: add a Worker route per Docs Version. The Docs Version Workers stay as they are, and the router keeps only `/`, `/<package>/` and 404s. Untested: whether routes take priority over the Pages custom domain, whether a Package's deploy leaves centrally created routes alone, and how nested routes resolve.
