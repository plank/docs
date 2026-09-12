// @ts-nocheck
import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

// PROTOTYPE: a real Docs Version is its own build holding one Package, so its sidebar and prev/next
// only ever see that Package. This build holds two, so narrow both to the Package in the URL.
export const onRequest = defineRouteMiddleware((context) => {
	const route = context.locals.starlightRoute;
	const pkg = context.url.pathname.split('/')[1];
	const group = route.sidebar.find((e) => e.type === 'group' && e.label.toLowerCase() === pkg);
	if (!group) return;

	route.sidebar = group.entries;
	const links = flatten(group.entries);
	const i = links.findIndex((l) => l.isCurrent);
	route.pagination = {
		prev: i > 0 ? links[i - 1] : undefined,
		next: i >= 0 && i < links.length - 1 ? links[i + 1] : undefined,
	};
});

const flatten = (entries) => entries.flatMap((e) => (e.type === 'group' ? flatten(e.entries) : [e]));
