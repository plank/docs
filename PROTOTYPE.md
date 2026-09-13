# PROTOTYPE: Does the Docs Site have a dark mode, and what does it look like?

Throwaway, for [plank/docs#19](https://github.com/plank/docs/issues/19). It lives on the `prototype/dark-mode` branch, which is cut from `prototype/landing-and-doc-page` ([plank/docs#7](https://github.com/plank/docs/issues/7)). It never merges.

**Plan:** three dark palettes for the landing page (B) and doc page (A) the User chose in plank/docs#7, switchable via `?variant=A|B|C` on `/` and on every doc page. It's one Astro Starlight build holding real Package Docs (publisher's `docs/`, snapshots' README).

## Run it

Astro needs Node 22.12 or later.

```sh
npm --prefix prototype install   # first time only (prototype/.npmrc points at the public registry)
npm run prototype                # http://localhost:4321/
```

The floating bar at the bottom of the page switches palettes, and `←` / `→` do the same. Its **Dark / Light** button flips the theme, so each palette can be compared with the light site it extends. It also jumps between the landing page and a doc page. The bar only renders on the dev server.

## Variants

plank.co has no dark palette, so each variant takes its colours in a different direction. They're defined once in `src/styles/tokens.css`, and `src/styles/docs.css` maps them onto Starlight's grays.

| | Ground | Page | Raised (header, sidebar, quotes) | Code blocks |
|---|---|---|---|---|
| **A · Forest night** | plank.co's forest greens become the page. The landing page's forest band sits barely lighter than the page below it. | `#112621` (plank.co's ink) | `#1d3832` | `#0b1c18`, sunk below the page |
| **B · Ink** | A near-neutral black. The brand is kept to the forest band and coral. | `#0f1312` | `#191e1c` | `#151a18` |
| **C · Warm dusk** | plank.co's warm paper and sand, dimmed. | `#1c1a17` | `#282521` | `#161411` |

Shared by all three:

- Coral stays the accent: the current Major Line, link underlines, the button, and the typing command.
- Selection and the focus ring turn coral in dark, since plank.co's forest selection would disappear on A.
- The landing page's forest band is unchanged. Only the page below it goes dark.
- Code uses Expressive Code's `vitesse-dark` colours, with its `#121212` background swapped for each palette's code colour. The landing page's samples carry both vitesse themes.
- Starlight's own dark conventions are kept, such as the current sidebar page in pale coral.

Contrast: all text is at least 4.5:1 on its surface. The lowest is faint text on raised surfaces, at 4.64–4.93:1. Hairlines are 1.5–1.9:1.

## How a reader chooses (as built, not decided)

- **Doc pages:** Starlight's theme select (Dark, Light, Auto), unchanged. Auto is the default and follows the system theme. On phones it sits in the menu drawer.
- **Landing page:** the same select, redrawn for the forest band. On phones it's icon-only.
- **One choice for the whole site.** Both use Starlight's `localStorage` key, `starlight-theme`. The landing page and every Docs Version share the origin `packages.plank.co`, so a choice made on any page holds on all of them.

## Real and stand-in

- **Real:** the Package Docs, plank.co's palette, logos and shapes, the fonts chosen in plank/docs#5, and Starlight's theme select and storage key.
- **Stand-in:** the dark hex values are the prototype's own. `src/data/packages.ts` plays the Docs Configs, and `public/versions.json` plays the router run's output. Only 13.x is built.
- The plank/docs#7 prototype's other layouts (landing A and C, doc B and C) are still in the code but can't be reached. `?variant=` now picks the palette, and `data-layout` pins landing B and doc A.

## Known rough edges

- Impeccable's detector flagged only plank.co's own hover wobble, as in plank/docs#7.
- Phone widths were checked on the landing band and the doc header only.
