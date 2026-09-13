# PROTOTYPE: What moves on the Docs Site, and how does it respect reduced motion?

Throwaway, for [plank/docs#22](https://github.com/plank/docs/issues/22). It lives on the `prototype/motion` branch and never merges. It's built on [plank/docs#7](https://github.com/plank/docs/issues/7)'s prototype (`prototype/landing-and-doc-page`), with the design #7 chose held fixed: landing page B (`composer require`) and doc page A (segmented Major Lines in the header).

**Plan:** three motion variants of the landing page and a doc page, switchable via `?variant=A|B|C` on `/` and on every doc page, plus a switch that simulates the OS reduced-motion setting.

**Chosen by the User (2026-09-13): C**, with plank.co's own style of reduced-motion control. On the landing page that's plank.co's floating accessibility button. On doc pages it's one dropdown, opened by plank.co's accessibility icon, holding the theme and the reduced-motion setting under their own sub-headings. C is now the default, and both controls show in every variant.

## Run it

```sh
npm --prefix prototype install   # first time only, with Node 22.12 or later (prototype/.npmrc points at the public registry)
npm run prototype                # http://localhost:4321/
```

The floating bar at the bottom of the page:

- **‹ ›** (or `←` / `→`) switch the motion variant.
- **OS setting** cycles _yours_ (your real system setting), _reduce_ and _no preference_, so the reduced-motion path can be seen without changing System Settings. The readout beside it says whether motion is full or reduced, and by what.
- **Landing / Doc page** jump between the two surfaces. Also try moving between doc pages, and switching tabs on the landing page.

The bar only renders on the dev server. All motion rules are in `prototype/src/styles/motion.css`.

## Variants

| | Landing page | Doc page | With reduced motion |
|---|---|---|---|
| **A · Still** | Nothing moves on its own. The command shows the selected Package, and picking a tab swaps the name and the panel at once. The caret is steady. Links and tabs fill in 0.15 s. The button's arrow and label stay put. | Starlight's defaults. Links fill in 0.15 s. | Fills are instant. Nothing else to take away. |
| **B · As chosen** | Exactly what #7 left. The name types in and cycles every ~4 s, with the tabs and panel, until a tab is picked. The caret blinks forever. Links fill in 0.3 s. The button's arrow stretches and its label wobbles. | Links fill in 0.3 s. | What #7 did: no typing, cycling, blinking or wobble. The fills and the arrow's stretch still animate. |
| **C · plank.co in full** (chosen) | B, plus plank.co's page moments. The headline's words slide up, a coral line draws under "Plank.", then the command and tabs rise in. The blue shape turns as the page scrolls. A new tab's panel settles in. A coral "read the docs" circle trails the cursor over the code sample, and clicking the sample opens the docs. The cycle pauses while the pointer is on the command or the panel, focus is inside, or the band is offscreen. The caret blinks only while it cycles. | Moving between doc pages holds the header and sidebar still and fades the content in (cross-document View Transitions). In-page jumps scroll smoothly (native `scroll-behavior`, not ScrollSmoother). The other Major Lines fade in when `/versions.json` arrives. | Everything stops, fills included, as on plank.co. |

## The reduced-motion controls

Either one sets the same stored setting, and like plank.co's it can only reduce: the OS setting always wins.

- **Landing page: plank.co's floating button** (`prototype/src/components/A11yFloat.astro`), redrawn from plank.co's markup, styles and script. It sits on the right edge, 500px down (less on short screens). The accessibility icon shows a sage "Toggle reduced motion" tooltip on hover. Clicking it slides up a sand panel, "Reduced motion off" with plank.co's pill switch, and the icon becomes a hand-drawn X. Escape or the X closes it. As on plank.co, the whole button hides when the OS asks for reduced motion.
- **Doc pages: one dropdown** (`prototype/src/components/A11yMenu.astro`), opened by plank.co's accessibility icon where Starlight's theme select was. It has two sub-headings:
  - **Theme:** Light and Dark, as a segmented control. A pick is stored under Starlight's own key, `starlight-theme`, so Starlight's inline script still sets the theme before first paint. Until a reader picks, the system theme is followed.
  - **Motion:** "Reduced motion off" with plank.co's pill switch. When the OS asks for reduced motion, the switch shows on and locked, with "Your system asks for reduced motion."
  - It overrides Starlight's `ThemeSelect`, so on phones it's in the menu drawer's footer, opening upwards.

Differences from plank.co: the setting is kept in localStorage rather than a ten-year cookie, and it applies at once instead of reloading the page. The floating button gets a paper disc behind its icon, so it still shows over the forest band, and its panel gets a soft shadow, so it doesn't melt into the sand code sample beside it.

## Where plank.co's motion comes from

In the private `plank/plankco` repo, under `themes/plank/assets/` unless noted:

- `js/frontend/helpers/shouldPause.js`: every GSAP effect checks one flag. It's true when the OS asks for reduced motion **or** the `shouldPauseAnimation` cookie is `true`.
- `js/frontend/helpers/pauseAnimations.js`: the reduced-motion panel. It slides up 100px as it opens, sets the cookie for ten years, then reloads the page.
- `themes/plank/partials/button-contact.php` and `css/05-components/_sticky-contact-button.scss`: the floating button's markup and styles. It sits beside the "Contact us" button on the right edge, and it's hidden under `prefers-reduced-motion`.
- `js/frontend/components/smoothScrolling.js`: ScrollSmoother, off when paused.
- `js/frontend/helpers/drawPageSvgs.js`: every SVG path on the page draws itself in as it scrolls into view, off when paused.
- `js/frontend/components/heroBlock.js`: the hero's marked words get coral lines that draw in, and the hero shapes scale with scroll.
- `js/frontend/components/Cursor.js`: the circle that trails the cursor over cards (React and framer-motion).
- `css/03-base/_animations.scss`: the `wobble` keyframes. `css/03-base/_typography.scss` animates the link fill only under `prefers-reduced-motion: no-preference`.

C redoes these in CSS and a few lines of script. There's no GSAP.

## Costs seen while building

- **WCAG 2.2.2 Pause, Stop, Hide (Level A):** moving or blinking content that starts by itself, lasts more than five seconds and sits beside other content needs a way to pause, stop or hide it. B's cycling name and forever-blinking caret fit that description. Picking a tab stops the cycle, and the Understanding document doesn't say whether stopping on interaction counts.
- B's cycle swaps the panel as well as the name, so a reader partway through one Package's summary sees it change.
- **Cross-document View Transitions** (C): Chrome and Edge 126+, Safari 18.2+, partial in Firefox from 144 (caniuse, 2026-09-13). Other browsers load pages as they do today. They work only between same-origin pages, and every Docs Version is one origin behind the router (ADR 0003).
- **Scroll-driven animations** (C's shape): Chrome and Edge 115+, Safari 26+, not in Firefox (web-features explorer, 2026-09-13). Elsewhere the shape stays still.
- **The stored setting** needs a script in `<head>`, before first paint, so a reader who turned motion off doesn't see a flash of it. Starlight's theme works the same way. localStorage keeps it for the landing page and every Docs Version, since they share one origin.
- **The floating button hides under OS reduced motion,** as plank.co's does, so a reader whose OS already asks for it doesn't see the control at all on the landing page. The doc-page dropdown can't hide, since it also holds the theme, so it shows the switch locked instead.
- **The doc-page dropdown replaces [plank/docs#19](https://github.com/plank/docs/issues/19)'s one-click theme toggle there.** A theme change now takes two clicks instead of one. #19's reason for one click was "Save space", and the dropdown takes the same single icon's space. The Theme section offers Light and Dark with no Auto, matching #19.
- **Overriding `ThemeSelect`** is an exception to ADR 0001's "follow Starlight's conventions", as #19's toggle already was.
- C's follower and click-to-open make the code sample harder to select. Selecting text doesn't navigate, but a click does.
- Starlight's own sidebar caret rotates with a 0.2 s transition that ignores reduced motion. Its `<details>` marker honours it.

## Real and stand-in

- **Real:** the Package Docs (lightly converted), plank.co's palette, logos, shapes, accessibility and close icons, switch artwork and `wobble` keyframes, the fonts chosen in plank/docs#5, and each Package's summary and code sample.
- **Stand-in:** `src/data/packages.ts` plays the Docs Configs, and `public/versions.json` plays the router run's output. Only 13.x is built, so other Docs Versions 404. The two Packages share one build. `?variant=` and the OS simulation are prototype-only.
- **Not here:** #19's Ink dark palette and the landing page's one-click theme toggle live on `prototype/dark-mode`. This branch still has #7's dark palette.
