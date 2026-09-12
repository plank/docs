# Product

<!-- impeccable:product-schema 1 -->

Written for the prototype in [What do the landing page and a doc page look like?](https://github.com/plank/docs/issues/7), from the User's answers on 2026-09-12 and the decisions on [Docs Site for Plank Packages](https://github.com/plank/docs/issues/1). Anything marked _inferred_ was not said by the User.

## Platform

web

## Stack

Astro Starlight, no React (ADR 0001). The Docs Tooling is a reusable workflow in `plank/docs` (ADR 0002). Served from Cloudflare's free plan by a Pages router in front of a Worker per Docs Version (ADR 0003).

## Users

Laravel developers: those deciding whether to adopt a Plank Package, and those already using one and looking something up. **Developers only.** The site doesn't pitch Plank to prospective clients or hires (User, 2026-09-12).

## Product Purpose

`packages.plank.co` is the one public home for the Package Docs of Plank's open-source Laravel Packages. Each Package writes its docs in its own repo, and each Major Line deploys its own Docs Version.

- **The landing page is a showcase of Plank's open-source work.** A Laravel developer should come away thinking Plank makes serious open-source software, then pick a Package. Branding and story lead; the Package list follows (User, 2026-09-12).
- **Doc pages are for reading** Package Docs.

## Positioning

Not yet stated by the User.

## Capabilities and Constraints

- The landing page lists exactly the Packages whose Docs Config puts them on the Docs Site (ADR 0004), and no others (User, 2026-09-12). At launch that's `snapshots` and `publisher`.
- A Package's path is its repo name (`/snapshots`, `/publisher`). One Docs Version per Major Line (`/publisher/13.x/`). Readers switch Docs Versions in the UI. The version switcher and landing page read `/versions.json` at runtime.
- Markdown Package Docs only. $0 recurring cost, no third-party runtime services.
- Search and links don't need to span Docs Versions.

## Brand Commitments

- A faithful extension of plank.co "as much as possible without burdening ourselves" (User).
- Fonts: **Newsreader** for headings and **Instrument Sans** for body, both OFL-1.1, standing in for plank.co's Gascogne and Untitled Sans (User, plank/docs#5).
- plank.co's logos, hand-drawn shapes and colour tokens live in `plank/plankco` under `themes/plank/assets/`.
- plank.co gets a plain credit link (User, 2026-09-12).

## Evidence on Hand

- Packagist, 2026-09-12: `plank/snapshots` 7,322 downloads (223/month), 7 GitHub stars; `plank/publisher` 5,082 downloads (229/month), 4 stars.
- Package Docs: publisher's `docs/` (20 pages); snapshots' README (355 lines, flagged "under active development, do not use in production").
- There are no testimonials, adopter logos or benchmarks. Don't make any up.

## Product Principles

- _Inferred:_ Package Docs own the content, and the Docs Site owns only how it's presented.
- _Inferred:_ The showcase has to hold up with two Packages and grow without a redesign.
