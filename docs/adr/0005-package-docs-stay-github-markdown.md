# Package Docs stay GitHub markdown, and the Docs Tooling converts them

Package Docs are plain GitHub markdown, because each page is read in two places: on GitHub and Packagist, where Package Docs are read today, and on the Docs Site. So the Docs Tooling converts them into what Starlight expects. That's a deliberate exception to ADR 0001's "follow Starlight's conventions". A page may still add Starlight frontmatter (e.g. `title`, `sidebar.order`), and whatever it sets wins over the conversion. The User chose this on 2026-09-13 in [What must a Package provide to the Docs Site?](https://github.com/plank/docs/issues/9).

## Considered Options

- **Package Docs adopt Starlight's conventions**, and the Docs Tooling copies them as they are.
  - GitHub shows frontmatter as a table and `:::note` as plain text, and links written as site paths break there.
  - Every page is edited on every Major Line branch.
- **Converting only**, with no Starlight frontmatter allowed. A page couldn't use Starlight's own options when it needed more control.

## Consequences

- **Which files are the Package Docs is a convention, per Major Line branch:**
  - If `docs/` exists, it is the Package Docs, and `docs/README.md` is the Docs Version's home page.
  - Otherwise the root README is published as a single page.
- **`docs/README.md` sets the sidebar.** Its `##`/`###` headings become groups, and its links become the pages in that order. Pages it doesn't link come after, by folder. With no index, Starlight's folder-and-alphabet order applies.
- **A README published as a single page is trimmed by heading name.** The Docs Tooling drops what's before the first `#` heading, a `Table of Contents` section, and the trailing Contributing, Credits, License, Security Vulnerabilities and Check Us Out! sections. A Package that renames one of those headings gets that section published.
- **Conversions:**
  - A page's first `#` heading becomes its `title`.
  - Relative `.md` links become site paths.
  - A relative link that leads outside the Package Docs (e.g. `../CHANGELOG.md`) goes to that file on GitHub, at the release tag being built.
  - Links to other Packages stay as written.
  - Both `> **Note:**`-style blockquotes and GitHub alerts become Starlight asides.
- **Broken links don't stop a build.** Links and headings that lead nowhere are listed in the run's summary on GitHub, and the Docs Version deploys anyway, because a fix would wait for the next release (ADR 0006). The User chose this, and both link rules above, on 2026-09-13 in [How do readers get between Packages and Docs Versions, and what do they get at a missing page?](https://github.com/plank/docs/issues/20).
- **The conversion is a layer of our own to maintain.** A change to its rules reaches a Docs Version only when it's rebuilt (ADR 0002).
- **Starlight-only features** (tabs, cards) each need a convention of our own before Package Docs can use them.
