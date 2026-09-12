# PROTOTYPE: What do the landing page and a doc page look like?

Throwaway, for [plank/docs#7](https://github.com/plank/docs/issues/7). It lives on the `prototype/landing-and-doc-page` branch and never merges.

**Plan:** three variants of the landing page and a doc page, switchable via `?variant=A|B|C` on `/` and on every doc page. It's one Astro Starlight build holding real Package Docs (publisher's `docs/`, snapshots' README).

## Run it

```sh
npm --prefix prototype install   # first time only (prototype/.npmrc points at the public registry)
npm run prototype                # http://localhost:4321/
```

The floating bar at the bottom of the page switches variants, and `←` / `→` do the same. It also jumps between the landing page and a doc page. The bar only renders on the dev server.

## Variants

Each variant is a landing page plus the doc-page chrome that goes with it.

| | Landing page | Doc page |
|---|---|---|
| **A · Major Line matrix** | The hero is a table of Packages × Major Lines. Every cell links to a Docs Version, and the newest is a coral wobble. | The header carries the Package name and a segmented Major Line switcher. |
| **B · composer require** | A forest-green band holds a big `composer require plank/…` line that types each Package in turn (plank.co's rotating hero phrase). The tabs below show one Package at a time, with its code. | Forest-green header. The sidebar has a copyable install command and a version select. |
| **C · plank.co editorial** | plank.co's homepage grammar: a big centred serif hero with the coral squiggle, a wobbly coral button, then each Package on a tilted hand-drawn shape, with sides alternating. | The full wordmark header, then a big page title with the squiggle. The sidebar has the Package name and a version select. |

Chosen by Impeccable's surface roll (seed `f6ba9877`) from seven ranked structures:

1. Code-first specimen: each Package introduced by its most telling code sample.
2. **plank.co editorial hero + Package spreads** → C
3. A shelf of plank.co shapes, one per Package.
4. A problem-led chooser: "I need to…" sentences that rotate.
5. **Major Line matrix** → A
6. **`composer require` command line** → B
7. Long-scroll chapters joined by a hand-drawn line.

## Real and stand-in

- **Real:** the Package Docs (lightly converted: `title` frontmatter, explicit slugs, `.md` links rewritten), plank.co's palette, logos and shapes, the fonts chosen in plank/docs#5, and the summaries and code samples from each Package's README and docs.
- **Stand-in:** `src/data/packages.ts` plays the Docs Configs, and `public/versions.json` plays the router run's output. Only 13.x is built, so other Docs Versions 404. The two Packages share one build (`src/routeData.ts` narrows the sidebar to one Package). Taglines in C were written for the prototype.
- **Not decided here, just defaulted:** the code theme (vitesse), the dark palette (built from plank.co's greens), motion beyond the few moments shown. Doc pages follow the reader's system theme (Starlight's "Auto"). The landing page is light only.

## Known rough edges

The prototype had two capture rounds (in `.impeccable/review/`, not committed), then polishing stopped.

- C's hero squiggle is stretched across the word, so on two lines it reads as two strokes.
- Phone widths were only eyeballed: the capture harness cropped them off-centre.
- Impeccable's detector flagged the hover wobble as a "bounce" easing. It's plank.co's own `wobble` keyframes, kept because the brief is a faithful extension of plank.co.
- Impeccable's finish review and DESIGN.md write-up were skipped, since this prototype is for reacting to, not shipping.
