# Which static site generator fits per-package, per-Major-Line builds?

Research for [plank/docs#2](https://github.com/plank/docs/issues/2), carried out 2026-09-11. It records how each candidate behaves and what it costs against the ticket's criteria. It does not pick one.

The User-set constraints these costs are weighed against (from the map, [#1](https://github.com/plank/docs/issues/1)):

- Package Docs are markdown and live in each Package's own repo.
- Each Package's release workflow builds and deploys its own section of one Docs Site at `docs.plank.co/<package>`, using shared build tooling.
- There is one Docs Version per Major Line, e.g. `/snapshots/13.x`.
- The Docs Site is a faithful extension of plank.co's design, "as much as possible without burdening ourselves".
- Hosting is on Cloudflare, at $0 recurring cost, with no third-party runtime services.

## At a glance

Each cell records what that criterion costs with that candidate. "Measured" means a real build of today's Package Docs (section 2). Files and times are for one 21-page Docs Version.

| Candidate | Standalone sub-path build | Today's markdown as-is | Theming toward plank.co | Build-time search | Shared, versioned tooling | Files / warm build | Health |
|---|---|---|---|---|---|---|---|
| **Astro Starlight** 0.42 | `astro build --base`. Links authored in content as `/foo` are not prefixed | Fails until `title` frontmatter is generated (then 2 H1s). `.md` links **not** rewritten. Mermaid via plugin. `blade` highlighted | CSS vars, component overrides, custom `.astro` pages, bundled `<script>`. No client framework | **Pagefind built in** | Starlight plugins (npm). No official whole-site-package example | 71 (36 Pagefind) / ~2.2 s | 0.x with breaking minors. Astro 7 (Jun 2026). Astro owned by Cloudflare since Jan 2026 |
| **VitePress** 1.6.4 | `vitepress build --base`. Markdown `/foo` links prefixed | Fails on README raw HTML (compiled as Vue) and on dead links until worked around. `.md` rewritten. `> [!NOTE]` built in. `{{ }}` outside fences is Vue. `blade` highlighted | CSS vars and slots, or a custom Vue theme. Every page hydrates a Vue SPA | MiniSearch built in (no documented cross-site merge) | "Distributing a Custom Theme" is documented | 87 / ~4.4 s | No stable release since Aug 2025. 2.0 is alpha with no date |
| **Docusaurus** 3.10 | `baseUrl` in JS config (no CLI flag) | MDX (default) fails on the README `<img>`. Experimental `format: 'detect'` builds. `.md` rewritten. Official mermaid theme. `blade` not highlighted (Prism) | Infima vars. Swizzle ("Unsafe" ones can break on minors). React pages. React SPA hydration | Not built in (Algolia is first-class). Community lunr or Pagefind plugins, or Pagefind post-step | Presets and themes (npm) | 64 (+37 Pagefind) / ~10 s | Meta org, active. v4 in progress (Node ≥24.14) |
| **Eleventy / Build Awesome** 3.1 | `--pathprefix` + `HtmlBasePlugin` (absolute URLs only) | Liquid breaks on Blade inside fences unless `markdownTemplateEngine: false`. `.md` links need the InputPath-to-URL plugin. Community mermaid (unpkg default) | Full freedom. All docs chrome built from scratch. Layouts must sit inside the input dir | Pagefind post-step | Plugins + programmatic API | 21 (+35) / ~0.8 s *(bare layout)* | Renamed Mar 2026. v4 alpha. Paid Pro tier planned |
| **Hugo** 0.166 | `--baseURL` | Raw HTML needs `unsafe = true`. `.md` links need `useEmbedded = 'always'`. Mermaid and alert hooks are yours to write. `blade` not highlighted (Chroma) | Full freedom in Go templates. All docs chrome from scratch. esbuild for GSAP | Pagefind post-step | Hugo Modules (Go + Git in CI) or file copies | 36 (+36) / ~0.7 s *(bare layout)* | Active, ~monthly releases |
| **MkDocs + Material** 1.6.1 / 9.7.7 | `site_url`. Output is page-relative | **Built as-is.** `.md` rewritten. Mermaid via superfences (unpkg by default). `blade` not highlighted (Pygments) | Template overrides, CSS vars, custom home template, `font: false` for self-hosted fonts | lunr built in (single index) | `INHERIT` + pip packages. Python in CI | 68 / ~1 s | MkDocs 1.x unmaintained. Material in maintenance mode (fixes promised ≥12 months from Nov 2025) |
| **Zensical** 0.0.60 | `site_url` | **Built as-is** from the same `mkdocs.yml`. `docs_dir` must be relative. `blade` not highlighted | MiniJinja overrides (Material overrides need adapting) | Own engine built in | PyPI theme extensions. Module system unreleased. Python in CI | 33 / ~0.7 s | Alpha. Weekly releases |

Costs that apply **whichever generator is used**:

- **mermaid.js has to be self-hosted or bundled** (§4.2).
- **READMEs need normalising.** Links leave the docs set, and `art/…` images need copying (§4.4).
- **Blade highlighting comes only from Shiki**, i.e. Starlight, VitePress, or Shiki wired into Eleventy (§4.3).
- **One search box across Docs Versions** relies on Pagefind's `mergeIndex`. Pagefind is built into Starlight and is a post-step for Docusaurus, Eleventy and Hugo; the MkDocs-family engines have no documented equivalent (§4.1).
- **Output files:** every candidate stays well under Cloudflare's 20,000-files-per-deploy cap for a single Docs Version (§4.5).

## 1. What the Package Docs look like today

I inventoried the Package Docs from `plank/publisher@main` (`docs/`, 20 files) and `plank/snapshots@main` (`README.md`, 355 lines).

| Feature | Occurrences | Where |
|---|---|---|
| Frontmatter | none, in any file | all |
| Fenced code, by opening fence | `php` 250, `bash` 13, unlabelled 6, `blade` 4, `json` 2, `sql` 1, `mermaid` 1 | publisher `docs/` and the snapshots README |
| Mermaid | 1 × `stateDiagram-v2` | `publisher/docs/guides/core-concepts.md:118` |
| Relative `.md` links | 86, one of them with a cross-file `#anchor` | mostly `publisher/docs/README.md`, which acts as the index |
| In-page `#anchor` links | 27 | mostly the snapshots README table of contents |
| `> **Note:**` blockquotes | 3; there is no `> [!NOTE]` syntax anywhere | `publisher/docs/features/*` |
| Raw HTML outside fences | READMEs only: a `<p align="center">` header with an **unclosed `<img>`**, a **bare relative `src="art/<pkg>.png"`**, badge links and a footer banner | both READMEs |
| Blade `{{ … }}` | inside fences only; none in prose or inline code | `publisher/docs/features/url-rewriting.md`, `advanced/admin-panel-integration.md` |
| Links that leave the docs set | `CONTRIBUTING.md`, `LICENSE.md`, `../../contributors` (resolves only on GitHub), and `docs/…` from the root README | READMEs |

Two of these trip some generators: the unclosed `<img>` and the bare `art/…` path. The links that leave the docs set trip dead-link checks. Section 3 shows which generators, with measurements.

## 2. Method: a measured build of the real corpus

I built each candidate on Node v24.14.1 (the repo's `.nvmrc`) on an Apple M1 Pro. The input was the publisher `docs/` folder plus the snapshots README copied in as `snapshots-readme.md`, 21 pages in all. Every build targeted the sub-path `/publisher/1.x/`. Each used the tool's starter or default theme, with only the configuration needed to build.

I counted files in the output directory. I checked HTML hrefs for any `.md` link left unrewritten and for any root-relative URL that escapes the base. Build times are wall-clock times for three sequential clean builds, taken after all installs had finished.

Versions measured:

- Astro 7.3.2 with Starlight 0.42.0
- VitePress 1.6.4
- Docusaurus 3.10.2
- Eleventy 3.1.6
- Hugo 0.166.0 extended, via the `hugo-extended` npm package
- MkDocs 1.6.1 with Material 9.7.7
- Zensical 0.0.60
- Pagefind 1.5.2

| | Starlight | VitePress | Docusaurus | Eleventy / Build Awesome ¹ | Hugo ¹ | MkDocs + Material | Zensical |
|---|---|---|---|---|---|---|---|
| Builds the corpus as it is today | no: `title: Required` on every page without frontmatter | no: `art/…` in raw HTML is compiled as a module import; then 3 dead links fail the build | no: MDX rejects the unclosed `<img>` | no: Liquid pre-processes `.md` and chokes on `{{ … }}` **inside** a `blade` fence | yes ² | yes, with warnings | yes, with warnings |
| What made it build | generate `title` frontmatter (e.g. from the first H1) | rewrite `src="art/` to `./art/`, copy `art/`, set `ignoreDeadLinks` | `markdown: { format: 'detect' }` | `markdownTemplateEngine: false` | none (`markup.goldmark.renderer.unsafe = true` for raw HTML) | none | none (it read the same `mkdocs.yml`) |
| Relative `.md` links rewritten | **no**: 49 left as `.md` hrefs | yes | yes | **no**: 49 left | only with `renderHooks.link.useEmbedded = 'always'`: 49 left by default, 0 with it | yes | yes |
| Raw README HTML | passed through; `art/…` left as-is | compiled by Vue (see above) | passed through in `detect` mode; `../../contributors` became `/contributors`, escaping the base | passed through | passed through with `unsafe = true` | passed through; links inside it aren't converted | passed through |
| `blade` fence highlighted | yes (Expressive Code/Shiki) | yes (Shiki) | no: Prism emits `language-blade` with line spans only | no highlighter configured | no: plain (Chroma has no Blade lexer) | no: plain (Pygments has no Blade lexer) | no: plain |
| Search built in, no third party | Pagefind (built in) | MiniSearch (`provider: 'local'`) | none by default; Pagefind added as a post-step | none; Pagefind post-step | none; Pagefind post-step | lunr (built in) | own engine (built in) |
| Files in output (21 pages) | **71** (36 Pagefind) | **87** (47 JS; the search index is one JS chunk) | **64**; **101** with Pagefind (37) | 21; **56** with Pagefind (35) | 36; **72** with Pagefind (36) | **68** (36 JS, 34 of them lunr language files) | **33** |
| Output size | 3.1 MB | 3.4 MB | 2.1 MB (2.8 MB with Pagefind) | 0.2 MB (1.0 MB with Pagefind) | 0.9 MB (1.6 MB with Pagefind) | 3.6 MB | 1.6 MB |
| Build time, warm (3 runs) | 2.4 / 2.1 s (6.5 s cold) | 4.6 / 4.4 / 4.4 s | 10.1 / 10.2 / 11.8 s | 0.8 / 0.7 / 0.8 s, plus Pagefind ≈0.7 s | 0.7 / 1.0 / 0.7 s, plus Pagefind ≈0.7 s | 1.0 / 0.7 / 1.3 s | 0.7 / 0.8 / 0.6 s |
| Base path `/publisher/1.x/` respected | yes, no escaping refs | yes | yes, except the README's `../../contributors` | yes (`HtmlBasePlugin`) | yes | yes (relative URLs) | yes |

¹ Eleventy and Hugo ran with a one-line bare layout: no nav, sidebar, TOC or theme. Their file counts and times cover only the markdown pipeline, not a themed Docs Site.
² With `unsafe = true`; Goldmark's default is `false`, which drops raw HTML ([gohugo.io markup config](https://gohugo.io/configuration/markup/)).

Times include `npx` start-up. Every candidate's output is far below Cloudflare's 20,000-files-per-deploy cap for one Docs Version (§4.5).

## 3. Per-candidate behaviour and costs

### Astro Starlight

- **Health:**
  - Starlight is at 0.42.0, released 2026-09-02. It is still **0.x**, and breaking changes land in minor versions: 0.42.0 dropped older browsers and changed the mobile-menu markup ([CHANGELOG](https://github.com/withastro/starlight/blob/main/packages/starlight/CHANGELOG.md)).
  - Astro is at 7.3.2 (2026-09-08). Astro 7.0 (2026-06-22) brought a Rust compiler, a new default Markdown pipeline ("Sätteri") and Vite 8 ([Astro 7](https://astro.build/blog/astro-7/)).
  - **Cloudflare acquired The Astro Technology Company** (announced 2026-01-16). Astro stays MIT and platform-agnostic ([press release](https://www.cloudflare.com/press/press-releases/2026/cloudflare-acquires-astro-to-accelerate-the-future-of-high-performance-web-development/), [Cloudflare blog](https://blog.cloudflare.com/astro-joins-cloudflare/)).
  - Repo activity: Starlight had 29 open issues and PRs, with a push on 2026-09-09.
- **Runtime:** Astro 7.3.2 declares `node >=22.12.0` ([npm](https://www.npmjs.com/package/astro/v/7.3.2)). The benchmark ran on Node 24.14.1.
- **Sub-path:**
  - `base` config, or `astro build --base <path>` per build ([CLI](https://docs.astro.build/en/reference/cli-reference/)).
  - Sidebar and asset URLs get the base. **Links authored inside content as `/foo` are not prefixed.** Maintainers call that "partially intentional" and prefer an opt-in plugin ([discussion #3660](https://github.com/withastro/starlight/discussions/3660)).
- **Markdown:**
  - **`title` frontmatter is required** on every page ([schema.ts](https://github.com/withastro/starlight/blob/main/packages/starlight/src/schema.ts)). The benchmark confirmed it: none of the existing Package Docs build without generated frontmatter.
  - With a generated title, the page renders **two `<h1>`s**: Starlight's title plus the document's own H1. The pre-processing step would also strip the first H1.
  - **Relative `.md` links are not rewritten** (measured: 49 left). The upstream issue was closed as not planned ([#2214](https://github.com/withastro/starlight/issues/2214)).
    - The plugin `astro-rehype-relative-markdown-links` 0.19.2 describes itself as "experimental" and as tested on Astro <6. On Astro 7, rehype plugins also need `@astrojs/markdown-remark` ([upgrade guide](https://docs.astro.build/en/guides/upgrade-to/v7/)).
    - Rewriting in the shared pre-processing step is the other route.
    - `starlight-links-validator` fails relative links by default (`errorOnRelativeLinks: true`).
  - **Mermaid** is not built in. `astro-mermaid` 2.1.0 renders client-side, supports Astro 7 as a Sätteri plugin, and is listed in Starlight's plugin directory ([repo](https://github.com/joesaby/astro-mermaid)). `rehype-mermaid` renders at build time through Playwright/Chromium ([repo](https://github.com/remcohaszing/rehype-mermaid)).
  - `blade` is highlighted: Expressive Code uses Shiki's bundled grammars.
  - Native asides use `:::note`. `> [!NOTE]` needs the `starlight-github-alerts` plugin. `> **Note:**` renders as a plain blockquote.
  - Raw HTML passes through, and `art/…` is left for the tooling to copy.
- **Source location:** `docsLoader()` hard-codes `src/content/docs/` ([loaders.ts](https://github.com/withastro/starlight/blob/main/packages/starlight/src/loaders.ts)).
  - A custom `glob()` loader pointed elsewhere "does *mostly* work", with gaps in autogenerated sidebar groups and last-updated dates ([discussion #1257](https://github.com/withastro/starlight/discussions/1257)).
  - The benchmark copied the docs into `src/content/docs/`.
- **Theming:**
  - CSS variables (`--sl-color-accent-*`, `--sl-font`). Starlight's styles sit in cascade layers, so unlayered custom CSS wins ([CSS guide](https://starlight.astro.build/guides/css-and-tailwind/)).
  - Self-hosted `@font-face` is supported ([customization](https://starlight.astro.build/guides/customization/)).
  - Any built-in component can be overridden or wrapped ([overriding components](https://starlight.astro.build/guides/overriding-components/)).
  - Landing pages: `template: splash`, or a fully custom `.astro` page in `src/pages/`, optionally inside `<StarlightPage>` ([pages](https://starlight.astro.build/guides/pages/)).
  - `<script>` tags bundle npm imports such as GSAP ([client scripts](https://docs.astro.build/en/guides/client-side-scripts/)).
  - Pages ship without a client framework. The measured build emitted 13 JS files.
- **Search:** Pagefind is built in and on by default ([site search](https://starlight.astro.build/guides/site-search/)). Searching across Docs Versions via Pagefind `mergeIndex` isn't covered by Starlight's docs, so it means overriding the search component.
- **Packaging:**
  - Starlight plugins are npm packages with `config:setup`, `updateConfig` and `addIntegration` hooks ([plugins reference](https://starlight.astro.build/reference/plugins/)).
  - I found no official example of shipping a whole site as a CLI package.
  - `astro build --root --base --outDir` covers per-build parameters. Astro's programmatic `build()` is marked experimental ([programmatic API](https://docs.astro.build/en/reference/programmatic-reference/)).
- **Measured:** 71 files (36 Pagefind); 2.1–2.4 s warm, 6.5 s cold.

### VitePress

- **Health:**
  - npm `latest` is still **1.6.4, released 2025-08-05**, so there has been no stable release in about 13 months. `next` is 2.0.0-alpha.20 (2026-09-04) ([npm](https://www.npmjs.com/package/vitepress), [releases](https://github.com/vuejs/vitepress/releases)).
  - A maintainer on 2026-08-10: beta "most likely no sooner than September", with no stable date ([discussion #5072](https://github.com/vuejs/vitepress/discussions/5072)).
  - 1.6.4 is on Vite 5 and Shiki 2; the 2.0 alpha is on Vite 8 and Shiki 4.
  - It lives in the vuejs org and lists VoidZero and others as sponsors. There were 307 open issues and PRs.
- **Runtime:** no `engines` field. The docs require Node 18+ for 1.6.4 and Node 22+ for 2.x ([getting started](https://vitepress.dev/guide/getting-started)). The benchmark ran 1.6.4 on Node 24.
- **Sub-path:** `base` is prepended to Markdown links starting with `/` and to assets ([routing](https://vitepress.dev/guide/routing), [asset handling](https://vitepress.dev/guide/asset-handling)). `vitepress build --base <path> --outDir <dir>` works per build ([CLI](https://vitepress.dev/reference/cli)).
- **Markdown:**
  - GFM tables and GitHub `> [!NOTE]` alerts are built in ([markdown](https://vitepress.dev/guide/markdown)).
  - **Relative `.md` links are rewritten natively** (measured: 0 left).
  - `blade` is highlighted (Shiki).
  - **Markdown compiles to a Vue template:**
    - Fenced code is wrapped in `v-pre` automatically. The measured Blade fences were intact.
    - `{{ }}` in prose or **inline code** is Vue interpolation. The upstream answer: "This is expected" ([#1988](https://github.com/vuejs/vitepress/issues/1988), [escaping](https://vitepress.dev/guide/using-vue#escaping)). Today's corpus has none, but future Package Docs could; a config snippet adds `v-pre` to all inline code ([discussion #3724](https://github.com/vuejs/vitepress/discussions/3724)).
    - Raw HTML is compiled too. A bare relative `src="art/x.png"` became a module import and failed the build (measured). Malformed or multi-line HTML raises "Element is missing end tag" errors ([#1940](https://github.com/vuejs/vitepress/issues/1940), [#4031](https://github.com/vuejs/vitepress/issues/4031)).
  - Dead links fail the build by default.
  - **Mermaid** is not built in. `vitepress-plugin-mermaid` was last published 2024-09-24, and its peer range covers VitePress ^1 only ([repo](https://github.com/emersonbottero/vitepress-plugin-mermaid)).
- **Theming:**
  - Extend the default theme through CSS variables. `vitepress/theme-without-fonts` drops Inter, and layout slots such as `home-hero-before` and `doc-before` are available ([extending the default theme](https://vitepress.dev/guide/extending-default-theme)).
  - Or write a fully custom theme exporting `{ Layout, enhanceApp }` ([custom theme](https://vitepress.dev/guide/custom-theme)). Landing pages use `layout: home`, `layout: page` or a custom layout.
  - Replacing internal components through aliases is possible, but their names "may be updated between minor releases".
  - The site SSRs and then **hydrates as a Vue SPA on every page**, so GSAP code runs in `mounted`/`<ClientOnly>` ([SSR compat](https://vitepress.dev/guide/ssr-compat)). MPA mode, which drops the client JS, is experimental ([MPA mode](https://vitepress.dev/guide/mpa-mode)).
- **Search:**
  - `provider: 'local'` is MiniSearch, with one lazily loaded index module per locale ([localSearchPlugin.ts](https://github.com/vuejs/vitepress/blob/main/src/node/plugins/localSearchPlugin.ts)). I found no documented cross-site merging.
  - A community plugin, `vitepress-plugin-pagefind` 0.4.24, would bring Pagefind and its `mergeIndex`.
- **Packaging:**
  - The docs include "Distributing a Custom Theme": the theme as an npm package, with shared config under a sub-path export ([custom theme](https://vitepress.dev/guide/custom-theme)).
  - The Node `build()` export isn't documented as public API.
- **Measured:** 87 files (47 JS); 4.4 s. It needed three corpus workarounds (above).

### Docusaurus

- **Health:**
  - v3.10.2 was released 2026-07-10, after 3.10.0/3.10.1 in April; that's about 2–3 minor releases a year ([releases](https://github.com/facebook/docusaurus/releases)).
  - The project is in the `facebook` org, MIT-licensed, and led by Sébastien Lorber and others ([team](https://docusaurus.io/community/team)).
  - v4 is in progress with no milestone date ([#11719](https://github.com/facebook/docusaurus/issues/11719)).
    - Done: Node 24+, React 19.2+ and Rspack 2.
    - Pending: React Router v8, and making "Faster" the default.
    - "`.md` parsed as CommonMark by default?" is listed as optional.
- **Runtime:** v3.10.2 declares `node >=20.0`. `main` (v4) declares `>=24.14`, which `.nvmrc` 24.14.1 satisfies ([package.json on main](https://github.com/facebook/docusaurus/blob/main/packages/docusaurus/package.json)).
- **Sub-path:**
  - `baseUrl` is set in `docusaurus.config.js`. There is no `--base-url` CLI flag, but the config is plain Node and may export a function, so reading an env var is an option (inferred from [config docs](https://docusaurus.io/docs/api/docusaurus-config) and [CLI](https://docusaurus.io/docs/cli)).
  - Hard-coded absolute paths aren't checked ([static assets](https://docusaurus.io/docs/static-assets)).
  - In docs-only mode (`routeBasePath: '/'`), a doc at `/` and a custom `src/pages/index.js` landing page claim the same route ([docs-only mode](https://docusaurus.io/docs/docs-introduction#docs-only-mode)).
- **Markdown:**
  - **By default every `.md` is parsed as MDX.** MDX rejected the README's unclosed `<img>` and failed the build (measured). MDX also requires escaping `{` and `<` in prose and reinterprets HTML as JSX ([MDX and React](https://docusaurus.io/docs/markdown-features/react), [what is MDX](https://mdxjs.com/docs/what-is-mdx/)).
  - `markdown.format: 'detect'` parses `.md` as CommonMark and keeps raw HTML via `rehype-raw`. The docs label that mode **experimental**, and an open issue lists what it lacks ([#9092](https://github.com/facebook/docusaurus/issues/9092)). With it, the corpus built.
  - Relative `.md` links are resolved natively when source and target belong to the same plugin instance ([links](https://docusaurus.io/docs/markdown-features/links)). Measured: all rewritten, except that `../../contributors` became `/contributors`, escaping the base.
  - **Mermaid** has an official theme, `@docusaurus/theme-mermaid` with `markdown.mermaid: true`. It renders client-side from the bundled `mermaid` package, not from a CDN ([diagrams](https://docusaurus.io/docs/markdown-features/diagrams), [source](https://github.com/facebook/docusaurus/blob/v3.10.2/packages/docusaurus-theme-mermaid/src/client/index.ts)).
  - **Prism:** PHP is opt-in via `additionalLanguages: ['php']` ([code blocks](https://docusaurus.io/docs/markdown-features/code-blocks)). Prism 1.30 has no `blade` component ([components.json](https://github.com/PrismJS/prism/blob/v1.30.0/components.json)); measured output had `blade` unhighlighted.
  - Admonitions use `:::note`. `> [!NOTE]` needs a community remark plugin ([#7471](https://github.com/facebook/docusaurus/issues/7471)).
  - `README.md` becomes a category index ([autogenerated sidebars](https://docusaurus.io/docs/sidebar/autogenerated)).
  - Pointing the docs `path` at a parent folder breaks the MDX loaders; a sibling folder is described as workable ([#9027](https://github.com/facebook/docusaurus/issues/9027)).
- **Theming:**
  - Infima CSS variables live in `custom.css` ([styling](https://docusaurus.io/docs/styling-layout)).
  - Swizzling ejects or wraps theme components. Components rated "Unsafe" "may change in a backward-incompatible way between theme minor versions" ([swizzling](https://docusaurus.io/docs/swizzling)).
  - Custom React pages go in `src/pages`, and plugins can add routes with `addRoute`.
  - Each page hydrates as a React SPA ([SSG](https://docusaurus.io/docs/advanced/ssg)), so GSAP code has to cope with client-side navigation (inferred).
- **Search:**
  - The first-class option is Algolia DocSearch, a third-party runtime service ([search](https://docusaurus.io/docs/search)).
  - Build-time alternatives are community packages: `@easyops-cn/docusaurus-search-local` 0.55.3 (lunr; its peer dependencies include `open-ask-ai`), `docusaurus-lunr-search` 3.6.0, small Pagefind plugins (0.2.x), or running Pagefind on `build/` (measured: +37 files).
- **Packaging:** presets, themes and plugins are npm packages ([using plugins](https://docusaurus.io/docs/using-plugins)). `docusaurus build <siteDir> --config <file> --out-dir <dir>` works from a wrapper. I found no official "whole site as a package" pattern.
- **Measured:** 64 files (101 with Pagefind); 10.1–11.8 s with the default bundler. "Docusaurus Faster" (Rspack) claims 2–4× ([3.6 release](https://docusaurus.io/blog/releases/3.6)); it was not enabled in the benchmark.

### Eleventy (renamed "Build Awesome")

- **Health:**
  - "Eleventy is now Build Awesome", announced 2026-03-03 as a continuation under Font Awesome, which Eleventy joined in 2024 ([blog](https://www.11ty.dev/blog/build-awesome/)).
  - The repo moved to `11ty/buildawesome`. `@11ty/eleventy` 3.1.6 (2026-06-02) is npm `latest`.
  - v4 is in alpha (alpha.10, 2026-07-01), also published as `@awesome.me/buildawesome`, with no release date ([release notes](https://github.com/11ty/buildawesome/releases/tag/v4.0.0-alpha.8)).
  - Lead: Zach Leatherman. Funding: Open Collective and Font Awesome. A paid "Build Awesome Pro" is planned; the core stays MIT ([Pro](https://www.11ty.dev/blog/build-awesome-pro/)).
- **Runtime:** v3 declares `node >=18`; v4 alpha declares `>=22.15`.
- **Sub-path:** `pathPrefix` or `--pathprefix`, plus the bundled but opt-in `HtmlBasePlugin`, which rewrites **absolute** `/…` URLs only ([HTML base](https://www.11ty.dev/docs/plugins/html-base/)).
- **Markdown:**
  - markdown-it with `html: true`.
  - **Markdown is pre-processed as Liquid by default** (`markdownTemplateEngine: "liquid"`) ([config](https://www.11ty.dev/docs/config/)). The benchmark build failed on `{{ … }}` inside a `blade` fence, and `markdownTemplateEngine: false` fixed it.
  - Relative `.md` links aren't rewritten by default (measured: 49 left). The bundled, opt-in InputPath-to-URL plugin converts them, keeps `#hash`, and doesn't error on missing targets ([InputPath to URL](https://www.11ty.dev/docs/plugins/inputpath-to-url/)).
  - **Mermaid** needs a community plugin. It renders client-side and defaults to `https://unpkg.com/mermaid@10/…` unless `mermaid_js_src` is overridden ([repo](https://github.com/KevinGimbel/eleventy-plugin-mermaid)).
  - The official highlighter plugin is Prism, which has no `blade`. Shiki through markdown-it's `highlight` hook is possible (inferred).
  - `> [!NOTE]` works via `markdown-it-github-alerts`.
  - `README.md` maps to `/README/` unless given a permalink.
- **Source location:** includes and layouts are "relative to your input directory". An open issue records that `layoutDir` must sit inside the input dir ([#2655](https://github.com/11ty/buildawesome/issues/2655)). So the shared tooling would assemble one input directory holding the Package Docs and the layouts.
- **Theming:**
  - Full freedom, with no docs theme. Nav, sidebar, TOC, prev/next and the version switcher are all to build.
  - There is an official Navigation plugin but no official TOC plugin ([plugins](https://www.11ty.dev/docs/plugins/)).
  - No runtime JS by default.
- **Search:** Pagefind as a post-step (measured: +35 files, well under 1 s).
- **Packaging:**
  - Plugins are functions passed to `addPlugin`, and `addTemplate()` supplies virtual templates ([create plugin](https://www.11ty.dev/docs/create-plugin/), [virtual templates](https://www.11ty.dev/docs/virtual-templates/)).
  - The programmatic API is `new Eleventy(input, output, {...})` ([programmatic](https://www.11ty.dev/docs/programmatic/)).
  - `setInputDirectory()` is "not available in plugins", so the input directory has to come from the wrapper's CLI or API call ([config](https://www.11ty.dev/docs/config/)).
- **Measured (bare layout):** 21 files (56 with Pagefind); about 0.8 s.

### Hugo

- **Health:** v0.166.0 shipped 2026-09-09, with roughly monthly minor releases (2026-07-06, 08-12, 09-09) and patch releases between them. The lead maintainer is bep (5.8k commits), and the README lists sponsors. I found no maintenance-mode notice. Sources: `gh api repos/gohugoio/hugo/releases`, [github.com/gohugoio/hugo](https://github.com/gohugoio/hugo).
- **Runtime:** a single Go binary. The `hugo-extended` npm package (node `>=18.17`) installed and ran it on Node 24 in the benchmark.
  - Hugo Modules need Go and Git. The docs disagree on the Go version: 1.18+ on [use modules](https://gohugo.io/hugo-modules/use-modules/), 1.27.0+ on [installation](https://gohugo.io/installation/macos/).
- **Sub-path:** `baseURL` includes the path, e.g. `https://docs.plank.co/snapshots/13.x/`, and can be set per build with `--baseURL` ([config](https://gohugo.io/configuration/all/)).
  - `relURL "/x"` resolves host-relative and drops the base path. The docs advise omitting the leading slash ([relURL](https://gohugo.io/functions/urls/relurl/)). Templates in the shared tooling must follow that.
- **Markdown:**
  - Tables, footnotes and task lists work out of the box.
  - Raw HTML needs `unsafe = true`.
  - `.md` links need `useEmbedded = 'always'`. The default, `auto`, enables the hook only for multilingual single-host sites ([link render hooks](https://gohugo.io/render-hooks/links/)). The benchmark confirmed this.
  - Mermaid needs a user-written `render-codeblock-mermaid.html` hook ([diagrams](https://gohugo.io/content-management/diagrams/)).
  - `> [!NOTE]` alerts need a user-written blockquote hook, available since v0.132.0 ([blockquote hooks](https://gohugo.io/render-hooks/blockquotes/)). `> **Note:**` renders as a plain blockquote.
- **Source location:** module mounts accept absolute paths for the main project ([module config](https://gohugo.io/configuration/module/)), so a Package repo's `docs/` can be mounted in place.
- **Theming:**
  - Core has no docs theme, so nav, sidebar, TOC, search UI, alert and mermaid hooks are all Go templates to write.
  - Third-party docs themes exist (Docsy, Hextra, Doks); not evaluated here.
  - `js.Build` (esbuild) bundles npm dependencies such as GSAP ([js.Build](https://gohugo.io/functions/js/build/)).
  - Full design freedom, and the whole docs chrome to build.
- **Search:** none built in. Pagefind runs as a post-step.
- **Packaging:**
  - Hugo Modules, versioned through `go.mod`, need Go in CI.
  - A theme shipped as an npm package and mounted from `node_modules` is plausible given module mounts. That is not verified.
- **Measured:** 36 files, 72 with Pagefind; about 0.7 s plus 0.7 s for Pagefind. `blade` fences render as plain text.

### MkDocs + Material for MkDocs

- **Health:**
  - MkDocs 1.6.1 is the latest stable, released 2024-08-30. The last commit to `master` was 2025-10-20.
  - A rewrite, MkDocs 2.0, is in dev pre-releases (`2.0.dev0` to `dev3`, 2026-08-28 to 09-02, no license metadata on PyPI). Sources: [PyPI](https://pypi.org/pypi/mkdocs/json), [discussion #4077](https://github.com/mkdocs/mkdocs/discussions/4077).
  - The Material team writes that 2.0 drops the plugin system, rewrites theming and uses TOML config, that "Material for MkDocs is incompatible with MkDocs 2.0", and that "MkDocs 1.x is unmaintained" ([Material blog, 2026-02-18](https://squidfunk.github.io/mkdocs-material/blog/2026/02/18/mkdocs-2.0/)). The benchmark build printed that warning.
  - Material 9.7.7 was released 2026-07-17. It has been in **maintenance mode** since 9.7.0 (2025-11-11): "fix critical bugs and security issues for 12 month at least, no new features" ([announcement](https://squidfunk.github.io/mkdocs-material/blog/2025/11/11/insiders-now-free-for-everyone/)). It pins `mkdocs<2`.
- **Runtime:** Python (`>=3.8`) with pip or uv, alongside Node 24 for anything Node-based in the shared tooling (Pagefind, GSAP bundling).
- **Sub-path:** `site_url` includes the subdirectory. Output uses page-relative URLs. Authored absolute `/foo` links are not modified ([writing your docs](https://www.mkdocs.org/user-guide/writing-your-docs/)).
- **Markdown:**
  - Tables work by default.
  - `.md` links, anchors included, are rewritten natively.
  - `README.md` can serve as an index page.
  - Titles fall back to the first H1, so no frontmatter is needed.
  - Raw HTML passes through, but links inside it aren't converted.
  - Mermaid works through a `superfences` custom fence ([diagrams](https://squidfunk.github.io/mkdocs-material/reference/diagrams/)).
  - Admonitions use `!!! note`. GitHub `> [!NOTE]` alerts need the third-party [`markdown-callouts`](https://github.com/oprypin/markdown-callouts).
  - `docs_dir` may be absolute.
- **Theming:**
  - `custom_dir` template overrides with 16 blocks, plus `extra_css` and `extra_javascript` ([customization](https://squidfunk.github.io/mkdocs-material/customization/)).
  - A custom landing page works the way Material's own `overrides/home.html` does.
  - Self-hosted fonts: `font: false` plus `@font-face` and `--md-text-font` ([fonts](https://squidfunk.github.io/mkdocs-material/setup/changing-the-fonts/)).
  - Custom palette: `primary: custom` plus CSS variables ([colors](https://squidfunk.github.io/mkdocs-material/setup/changing-the-colors/)).
  - Instant-loading navigation means custom JS such as GSAP re-initialises through `document$.subscribe`.
- **Search:** built-in lunr, client-side, written to a single `search/search_index.json` ([search plugin](https://squidfunk.github.io/mkdocs-material/plugins/search/)).
- **Packaging:** `INHERIT` deep-merges a shared base config. Themes and overrides ship as pip packages ([configuration](https://www.mkdocs.org/user-guide/configuration/)).
- **Measured:** 68 files, about 1 s. It built the corpus with no config changes, and `.md` links were rewritten. `blade` fences render as plain text.

### Zensical (the Material team's successor)

- **Health:** v0.0.60 shipped 2026-09-08, with about weekly releases. PyPI classifies it "Development Status :: 3 - Alpha", and the [roadmap](https://zensical.org/about/roadmap/) says "currently alpha software" with no dates. It is MIT-licensed and built in Rust plus Python, funded through the "Zensical Spark" support tier ([announcement](https://squidfunk.github.io/mkdocs-material/blog/2025/11/05/zensical/)).
- **Runtime:** Python `>=3.10`.
- **Markdown:**
  - Python-Markdown and pymdown extensions are supported "without changes" ([compatibility](https://zensical.org/compatibility/)).
  - GitHub `> [!NOTE]` callouts work via `pymdownx.quotes` with `callouts: true` ([admonitions](https://zensical.org/docs/authoring/admonitions/)).
  - `docs_dir` "must be a relative path" and can't be `.`, a temporary limitation ([basics](https://zensical.org/docs/setup/basics/)). A Package repo's `docs/` therefore sits under the project, e.g. copied or checked out in place.
- **Theming:** MiniJinja templates with `custom_dir`. Material overrides need adapting. `extra_css` and `extra_javascript` work ([customization](https://zensical.org/docs/customization/)).
- **Search:** its own client-side engine. The index format is not documented ([search](https://zensical.org/docs/setup/search/)).
- **Packaging:** theme extensions ship on PyPI. The module system is not released yet. `INHERIT` support is not verified.
- **Measured:** it built the corpus from the same `mkdocs.yml` with no changes. 33 files, about 0.7 s, `.md` links rewritten, `blade` fences plain.

## 4. Cross-cutting findings

### 4.1 Search across independently built Docs Versions

Each Package/Major Line build is a separate output. Pagefind can combine several independently built indexes in one search UI with `mergeIndex: [{ bundlePath: "…/pagefind" }]`, plus `mergeFilter` and `indexWeight` ([pagefind.app/docs/multisite](https://pagefind.app/docs/multisite/)). If the indexes are served from other origins, CORS headers are needed.

The bundle path must include the sub-path, e.g. `/documentation/pagefind/pagefind.js` ([Pagefind API docs](https://github.com/Pagefind/pagefind/blob/main/docs/content/docs/api.md)). Pagefind is an npm package with platform binaries as optional dependencies, run via `npx pagefind --site <dir>` ([installation](https://pagefind.app/docs/installation/)). Its current release is v1.5.2 (2026-04-12).

Measured on this corpus, Pagefind adds 35–37 files per 21-page Docs Version: one fragment per page plus index, meta and wasm chunks. Section 4.5 relates that to Cloudflare's per-deploy file caps.

MiniSearch (VitePress) and lunr (MkDocs Material) indexes are per-build files. I found no documented way to merge them across separately built sites.

### 4.2 Mermaid without a third-party runtime

In every candidate the mermaid `stateDiagram-v2` block reaches the page as a marked code block, and mermaid.js renders it in the browser. Several documented default setups load mermaid.js from a public CDN:

- The Hugo docs example imports `https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.esm.min.mjs` ([gohugo.io diagrams](https://gohugo.io/content-management/diagrams/)).
- Material for MkDocs loads `https://unpkg.com/mermaid@11/dist/mermaid.min.js` unless a mermaid global already exists ([source, line 72](https://github.com/squidfunk/mkdocs-material/blob/master/src/templates/assets/javascripts/components/content/mermaid/index.ts)).
- The Zensical docs example imports from unpkg ([zensical diagrams](https://zensical.org/docs/authoring/diagrams/)).

Keeping to "no third-party runtime services" means bundling or self-hosting mermaid.js in the shared tooling, whichever generator is used. mermaid.js is a large client-side dependency, loaded only on pages that have a diagram. A client-side Starlight plugin puts Mermaid core at about 450 KB uncompressed ([starlight-client-mermaid](https://github.com/pasqal-io/starlight-client-mermaid)).

Per generator:

- Docusaurus has an official theme that bundles mermaid from npm.
- Starlight (`astro-mermaid`), VitePress (`vitepress-plugin-mermaid`, last published 2024-09) and Eleventy use community plugins.
- Hugo, MkDocs and Zensical use a template hook or a superfence with a script you supply.
- Rendering at build time (`rehype-mermaid`, `@mermaid-js/mermaid-cli`) needs Playwright or Puppeteer with Chromium in CI.

### 4.3 Blade syntax highlighting

Package Docs use `blade` fences. On this corpus:

- Shiki-based highlighters render them highlighted. That covers VitePress, and Starlight via Expressive Code. Shiki bundles a `blade` grammar, taken from laravel/vs-code-extension ([tm-grammars list](https://github.com/shikijs/textmate-grammars-themes/blob/main/packages/tm-grammars/README.md)).
- Chroma (Hugo) has no Blade lexer. It has `twig`, `php`, `json`, `sql` and `bash` ([chroma lexers](https://github.com/alecthomas/chroma/tree/master/lexers)). The measured Hugo output rendered `blade` blocks as plain text.
- Pygments (MkDocs, Zensical) has no Blade lexer ([pygments `_mapping.py`](https://github.com/pygments/pygments/blob/master/pygments/lexers/_mapping.py)). The measured output rendered those blocks as plain, unlabelled text.- Prism (Docusaurus; Eleventy's official highlighter plugin) has `php`, `twig` and `latte` but no `blade` ([Prism 1.30 components](https://github.com/PrismJS/prism/blob/v1.30.0/components.json)). The measured Docusaurus output rendered `blade` blocks with no token highlighting.

Where no Blade grammar exists, the options are to add one (a custom lexer or grammar), map `blade` to `php` or `html`, or accept plain text.

### 4.4 README normalisation is needed whatever the generator

Three things in today's READMEs need a pre-processing step in the shared tooling if READMEs are ingested as they are:

- Links that leave the docs set (`CONTRIBUTING.md`, `LICENSE.md`, `../../contributors`) need rewriting to GitHub URLs, or else they fail or warn.
  - VitePress fails the build on dead links by default; `ignoreDeadLinks` turns that off ([VitePress site config](https://vitepress.dev/reference/site-config#ignoredeadlinks)).
  - Docusaurus rewrote `../../contributors` to `/contributors`, which escapes the base.
- `art/<pkg>.png` in raw HTML needs copying next to the page. For VitePress it also needs rewriting to `./art/…`: Vue's template compiler treated the bare relative `src` as a package import, and the build failed even with the file present.
- The header `<img>` is unclosed. MDX, which Docusaurus uses by default for `.md`, rejects it, and the whole build fails.

A related corpus issue: the snapshots README links `#auto-migrate`, but no such heading exists. MkDocs reported it.

### 4.5 Cloudflare facts relevant to per-build output

- **Pages:**
  - Free plan: 20,000 files per site (100,000 on paid plans), 25 MiB maximum file size, 500 builds/month, 100 projects per account.
  - Direct Upload through wrangler accepts up to 20,000 files.
  - Sources: [Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).
- **Deployments are atomic, hash-addressed snapshots** ([preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)). I found no verbatim statement that a Pages deployment replaces every file. It is implied by that model, and it matters if many Docs Versions share one Pages project.
- **Workers Static Assets:** 20,000 files per Worker version on Free (100,000 on Paid) and 25 MiB per file ([Workers limits](https://developers.cloudflare.com/workers/platform/limits/)).
- **Path routing:** a Worker with assets can be routed on a path like `example.com/blog/*`, with its assets nested under a matching directory ([serving a subdirectory](https://developers.cloudflare.com/workers/static-assets/routing/advanced/serving-a-subdirectory/)).
- **Request costs:**
  - Static-asset requests are "free and unlimited" ([billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)).
  - Worker invocations on Free are capped at 100,000/day ([limits](https://developers.cloudflare.com/workers/platform/limits/)).

At the measured 33–118 files per 21-page Docs Version (Pagefind included where it applies), the 20,000-file cap equals roughly 170–600 Docs Versions of this size, if they all land in one deploy. How deploys are split across Pages projects or Workers is a hosting question, beyond this ticket.

### 4.6 plank.co design inputs any candidate would need to accept

plank.co is a WordPress theme (`/wp-content/themes/plank/`). Its CSS and JS show:

- **Fonts:** self-hosted `@font-face` for **Gascogne** (serif, weights 500/600) and **Untitled Sans** (400/500/500 italic), in WOFF2/WOFF/OTF. Whether the font licence covers another domain (`docs.plank.co`) is not checked here.
- **Palette** (the most frequent values): `#112621`, `#1f453b` (dark greens), `#fcfbfa`, `#f0ede8` (off-whites), `#ff9375` (coral), `#bfc9bd` (sage), `#fae370` (yellow).
- **Dark mode and motion:** there is no `prefers-color-scheme: dark` rule. There are `prefers-reduced-motion` rules.
- **Motion:** the bundled JS includes GSAP with ScrollTrigger and SplitText, plus Lottie, Swiper and Three.js.
  - GSAP, including SplitText and the other formerly paid plugins, has been free for commercial use under the Standard "No Charge" License since 2025-04-30 ([gsap.com/licensing](https://gsap.com/licensing/)).
  - The one carve-out covers no-code visual animation builders that compete with Webflow.

Every candidate accepts arbitrary CSS and JS. They differ in how much of the chrome (nav, sidebar, TOC, search box) comes pre-built and themable versus written from scratch. Section 3 covers that.

## 5. Not verified

- **Themed output.** Eleventy and Hugo were measured with a bare layout, so a themed build with nav, TOC and CSS/JS assets will emit more files and take longer. I didn't check rendered mermaid output in any candidate, only that the block reaches the page marked for mermaid.
- **Cloudflare.** That a Pages deployment replaces every file is inferred from its atomic-deployment model, not quoted.
- **Pagefind.** One fragment per page is inferred from source and docs. It is consistent with the measured 35–37 files for 21–22 pages.
- **Starlight.** Whether a plugin can set `components` and `customCss` through `updateConfig`. How unlabelled fences render.
- **VitePress.** Whether `srcDir` can point outside the project. Measured: `README.md` routes to `/README.html`.
- **Docusaurus.**
  - `#anchor` handling in cross-file `.md` links.
  - Compatibility with mermaid 12, published 2026-09-10.
  - A documented recipe for self-hosted fonts; plain CSS `@font-face` is assumed.
  - A whole-site-as-npm-package pattern.
- **Eleventy.**
  - Whether `HtmlBasePlugin` rewrites CSS `url()`.
  - Layouts outside the input dir via `../` or virtual templates.
  - A programmatic `pathPrefix` option.
- **Hugo.**
  - The Go version needed for Hugo Modules; the docs say 1.18+ in one place and 1.27.0+ in another.
  - Consuming a theme through npm plus module mounts, without Go.
- **Zensical.** `INHERIT` support, the search index format, and any cross-site index merging.
- **plank.co fonts.** Whether the Gascogne and Untitled Sans licences cover `docs.plank.co`.

## Sources

Primary sources are cited inline. The measurements came from throwaway builds in a scratch directory; none of that code is committed.
