# Docs Versions build only from a Major Line's highest release

A Docs Version is built from the tag of its Major Line's highest release, prereleases excluded, and never from the branch head. So a docs-only fix pushed to `13.x` reaches the Docs Site with the next release on that Major Line. A Package's docs workflow is triggered by a published GitHub Release (`on: release`, type `released`), which is how Plank's Packages already release, and by a manual run. The User chose this on 2026-09-13 in [How does a change in a Package deploy its Docs Version?](https://github.com/plank/docs/issues/10), in place of rebuilding every time a docs file changes, which they had asked for in [Where does the shared build tooling live, and how do Packages use it?](https://github.com/plank/docs/issues/8).

## Considered Options

- **Build from the branch head on every docs change.** A docs-only fix would go live at once. But docs for a feature merged ahead of its release would show before that release exists, and a Docs Version would stop being "as of that line's latest release".
- **A `v*` tag push** (`on: push: tags`). It fires for a tag with no Release, it can't tell a prerelease, and a tag without the `v` never fires it.
- **Every release replaces the Docs Version.** A prerelease would put beta docs live, and a patch to an older minor (`v13.10.4` after `v13.11.5`) would roll the docs back.

## Consequences

- **The Major Line is the tag's major number** (`v13.11.5` → 13). A tag that isn't semver fails the build.
- **A lower release is skipped, with a message.** The Docs Tooling compares the tag with the Major Line's other releases.
- **A manual run builds releases too.** It takes a Major Line input, which defaults to every Major Line in the Docs Config, and builds each from its highest release. That's how a Package's first Docs Versions go live, because releases made before its docs workflow existed never built anything.
- **Builds of one Docs Version queue**, one at a time, and each rechecks that it's the highest release when it starts.
- **A failed build changes nothing on the Docs Site.** The previous Docs Version stays live. The only alert is GitHub's own notice to whoever triggered the run.
- **Each Major Line branch carries the trigger.** A release build runs the docs workflow as it is in the tag (ADR 0002), so changing the trigger means editing every Major Line branch of every Package.
