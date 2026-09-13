// PROTOTYPE for plank/docs#25 "How do code blocks look, and which syntax theme do they use?" — throwaway.
// Expressive Code's options live here, not in astro.config.mjs, because the landing page's <Code> component
// needs them and they hold functions (the theme selector, the plugins), which astro.config.mjs can't pass on.
import { defineEcConfig } from '@astrojs/starlight/expressive-code';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import { plankLight, plankDark, plankForest } from './src/code-themes.mjs';

// Which variant and theme each syntax theme answers to. B's forest is the same in light and dark.
const themeFor = {
	'plank-light': ['A', 'light'],
	'plank-dark': ['A', 'dark'],
	'plank-forest': ['B', null],
	'github-light': ['C', 'light'],
	'github-dark': ['C', 'dark'],
};

// Puts each block's language on its frame and header, so B and C can label it from CSS.
const pluginLanguageLabel = () => ({
	name: 'Prototype language label',
	hooks: {
		postprocessRenderedBlock: ({ codeBlock, renderData }) => {
			const tag = (node) => {
				if (node.type !== 'element') return;
				const cls = [node.properties?.className ?? []].flat();
				if (node === renderData.blockAst || cls.includes('header')) node.properties['data-lang'] = codeBlock.language;
				node.children?.forEach(tag);
			};
			tag(renderData.blockAst);
		},
	},
});

export default defineEcConfig({
	// The first theme is the base; each other one is scoped to its variant and theme by themeCssSelector.
	themes: [plankLight, plankDark, plankForest, 'github-light', 'github-dark'],
	themeCssSelector: (theme) => {
		const [v, t] = themeFor[theme.name] ?? [];
		if (!v) return false;
		return t ? `[data-variant='${v}'][data-theme='${t}']` : `[data-variant='${v}']`;
	},
	// Starlight's inline script always sets data-theme, so the system theme is read there, not here.
	useDarkModeMediaQuery: false,
	// Line numbers are rendered on every block; only C shows them (docs.css).
	plugins: [pluginLineNumbers(), pluginLanguageLabel()],
	styleOverrides: {
		borderRadius: '10px',
		codeFontFamily: 'var(--font-code)',
		frames: { editorActiveTabIndicatorTopColor: '#ff9375', editorActiveTabIndicatorHeight: '2px' },
	},
});
