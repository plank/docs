// Each Docs Version's path prefix, and the Service binding to its Worker.
const DOCS_VERSIONS = {
  '/snapshots/13.x': 'SNAPSHOTS_13X',
};

// Where a Package's bare path sends readers: its newest Docs Version.
const NEWEST = {
  '/snapshots': '/snapshots/13.x/',
};

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '');

  if (NEWEST[path]) {
    return Response.redirect(new URL(NEWEST[path], url), 302);
  }

  for (const [prefix, binding] of Object.entries(DOCS_VERSIONS)) {
    if (path === prefix || url.pathname.startsWith(prefix + '/')) {
      if (env.FORWARD === 'fetch') {
        const origin = env[binding + '_ORIGIN'];
        return fetch(new Request(origin + url.pathname + url.search, request));
      }
      return env[binding].fetch(request);
    }
  }

  return next();
}
