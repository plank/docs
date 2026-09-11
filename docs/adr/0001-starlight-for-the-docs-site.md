# Starlight for the Docs Site, without React

The Docs Site is built with Astro Starlight, follows Starlight's conventions unless there's a good reason to break them, and uses no React. The User chose it over Docusaurus even though the front-end team works in React. On a default doc page Starlight loads about 40× less JavaScript (3.9 KB vs 171.7 KB gzipped, measured on each framework's starter site). GSAP runs once per full page load rather than on every client-side navigation. Shiki highlights `blade` fences, and Pagefind, which search across Packages relies on, is built in.

## Considered Options

- **Docusaurus 3.10.** It had React familiarity for the team, a stable 3.x, deeper swizzle and plugin customisation, official mermaid support, and native `.md` link rewriting. Its costs:
  - it parses `.md` as MDX by default, and its CommonMark mode is labelled experimental;
  - Prism has no Blade grammar;
  - React hydrates every page;
  - it has no built-in search.
- **VitePress, MkDocs Material, Zensical.** Each also ships a ready-made docs UI. Their costs are recorded in [Which static site generator fits per-package, per-Major-Line builds?](https://github.com/plank/docs/issues/2).
- **Eleventy, Hugo.** The User chose a ready-made docs UI over building one.

## Consequences

These are the costs accepted with Starlight:

- It is pre-1.0, and breaking changes land in minor versions.
- Every page needs `title` frontmatter.
- Relative `.md` links aren't rewritten.
- Content is read from `src/content/docs/`.
- Merging search across Docs Versions means overriding Starlight's search component.
- Mermaid needs a community plugin, with mermaid.js bundled.
