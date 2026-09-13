// @ts-check
// PROTOTYPE for plank/docs#19 "Does the Docs Site have a dark mode, and what does it look like?" — throwaway.
// Built on the plank/docs#7 prototype. Three dark palettes for the chosen landing page (B) and doc page (A),
// switchable via ?variant=A|B|C on `/` and on every doc page. One build holds two Packages' 13.x docs;
// a real Docs Version is one Package, one build.
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const pub = (path) => `publisher/13.x/${path}`;

export default defineConfig({
	// Keep Astro's toolbar out from under the prototype's variant bar.
	devToolbar: { enabled: false },
	integrations: [
		starlight({
			title: 'Plank Packages',
			customCss: [
				'@fontsource-variable/newsreader/opsz.css',
				'@fontsource-variable/instrument-sans',
				'./src/styles/tokens.css',
				'./src/styles/docs.css',
			],
			components: {
				Head: './src/components/Head.astro',
				Header: './src/components/Header.astro',
				Sidebar: './src/components/Sidebar.astro',
			},
			routeMiddleware: './src/routeData.ts',
			expressiveCode: {
				themes: ['vitesse-light', 'vitesse-dark'],
				styleOverrides: { borderRadius: '10px', codeFontFamily: 'var(--font-code)' },
			},
			// Publisher's order comes from its own docs/README.md index.
			sidebar: [
				{
					label: 'Publisher',
					items: [
						{ label: 'Overview', slug: 'publisher/13.x' },
						{ label: 'Guides', items: [pub('guides/installation'), pub('guides/core-concepts')] },
						{
							label: 'Traits',
							items: [
								pub('traits/is-publishable'),
								pub('traits/has-publishable-pivot-attributes'),
								pub('traits/interacts-with-publishable-content'),
							],
						},
						{
							label: 'Features',
							items: [
								pub('features/draft-management'),
								pub('features/publishing-workflow'),
								pub('features/publishable-relationships'),
								pub('features/dependent-models'),
								pub('features/events'),
								pub('features/querying'),
								pub('features/middleware'),
								pub('features/url-rewriting'),
								pub('features/authorization'),
							],
						},
						{
							label: 'Advanced',
							items: [
								pub('advanced/custom-workflow-states'),
								pub('advanced/schema-conflicts'),
								pub('advanced/custom-pivot-models'),
								pub('advanced/admin-panel-integration'),
								pub('advanced/plank-ecosystem'),
							],
						},
					],
				},
				{ label: 'Snapshots', items: [{ label: 'Overview', slug: 'snapshots/13.x' }] },
			],
		}),
	],
});
