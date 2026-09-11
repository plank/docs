# How can search span independently deployed sections?

Research for [plank/docs#4](https://github.com/plank/docs/issues/4). Researched 2026-09-11.

This file records how each option behaves and what it costs. It does not pick one.

## The setting (User-set constraints)

- Package Docs are markdown, written in each Package's own repo.
- Each Package's release workflow builds and deploys its own section of one Docs Site at `packages.plank.co/<package>`, using shared build tooling.
- One Docs Version per Major Line, e.g. `packages.plank.co/snapshots/13.x/`.
- Hosted on Cloudflare, $0 recurring cost, no third-party runtime services.

Everything below assumes a Docs Version is built and deployed as a unit at `/<package>/<major-line>/`, and that a build-time search index for it can sit beside it (e.g. `/<package>/<major-line>/pagefind/`). Every section is served from the one hostname, so no option below needs CORS.

## Summary

| Option | Within one Docs Version | Across Packages | New section becomes searchable by… | Main costs |
|---|---|---|---|---|
| **A. Pagefind bundle per Docs Version, merged in the browser** (`mergeIndex`) | Load only that section's bundle. | The page merges other sections' bundles at runtime. | Publishing its bundle and adding its path to a list the search page reads at runtime (e.g. a site manifest). No other section redeploys. | Each merged bundle adds 2 small requests at merge time and its own index-chunk request(s) on every query. Ranking across bundles uses per-bundle statistics. One missing bundle makes the merge throw. Mixed Pagefind versions only warn. |
| **B. One combined Pagefind bundle, rebuilt centrally** | Filter the combined index by `package` + `version`, or keep option A's per-section bundle for this. | One index, one ranking. | A central job re-indexes the whole Docs Site after each Package deploy. | A second, central deploy per release. Search lags until that job finishes, and the job depends on every section's HTML. |
| **C. Another static library (MiniSearch, Lunr, FlexSearch, Orama, …)** | Load that section's index. | The site code loads N indexes and merges results itself. | Same discovery list as option A. | See [Other static search libraries](#other-static-search-libraries). Most load the whole index before the first query. None ships a first-party cross-site merge. |
| **D. The SSG's own search** | Covers the one build that produced it. | Starlight passes Pagefind's `mergeIndex` through its config. The other built-in searches have no multi-site option. | Starlight: the merge list sits in each section's build config, so older sections include a newcomer only after they rebuild (or after the search component is overridden to read a runtime list). | See [Search each candidate SSG ships with](#search-each-candidate-ssg-ships-with). |

## Option A — Pagefind: one bundle per Docs Version, merged in the browser

Current release: Pagefind **v1.5.2** (2026-04-12), [releases](https://github.com/Pagefind/pagefind/releases). The source quoted below is tag `v1.5.2`.

### How it works

- Each Docs Version's build runs Pagefind over its own HTML output. That writes a bundle directory (default `pagefind/`, [`output_subdir`](https://pagefind.app/docs/config-options/)) into the section.
- In the browser, a page loads its own section's `pagefind.js` as the **primary** instance. It then calls [`mergeIndex(bundlePath, options)`](https://pagefind.app/docs/multisite/) for each other bundle. The Component UI takes the same list as `mergeIndex: [{ bundlePath, ... }]` ([multisite docs](https://pagefind.app/docs/multisite/)).
- A merged bundle is searched with the **primary's WebAssembly**; it does not load its own. `mergeIndex` waits for the primary's WASM, then fetches only the merged bundle's `pagefind-entry.json` and `pagefind.<lang>_<hash>.pf_meta` ([`coupled_search.ts` L867–893](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/lib/coupled_search.ts#L867-L893), [L238–264](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/lib/coupled_search.ts#L238-L264)).
- `search()` runs the query against **every** instance in parallel. It flattens all results into one list sorted by `score × indexWeight`, sums `unfilteredResultCount`, and adds the filter counts together ([L942–981](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/lib/coupled_search.ts#L942-L981), [L895–911](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/lib/coupled_search.ts#L895-L911)).
- **Result URLs and `baseUrl`.** Each page's URL is stored relative to the directory Pagefind indexed (`/installation/`). An instance's `baseUrl` defaults to everything in its bundle path before `pagefind/` ([`getDefaultBaseUrl`, L156–159](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/lib/coupled_search.ts#L156-L159)). It is prepended to each result URL unless that URL is already absolute ([`fullUrl`, L452–460](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/lib/coupled_search.ts#L452-L460)). So a bundle served at `/publisher/1.x/pagefind/` links its results under `/publisher/1.x/` with no configuration. This holds when Pagefind indexes the Docs Version's own output directory. Each merged index can also take its own `baseUrl` option ([search config](https://pagefind.app/docs/search-config/)).
- The primary's bundle path is detected from the URL `pagefind.js` was imported from ([`initPrimaryBasePath`, L139–154](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/lib/coupled_search.ts#L139-L154)). A page at `/snapshots/13.x/…` that imports `/snapshots/13.x/pagefind/pagefind.js` searches its own Docs Version by default.

### Within one Docs Version

Use the primary instance alone, with no `mergeIndex` calls. The section's search depends on nothing outside itself.

### Across Packages

The search page calls `mergeIndex` for each other section's bundle. Which bundles to merge is a choice the page makes at runtime. It could be every Docs Version of every Package, or only the newest Docs Version of each Package. That choice sets both the query cost and how many near-duplicate results appear (see [UX](#ux-considerations)).

A site-wide search page outside any Package (e.g. the landing page at `/`) needs a primary bundle of its own, even an index of the landing page alone, which then merges every section.

### Filtering by Package and Docs Version

Two first-party mechanisms:

1. **Tag pages at build time.** The shared layout emits `data-pagefind-filter` values ([filtering docs](https://pagefind.app/docs/filtering/)). **One inline value per attribute**: the parser splits on the first `:`, so `data-pagefind-filter="package:publisher, version:1.x"` produces one filter, `package`, with the value `publisher, version:1.x` ([`parse_attr_string`, parser.rs L639–661](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind/src/fossick/parser.rs#L639-L661)). Using one element per filter (`<span data-pagefind-filter="package:publisher">`, `<span data-pagefind-filter="version:1.x">`) indexed both (measured, below).
2. **`mergeFilter` at merge time.** It adds a synthetic filter to every page of a merged bundle without tagging pages, e.g. `mergeIndex("/publisher/1.x/pagefind/", { mergeFilter: { package: "publisher", version: "1.x" } })` ([multisite docs](https://pagefind.app/docs/multisite/#filtering-results-by-index), [L252–256](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/lib/coupled_search.ts#L252-L256)).

You query with `search(term, { filters: { package: "publisher", version: { any: ["1.x", "2.x"] } } })`; `null` gives a filter-only search. `pagefind.filters()` loads the filter chunks and returns counts per value ([JS API filtering](https://pagefind.app/docs/js-api-filtering/)).

**Costs.**
- Filters apply per instance, after that instance has fetched the index chunks for the term. Filtering down to one Package still costs every merged bundle's chunk fetches ([`search`, L669–683](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/lib/coupled_search.ts#L669-L683)). The number of bundles loaded, not the filter, sets how much a query fetches.
- If an index has **none** of the requested filter keys, Pagefind skips filtering for that index and returns its unfiltered results ([`filter.rs` L232–234](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web/src/filter.rs#L225-L235), [`search.rs` L260–262](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web/src/search.rs#L260-L262)). Every bundle therefore needs the same filter keys, from the shared layout or from `mergeFilter`.

### Index size and query-time fetches

Measured with Pagefind 1.5.2, indexing the current Package Docs rendered to plain HTML. `plank/publisher`'s `docs/` is 20 pages, about 15k words of markdown. `plank/snapshots` is a README of 1 page, about 1.6k words. Sizes are on disk; Pagefind gzips the `pf_*` and WASM files itself ([hosting docs](https://pagefind.app/docs/hosting/)).

| File (per bundle) | publisher/1.x | snapshots/13.x | Fetched |
|---|---|---|---|
| `pagefind-entry.json` | 172 B | 171 B | on init, always fresh (`?ts=` cache-buster, [L266–275](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/lib/coupled_search.ts#L266-L275)) |
| `pagefind.*.pf_meta` | 305 B | 131 B | on init |
| `wasm.en.pagefind` | 72.7 KB | 72.7 KB | on init, **primary only** |
| `pagefind.js` + `pagefind-worker.js` | 45.5 KB + 41.3 KB | same | primary only |
| `pagefind-component-ui.js` + `.css` | 175.5 KB + 41.8 KB | same | if the Component UI is used |
| `index/*.pf_index` | 2 chunks: 15.8 KB, 32.1 KB | 1 chunk: 5.6 KB | per query, only the chunks holding the typed terms |
| `fragment/*.pf_fragment` | 20 files, 0.9–2.7 KB | 1 file, 3.7 KB | per result shown (`result.data()`) |
| `filter/*.pf_filter` | 3 files, < 100 B | 3 files, < 100 B | when filtering or loading filter counts |
| Files in bundle | 37 | 18 | |

Pagefind's own claim: "a full-text search on a 10,000 page site with a total network payload under 300kB, including the Pagefind library itself. For most sites, this will be closer to 100kB" ([pagefind.app](https://pagefind.app/)). v1.5.0 made index chunks "~45% smaller" ([v1.5.0 release](https://github.com/Pagefind/pagefind/releases/tag/v1.5.0)). The default chunk size is 20,000 (a word-count-based size; [`options.rs` L217–219](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind/src/options.rs#L217-L219)).

**What merging adds.** With N merged bundles:
- At merge time: 2N small requests (entry + meta, a few hundred bytes each here).
- On each query: up to N index-chunk requests per term group. That is the only per-query cost that grows with N; results still only fetch their own fragments.
- Each instance keeps its own fetch queue, capped at 100 concurrent fetches ([L52](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/lib/coupled_search.ts#L52), [L113–126](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/lib/coupled_search.ts#L113-L126)).

### How a new Package or Docs Version becomes searchable

Pagefind has no discovery mechanism. The list of bundle paths is whatever the page passes to `mergeIndex`. Two shapes:

- **List baked into each build.** Adding a Package or Docs Version then needs every other section to rebuild before its search includes the newcomer. Each Package's cross-Package search stays out of date until that Package's next release.
- **List read at runtime.** The page fetches a small JSON listing sections (e.g. the manifest [#11](https://github.com/plank/docs/issues/11) asks about for the landing page and version switcher), then calls `mergeIndex` for each entry. A new Docs Version is searchable everywhere once its bundle is deployed and the list is updated; no other section rebuilds. The cost is one more fetch before cross-Package search can start, plus whatever keeps the list current.

**Failure costs of a runtime list.**
- If a listed bundle is missing (not yet deployed, or a retired Major Line left in the list), its `loadEntry` throws "Failed to load Pagefind metadata" ([L302–305](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/lib/coupled_search.ts#L302-L305)).
- The Component UI awaits each `mergeIndex` in sequence with no catch around it ([`instance.ts` L664–670](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_ui/component/core/instance.ts#L664-L670)), so one bad path stops the setup. The maintainer suggested an `optional: true` per-index option in open issue [#887 "Don't fail hard on missing index files"](https://github.com/Pagefind/pagefind/issues/887).
- Page code that calls `mergeIndex` itself can wrap each call in its own `try/catch`.

### Pagefind versions across sections

Docs Versions for older Major Lines may not be rebuilt when the shared tooling moves to a newer Pagefind.
- A merged bundle from another Pagefind version produces a console warning only: "If you encounter any search errors, make sure that both sites are running the same version of Pagefind" ([L282–301](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/lib/coupled_search.ts#L282-L301)).
- Merged bundles are decoded by the primary's WASM. v1.5.0 changed index-chunk encoding (delta-encoding; [release notes](https://github.com/Pagefind/pagefind/releases/tag/v1.5.0)). Whether a 1.5 WASM reads a pre-1.5 bundle correctly is **unverified**.
- The cost is keeping one Pagefind version across all live bundles, or rebuilding old Docs Versions' bundles when it changes.

### Ranking across bundles

Scores come from each bundle's own statistics (page counts, term frequencies). Results from different bundles are then sorted by raw `score × indexWeight` ([L735](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/lib/coupled_search.ts#L735), [L954–957](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/lib/coupled_search.ts#L954-L957)). The maintainer: "The ranking can still be a bit of an unknown between merged indexes, as a lot of the ranking parameters are unique per index" ([#796](https://github.com/Pagefind/pagefind/issues/796)). A one-page README bundle and a 20-page `docs/` bundle are scored on different bases. `indexWeight` per bundle is the first-party tuning knob.

### Cloudflare file counts

Pagefind writes one fragment per page, plus index chunks, filter chunks, and about 15 fixed JS/CSS/WASM files per bundle (measured above). Cloudflare Pages allows 20,000 files per site on the Free plan ([Pages limits](https://developers.cloudflare.com/pages/platform/limits/)). Workers static assets allow 20,000 files per Worker version on Free ([Workers limits](https://developers.cloudflare.com/workers/platform/limits/)). Whether that limit applies per Docs Version, per Package, or to the whole Docs Site depends on how [#3](https://github.com/plank/docs/issues/3) lays out deployments. Grouping fragments into fewer files is open issue [#74](https://github.com/Pagefind/pagefind/issues/74). A Cloudflare Pages user hitting the 20,000 limit reports working around it with `mergeIndex` there.

## Option B — Pagefind: one combined bundle, rebuilt centrally

A job outside the Packages builds one bundle (e.g. at `/pagefind/`) covering every section. It could run in this infrastructure repo, triggered after each Package deploy.

- **Input.** The job needs every section's HTML. Pagefind's Node API can index HTML held in memory with an explicit URL: `index.addHTMLFile({ url, content })`. It can also index `addCustomRecord({ url, content, language, meta, filters })` or a directory on disk, then `writeFiles()` ([Node API](https://pagefind.app/docs/node-api/)). The HTML could come from the deployed site or from build artifacts each Package publishes. Either way, the job reaches into every section.
- **Query cost.** Same as a single site: one entry + meta, one WASM, chunks for the typed terms, fragments per result shown. Ranking uses one set of statistics across all Packages.
- **Filtering.** The same `package` and `version` filters, on one index. Search within a Docs Version could use the combined bundle with filters. It could also keep option A's per-section bundle, so it doesn't wait on the central job.
- **New sections.** A Package's deploy is searchable site-wide only after the central job reruns. That makes each release two deploys: the Package's section, then the combined index. A failed or slow central job leaves cross-Package search stale for every Package.
- **Cost on $0.** The central job's build minutes and one extra Cloudflare deploy per Package release. Cloudflare Pages allows 500 builds a month on Free ([Pages limits](https://developers.cloudflare.com/pages/platform/limits/)); direct uploads from CI are a separate question for #3/#10.

## Other static search libraries

Option C: build one index per Docs Version with a library, deploy it beside the section, and load several in the browser. Findings common to all eight libraries checked:

- **Each section's whole index is downloaded before the first query.** None documents lazy, chunk-per-term loading over HTTP, as Pagefind does. FlexSearch exports in chunks, but "You need to import every key! Otherwise, your index does not work" ([export-import.md](https://github.com/nextapps-de/flexsearch/blob/master/doc/export-import.md)).
- **None has a first-party API that merges separately built indexes.** Every one can hold several loaded instances, so querying N instances and merging and re-ranking the results is site code.
  - MiniSearch: merging was asked for and the maintainer said "it is probably not possible to merge two indexes more efficiently than in a reindex" ([#247](https://github.com/lucaong/minisearch/issues/247)).
  - Lunr: the merge request has been open since 2013 ([#29](https://github.com/olivernn/lunr.js/issues/29)).
  - Orama: `load` replaces the database's data rather than adding to it ([serialization.ts](https://github.com/oramasearch/orama/blob/main/packages/orama/src/methods/serialization.ts)).
- **Scores from different indexes are on different scales for BM25-based libraries.** MiniSearch (BM25+), Lunr and Orama compute scores from corpus-wide statistics (document count, term document frequency, average field length), so each score reflects the index it came from ([MiniSearch.ts](https://github.com/lucaong/minisearch/blob/master/src/MiniSearch.ts), [Lunr searching guide](https://lunrjs.com/guides/searching.html), [Orama README](https://github.com/oramasearch/orama)). Fuse.js scores use no corpus-wide statistic ([computeScore.ts](https://github.com/krisk/Fuse/blob/main/src/core/computeScore.ts)).
- **None has a discovery feature.** A runtime list of index URLs is site code, as in option A.

| Library | Filter by Package / Docs Version | Index size notes (project's own) | Latest release |
|---|---|---|---|
| [MiniSearch](https://github.com/lucaong/minisearch) (used by VitePress) | `filter` callback over `storeFields`, applied after matching | none published | 7.2.0, 2025-09-16 |
| [Lunr](https://github.com/olivernn/lunr.js) | field-scoped `+field:value` query terms (inferred from the query syntax) | none; display text needs a separate document store | 2.3.9, 2020-08-19 |
| [FlexSearch](https://github.com/nextapps-de/flexsearch) | `tag` fields on `Document` indexes (OR within a tag, AND across tags) | in-memory figures only | 0.8.212, 2025-09-06 |
| [Orama](https://github.com/oramasearch/orama) (OSS, used by Fumadocs) | `where` on `enum` fields (`eq`/`in`/`nin`), facets, `groupBy` | none; the persisted snapshot includes the documents | 3.1.18, 2025-12-19 |
| [Stork](https://github.com/jameslittle230/stork) | not documented | none | 2.0.0-beta.2, 2023-03-05; author "winding down" ([discussion #360](https://github.com/jameslittle230/stork/discussions/360)) |
| [tinysearch](https://github.com/tinysearch/tinysearch) | not documented | "73 posts creates an optimized WASM payload of 179 kB (83 kB gzipped…)"; one WASM per build | 0.11.0, 2026-08-14 |
| [Fuse.js](https://github.com/krisk/Fuse) | key-scoped logical queries (`$and`, `$or`) | build timings only; ships the document list plus the index | 7.5.0, 2026-07-13 |
| [elasticlunr](https://github.com/weixsong/elasticlunr.js) (used by Zola, mdBook) | field choice and boost at query time | "about half size of lunr.js index file" (a pre-Lunr-2 claim) | 0.9.5, 2016-09-08 |

**What option C costs, compared with option A.**
- Query-time bytes grow with the **total size** of every index loaded, not with the chunks touched by the query.
- Cross-index merging, ranking, excerpts and the filter UI are code the shared tooling would own.
- In exchange, the index format is plain JSON (or WASM) under the tooling's control. There is no WASM-version coupling between sections, except for tinysearch and Stork.

## Search each candidate SSG ships with

In every candidate, the search the generator ships indexes only the pages of the build that ran it. Starlight is the one that surfaces a first-party cross-site option in config: Pagefind's `mergeIndex`.

| SSG | Built-in search | Index and loading | Across independently built sections | Filter / version scoping |
|---|---|---|---|---|
| [Astro Starlight](https://starlight.astro.build/guides/site-search/) | Pagefind, on by default | Pagefind bundle (see option A) | The `pagefind` option takes `PagefindOptions`, including `mergeIndex`, `ranking` and `indexWeight` ([config reference](https://starlight.astro.build/reference/configuration/)). The list is fixed in each section's build config. Starlight's `Search.astro` uses the older `PagefindUI` (Default UI), not the 1.5 Component UI ([Search.astro](https://cdn.jsdelivr.net/npm/@astrojs/starlight/components/Search.astro)). Any component can be overridden via `components`. | `mergeFilter` per merged bundle. No built-in versioning. |
| [VitePress](https://vitepress.dev/reference/default-theme-search) | MiniSearch (`provider: 'local'`) | One serialized MiniSearch index per locale, loaded whole with `loadJSON` ([localSearchPlugin.ts](https://github.com/vuejs/vitepress/blob/main/src/node/plugins/localSearchPlugin.ts), [VPLocalSearchBox.vue](https://github.com/vuejs/vitepress/blob/main/src/client/theme-default/components/VPLocalSearchBox.vue)) | No multi-site option. Cross-section search means replacing the theme's search component. | Exclude pages via `_render`. No facets. |
| [Docusaurus](https://docusaurus.io/docs/search) | None: "There is no built-in local search." Algolia DocSearch is the official option (hosted). | — | Community plugins only (e.g. `docusaurus-plugin-pagefind`, `@easyops-cn/docusaurus-search-local`). `SearchBar` can be swizzled. | Contextual (per-version) search relies on Algolia facets. |
| [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/setup/setting-up-site-search/) | lunr | One `search/search_index.json`, fetched against the current build's base and indexed in the browser ([plugin.py](https://github.com/squidfunk/mkdocs-material/blob/master/material/plugins/search/plugin.py)) | One build. With mike, each version is its own build and fetches its own index (inferred from source; not stated in the docs). | `search.exclude` / `boost`. No facets. Material's final maintenance period ends **2026-11-05** ([#8523](https://github.com/squidfunk/mkdocs-material/issues/8523)); the successor is [Zensical](https://zensical.org/docs/setup/search/). |
| [Hugo](https://gohugo.io/tools/search/) | None; the docs list tools, open-source Pagefind first | — | As the chosen tool (Pagefind: option A) | — |
| [Eleventy](https://www.11ty.dev/docs/) | None found | — | As the chosen tool | — |
| [Zola](https://www.getzola.org/documentation/content/search/) | Builds an elasticlunr or Fuse index; no JS/CSS UI | One `search_index.<lang>.js`/`.json` per build | The UI is your own code, so which index files it loads is yours to choose (option C). | `in_search_index` per section |
| [mdBook](https://rust-lang.github.io/mdBook/format/configuration/renderers.html) | elasticlunr | One `searchindex.js`, loaded when the search input opens (since 0.4.52, [CHANGELOG](https://github.com/rust-lang/mdBook/blob/master/CHANGELOG.md)) | One book. `copy-js = false` lets you supply your own search JS. | Exclude chapters |
| [Just the Docs](https://just-the-docs.com/docs/search/) (Jekyll) | lunr | `search-data.json` fetched on page load, indexed in the browser | One site | `search_exclude` |
| [Nextra](https://nextra.site/docs/guide/search) (v4) | Pagefind, run by your own `postbuild` script | Pagefind bundle | You run the CLI; the Layout `search` prop takes any component. Whether `<Search>` exposes `mergeIndex` is unverified. | — |
| [Rspress](https://rspress.rs/guide/advanced/custom-search) | FlexSearch | Not verified | `onSearch` hooks add custom result sources. Versions live in **one** build, and `search.versioned` gives each version its own index ([multi-version](https://rspress.rs/guide/basic/multi-version)). | Per-version indexes within one build |
| [Fumadocs](https://fumadocs.dev/docs/ui/search) | Orama (static mode) | "Static Search requires clients to download the exported search indexes. For large docs sites, it can be expensive" ([orama.mdx](https://github.com/fuma-nama/fumadocs/blob/main/apps/docs/content/docs/headless/search/orama.mdx)) | One site's source. The search dialog is replaceable. | A `tag` field per entry, described as for "multi-docs" |

For every SSG, cross-section search in this setting comes down to option A, B or C running inside or alongside the generator. Starlight is the only one with option A in its config. With the others, the shared tooling either overrides the search component or runs Pagefind after the build.

## UX considerations

- **Default scope.** The cheapest search is a section searching only its own Docs Version: one bundle, no merges, and no copies of the same page from other Major Lines. Widening to "all Packages" is where merge costs and duplicates start.
- **Duplicate pages across Docs Versions.** Merging every Docs Version of a Package returns near-identical pages from, for example, `12.x` and `13.x`. Merging only each Package's newest Docs Version, with version filtering to widen, avoids that. It needs the runtime list to say which Docs Version is newest.
- **Labelling results.** Results from several Packages need a Package / Docs Version label. It can come from `data-pagefind-meta` on the shared layout ([metadata docs](https://pagefind.app/docs/metadata/)) or from the result URL's first two path segments.
- **Latency.** Merging costs 2 small requests per bundle before the first cross-Package query, plus a list fetch if the list is read at runtime. Deferring merges until the user widens the scope, or until search is opened, keeps them off page load. `preload()` / `debouncedSearch()` fetch chunks while the user types ([L918–940](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/lib/coupled_search.ts#L918-L940)).
- **Ranking feel.** Across bundles, a small Package (a one-page README) and a large one are scored on different statistics (see [Ranking across bundles](#ranking-across-bundles)). `indexWeight` or result grouping by Package are the levers. Option B scores everything together.
- **Degraded states.** One missing or stale bundle in the list can take down the Component UI's cross-Package search ([#887](https://github.com/Pagefind/pagefind/issues/887)). Per-bundle error handling in page code keeps the rest searchable.
- **UI and design fit.**
  - Pagefind 1.5's Component UI has keyboard navigation, better accessibility than the Default UI, custom templates and CSS variables ([v1.5.0 release](https://github.com/Pagefind/pagefind/releases/tag/v1.5.0)). That is relevant to extending plank.co's design ([#7](https://github.com/plank/docs/issues/7)).
  - Starlight's built-in search uses the older Default UI.
  - With the libraries in option C, the whole UI is the tooling's own code.

## Where this touches other tickets

- [#11](https://github.com/plank/docs/issues/11): a runtime list of sections is how options A and C learn about new Docs Versions without other sections rebuilding. The same manifest could serve the landing page, the version switcher, and search.
- [#3](https://github.com/plank/docs/issues/3): Pagefind's per-page fragment files count toward Cloudflare's per-deployment file limits. Where those limits bite depends on the deployment layout chosen there.
- [#8](https://github.com/plank/docs/issues/8): pinning one Pagefind version (and one search-UI script) in the shared build tooling is what keeps merged bundles compatible across Docs Versions deployed at different times.
