# Docs Tooling releases rebuild every Docs Version through each Package's own manual run

Every Docs Tooling release rebuilds every routed Docs Version, each from its Major Line's highest release, so only the Docs Tooling changes and never the content. A workflow in `plank/docs`, triggered by the release, mints a token from a GitHub App with Actions write on the Packages. It then starts the docs workflow's manual run (ADR 0006) in each Package, once per routed Major Line, on that Major Line's highest release tag. GitHub runs the docs workflow as it is in that tag, so a rebuild uses the same Docs Tooling major as a release build of the tag. The `plank/docs` workflow waits for every run it started and fails if any failed, naming them, so GitHub notifies whoever made the Docs Tooling release. The User chose this on 2026-09-13 in [How do already-deployed Docs Versions pick up Docs Tooling changes?](https://github.com/plank/docs/issues/13).

## Considered Options

- **No rebuild.** Each Docs Version picks up Docs Tooling changes on its Major Line's next release, or on a manual run someone starts. An older Major Line may never release again, so:
  - its look drifts from the next Docs Version's, across the version switcher;
  - any change to `/versions.json`'s shape has to keep working with the oldest Docs Version still deployed;
  - a Docs Tooling fix stays unfixed on it.
- **A rebuild started by hand** after a Docs Tooling release.
- **`plank/docs` builds and deploys each Docs Version itself.** It checks out each tag (public, no token) and deploys with its own Cloudflare token, so there's no new GitHub credential. But GitHub's `concurrency` groups apply per repo, so a rebuild and a Package's release build can't queue behind each other. A rebuild of an older release can finish last and roll the Docs Version back. It would also mean `plank/docs` deploys sections that each Package's release workflow owns.
- **Starting the manual run from `main`.** It's one dispatch per Package, but every Major Line would build with `main`'s docs workflow. Once `main` calls `v2`, a rebuild would put `v2` on Major Lines whose branches still call `v1`, and their release builds would switch back.
- **Leaving failures to GitHub's notice to whoever triggered the run** (ADR 0006). A dispatched run's actor is the GitHub App, so no person would hear of a failed rebuild.

## Consequences

- **Each Docs Version still has one deployer and one queue**, its own Package's docs workflow. A rebuild shares its concurrency group with release builds and rechecks that its tag is the highest when it starts. GitHub keeps one pending run per group, so a rebuild can end `cancelled` when a newer run of the same Docs Version replaces it.
- **A Docs Version always carries the Docs Tooling its own release calls**, so a `v2` release changes only Major Lines whose tag calls `v2`, and a `v1` release after `v2` still updates Major Lines on `v1`. Major Lines on the other major rebuild with nothing changed.
- **A tag with no docs workflow can't be dispatched on.** That's the case for releases made before a Package had one. Those Major Lines fall back to `main`'s manual run and build with `main`'s Docs Tooling major until their next release. GitHub doesn't document the dispatch error for this case (others report a 422).
- **Only routed Docs Versions are rebuilt.** One deployed but not yet routed when the Docs Tooling release happens keeps the Docs Tooling it was built with.
- **A new credential:** a GitHub App with Actions write on every Package. Its ID and private key are secrets in `plank/docs`. Onboarding a Package adds a step: giving the App access to its repo.
- **Finding and waiting on runs:** the dispatch API returns the new run's ID with `return_run_details` (since 2026-02-19), and always from API version 2026-03-10. The job waits within GitHub-hosted runners' 6-hour limit, including time queued behind release builds.
- **GitHub's notice reaches whoever made the release only if their GitHub Actions notifications are on.**
