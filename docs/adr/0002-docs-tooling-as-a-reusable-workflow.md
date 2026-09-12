# Docs Tooling ships as a reusable workflow at a moving major tag

The Docs Tooling lives in `plank/docs`, which the User made public so that public Package repos can call it. It ships as a reusable workflow, and each Package's docs workflow calls it at a moving major tag: `plank/docs/.github/workflows/docs.yml@v1`. Each non-breaking release moves `v1`, so the change reaches every Package on its next build without editing any Package branch. A breaking change ships as `v2`, and each Package opts in by editing its `uses:` line. With this shape, a Package holds a few lines of YAML and no JS project.

## Considered Options

- **Composite action.** It runs as steps in a job that each Package writes itself, so the job setup (runner, checkout, deploy) is copied into every Package and can drift.
- **Docker action** (Laminas' `documentation-theme`). The image is either rebuilt on every run or published and versioned separately.
- **npm Starlight theme or plugin**, which is how Starlight themes are usually shared. Every Package would hold a Starlight project, a lockfile, and their dependency updates.
- **`@main`** (Laminas). One bad commit breaks every Package's next build, and no Package can be held back.
- **Exact pins bumped by Dependabot.** Every tooling release needs one PR per Major Line branch per Package.

## Consequences

- A Package can't add steps inside the called job, only jobs before or after it.
- `plank/docs` needs a release discipline: semver tags, with `v1` moved to each non-breaking release.
- A run uses the workflow file from the commit that triggered it, so each Major Line branch carries its own copy of the Package's docs workflow.
- A Docs Version keeps the Docs Tooling it was built with until it's rebuilt. Every Docs Tooling release rebuilds every routed Docs Version (ADR 0007).
