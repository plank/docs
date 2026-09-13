// PROTOTYPE for plank/docs#25 "How do code blocks look, and which syntax theme do they use?" — throwaway.
// Syntax themes for variants A and B, drawn from plank.co's colour tokens (tokens.css). plank.co has no code,
// so every mapping here is the prototype's own. Expressive Code raises any token below 5.5:1 against the
// block's background, so these are starting colours, not final ones.

/** One scope list for every theme, so the variants differ only in colour. Covers PHP, Blade, shell, JSON, SQL. */
const tokenColors = (c) => [
	{ scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: c.comment, fontStyle: 'italic' } },
	{
		scope: [
			'keyword',
			'storage',
			'storage.type',
			'storage.modifier',
			'variable.language.this',
			'variable.language.this punctuation.definition.variable',
			'keyword.blade',
			'punctuation.definition.keyword',
			'entity.name.tag',
			'support.function.construct',
		],
		settings: { foreground: c.keyword },
	},
	{
		scope: [
			'keyword.operator',
			'punctuation',
			'meta.brace',
			'punctuation.definition.tag',
			'punctuation.separator',
			'punctuation.terminator',
		],
		settings: { foreground: c.punct },
	},
	{ scope: ['string', 'punctuation.definition.string', 'markup.inline.raw'], settings: { foreground: c.string } },
	{
		scope: ['constant.numeric', 'constant.language', 'support.constant', 'constant.other', 'constant.character'],
		settings: { foreground: c.number },
	},
	{ scope: ['variable', 'variable.other', 'punctuation.definition.variable'], settings: { foreground: c.variable } },
	{
		scope: [
			'variable.other.property',
			'variable.other.object.property',
			'support.type.property-name',
			'meta.object-literal.key',
			'entity.other.attribute-name',
		],
		settings: { foreground: c.property },
	},
	{
		scope: ['entity.name.function', 'support.function', 'entity.name.command', 'support.function.builtin'],
		settings: { foreground: c.fn },
	},
	{
		scope: ['entity.name.type', 'entity.name.class', 'support.class', 'entity.other.inherited-class', 'support.type'],
		settings: { foreground: c.type },
	},
	{
		scope: ['entity.name.namespace', 'support.other.namespace', 'punctuation.separator.inheritance'],
		settings: { foreground: c.ns },
	},
];

const theme = (name, type, ui, c) => ({
	name,
	type,
	colors: {
		'editor.background': ui.bg,
		'editor.foreground': c.fg,
		'editorLineNumber.foreground': c.comment,
		'editorGroupHeader.tabsBackground': ui.bar,
		'editorGroup.border': ui.rule,
		'tab.activeBackground': ui.bg,
		'tab.activeForeground': c.fg,
		'tab.border': ui.rule,
		'titleBar.activeBackground': ui.bar,
		'titleBar.activeForeground': c.comment,
		'titleBar.border': ui.rule,
		'terminal.background': ui.bg,
		'terminal.foreground': c.fg,
		'panel.border': ui.rule,
		'editor.selectionBackground': ui.select,
	},
	tokenColors: tokenColors(c),
});

/** A, light: plank.co's sand, with its teal, coral, blue and yellow deepened until they read on it. */
export const plankLight = theme(
	'plank-light',
	'light',
	{ bg: '#f0ede8', bar: '#e7e3dc', rule: '#dcd7cf', select: '#1f453b33' },
	{
		fg: '#112621',
		comment: '#66716c',
		keyword: '#0b6f6a',
		string: '#a3412a',
		number: '#7a5a00',
		variable: '#3a4d48',
		property: '#1f453b',
		fn: '#2553b8',
		type: '#7a5a00',
		ns: '#4f5c58',
		punct: '#5b6a65',
	},
);

/** A, dark: the same roles on Ink's code colour (plank/docs#19), with the brand colours at full strength. */
export const plankDark = theme(
	'plank-dark',
	'dark',
	{ bg: '#151a18', bar: '#191e1c', rule: '#2c3431', select: '#ff937540' },
	{
		fg: '#c9ceca',
		comment: '#7f8a86',
		keyword: '#5cc8bf',
		string: '#ff9375',
		number: '#ffc9b8',
		variable: '#e9ebe8',
		property: '#bfc9bd',
		fn: '#8fb4ff',
		type: '#fae370',
		ns: '#a2aba7',
		punct: '#8d9793',
	},
);

/** B, both themes: plank.co's forest, as on the landing page's composer band. Coral keywords, yellow strings. */
export const plankForest = theme(
	'plank-forest',
	'dark',
	{ bg: '#1f453b', bar: '#173630', rule: '#2b5449', select: '#ff937540' },
	{
		fg: '#eef1ed',
		comment: '#9fb5ad',
		keyword: '#ff9375',
		string: '#fae370',
		number: '#ffc9b8',
		variable: '#eef1ed',
		property: '#bfc9bd',
		fn: '#a9c6ff',
		type: '#8fe0d4',
		ns: '#bfc9bd',
		punct: '#a9bbb4',
	},
);
