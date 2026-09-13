# PROTOTYPE: How do code blocks look, and which syntax theme do they use?

Throwaway, for [plank/docs#25](https://github.com/plank/docs/issues/25). It lives on the `prototype/code-blocks` branch, cut from `prototype/dark-mode` ([plank/docs#19](https://github.com/plank/docs/issues/19)), which is cut from `prototype/landing-and-doc-page` ([plank/docs#7](https://github.com/plank/docs/issues/7)). It never merges.

**Plan:** three code-block variants, each with its own light and dark syntax theme, switchable via `?variant=A|B|C` on `/` and on every doc page. It's one Astro Starlight build holding real Package Docs (publisher's `docs/`, snapshots' README), on the landing page (B) and doc page (A) the User chose in plank/docs#7, with the Ink dark palette chosen in plank/docs#19.

## Run it

Astro needs Node 22.12 or later.

```sh
npm --prefix prototype install   # first time only (prototype/.npmrc points at the public registry)
npm run prototype                # http://localhost:4321/
```

The floating bar at the bottom of the page switches variants, and `←` / `→` do the same. Its **Dark / Light** button flips the theme, so each variant's two syntax themes can be compared. It also jumps to the three pages worth comparing:

- **Landing:** each Package's code sample (the Docs Config's `sample`).
- **Install** (`/publisher/13.x/guides/installation/`): shell commands and PHP.
- **Admin panels** (`/publisher/13.x/advanced/admin-panel-integration/`): file-name titles, Blade, and lines longer than the column.

The bar only renders on the dev server.

## Variants

plank.co has no code blocks, so each variant takes them in a different direction. Structure is in `src/styles/docs.css`; syntax themes are in `src/code-themes.mjs` (A, B) or Shiki's own (C), wired up in `ec.config.mjs`.

| | Frame | Language and file name | Copy | Line numbers | Syntax theme (light / dark) |
|---|---|---|---|---|---|
| **A · Sand card** | Expressive Code's frames as Starlight ships them: a rounded card, editor tabs, terminal windows with three dots. On sand in light, Ink's code colour in dark. | File names become an editor tab with a coral top line. The language isn't shown. | An icon on hover | No | Plank light / Plank dark: plank.co's teal, coral, blue and yellow, deepened on sand and full strength on Ink |
| **B · Forest slab** | A forest slab with plank.co's hand-cut edge, wider than the text (full width on phones). Forest in light, forest-deep in dark. | A coral label row: `PHP`, `BLADE`, `TERMINAL`, then the file name in mist. | The word "Copy" on a coral button, always showing | No | Plank forest in both: coral keywords, yellow strings, mint types |
| **C · Open figure** | No box. The code sits on the page between a strong top rule and a hairline, like a figure. | A caption row: the language in small capitals, the file name in Newsreader italic. | The word "Copy" as a plank.co link, always showing | Yes, behind a hairline, except on terminal commands | GitHub light / GitHub dark, the colours readers see on GitHub |

Landing B's sample card keeps its own shape and tilt in every variant, and only takes the variant's syntax colours. In B the card turns forest, since B's theme only reads on forest.

**The User chose A · Sand card on 2026-09-13** ("by far my favorite"), so `?variant=` defaults to A.

## As built, not decided

- The language labels come from each fence's language (`php`, `bash`, `blade`, `json`, `sql`). A shell block is labelled "Terminal".
- In B, the copy button is always showing. In A it appears on hover, as Starlight ships it.
- Inline code is unchanged in every variant.
- The dark palette is Ink only; the other two palettes from plank/docs#19 are gone from this branch.
- Doc pages still use plank/docs#19's one-click theme toggle, not the Theme and Motion dropdown from [plank/docs#22](https://github.com/plank/docs/issues/22). That dropdown is on `prototype/motion`.

## Costs seen while building

- **Expressive Code lifts file-name comments into titles.** A block whose first line is `// config/publisher.php` loses that line from the code and shows it as a title (a tab in A, the label row in B and C). GitHub still shows it as a comment. It doesn't happen for Blade: `{{-- resources/views/…/publish.blade.php --}}` stays in the code. This is Expressive Code's default (`extractFileNameFromCode`).
- **Expressive Code raises every token colour to 5.5:1** against its block's background, so the theme colours in `src/code-themes.mjs` are starting points, not what renders.
- **Line numbers need a plugin.** `@expressive-code/plugin-line-numbers` is a separate package. Here it renders on every block and CSS hides it in A and B.
- **Functions in Expressive Code's options move them to `ec.config.mjs`.** Starlight's `<Code>` component, used on the landing page, needs options it can serialise. Per-variant theme selectors and plugins are functions, so the options can't sit in `astro.config.mjs`.
- **Hanging line numbers in the margin didn't fit.** At 1280px the doc column's text starts 24px from the sidebar, less than the gutter needs.
- **B's slab touches the sidebar and table of contents.** At 1280px its 1.5rem bleed on each side reaches both panes' edges.

## Real and stand-in

- **Real:** the Package Docs, plank.co's palette, the fonts chosen in plank/docs#5, Expressive Code and Shiki as Starlight bundles them, Shiki's GitHub themes, and the `blade` grammar.
- **Stand-in:** the Plank and forest syntax themes are the prototype's own, drawn from plank.co's tokens. `src/data/packages.ts` plays the Docs Configs, and `public/versions.json` plays the router run's output. Only 13.x is built.
