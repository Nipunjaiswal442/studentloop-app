// StudentLoop service worker: lets the home-screen app open without a
// connection and keeps the build's files on the device.
//
// - Page loads always go to the network first, so a new deploy shows up at
//   once. The latest copy of the app shell is kept for when there's no network.
// - Files under /assets have a content hash in their name and never change, so
//   they're served from the cache once fetched. Icons and the manifest are too,
//   and refreshed in the background.
// - Anything on another origin (Convex, Firebase, Google Fonts) and anything
//   but GET is left alone.
//
// Bump VERSION when this file's caching changes; activate deletes old caches.
const VERSION = "v2";
const SHELL_CACHE = `studentloop-shell-${VERSION}`;
const STATIC_CACHE = `studentloop-static-${VERSION}`;
const SHELL_URL = "/index.html";
// Old builds' hashed files pile up across deploys; keep the newest this many.
const MAX_STATIC_ENTRIES = 150;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const response = await fetch(SHELL_URL, { cache: "reload" });
      if (!response.ok) throw new Error(`Couldn't fetch ${SHELL_URL}: ${response.status}`);
      await keepShell(response);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const current = [SHELL_CACHE, STATIC_CACHE];
      const old = (await caches.keys()).filter((name) => name.startsWith("studentloop-") && !current.includes(name));
      await Promise.all(old.map((name) => caches.delete(name)));
      // Starts page requests while the worker boots, so network-first costs nothing extra.
      await self.registration.navigationPreload?.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(event));
  } else if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(event, false));
  } else if (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.svg" ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(cacheFirst(event, true));
  }
});

async function networkFirst(event) {
  try {
    const response = (await event.preloadResponse) ?? (await fetch(event.request));
    if (isShell(response)) event.waitUntil(keepShell(response.clone()));
    return response;
  } catch {
    // Offline: the app shell boots and shows the app's own loading state.
    const cached = await caches.match(SHELL_URL, { cacheName: SHELL_CACHE });
    return cached ?? Response.error();
  }
}

/** `refresh`: also update the cached copy in the background (for files without a hash). */
async function cacheFirst(event, refresh) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(event.request);
  if (cached && !refresh) return cached;
  const update = fetch(event.request)
    // A file missing mid-deploy gets a 404 with the build files' year-long cache
    // header, and the browser keeps it. If the file is back (a rollback), only
    // a request past the browser's cache finds it.
    .then((response) => (response.ok ? response : fetch(event.request, { cache: "reload" })))
    .then(async (response) => {
      if (isFile(response)) {
        await cache.put(event.request, response.clone());
        await trim(cache);
      }
      return response;
    });
  if (!cached) return update;
  event.waitUntil(update.catch(() => {}));
  return cached;
}

// A host that answers a missing file with the app page (an SPA fallback) must
// not get that page stored, and later served, in place of a script or icon.
function isFile(response) {
  return (
    response.ok &&
    response.type === "basic" &&
    !(response.headers.get("content-type") ?? "").includes("text/html")
  );
}

// Every route serves index.html; a redirect or a non-HTML file opened directly must not replace it.
function isShell(response) {
  return (
    response.ok &&
    response.type === "basic" &&
    !response.redirected &&
    (response.headers.get("content-type") ?? "").includes("text/html")
  );
}

/**
 * Saves the shell, plus the script and styles it loads straight away: the page
 * that first registered this worker fetched those before it was running, and
 * without them the shell can't start offline.
 */
async function keepShell(response) {
  const html = await response.clone().text();
  // Some other HTML page (e.g. a proxied sign-in handler) must not become the shell.
  if (!html.includes('<div id="root">')) return;
  const shell = await caches.open(SHELL_CACHE);
  await shell.put(SHELL_URL, response);
  const files = await caches.open(STATIC_CACHE);
  const entry = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  await Promise.all(
    entry.map(async (path) => {
      if (await files.match(path)) return;
      const response = await fetch(path).catch(() => null);
      if (response && isFile(response)) await files.put(path, response);
    }),
  );
  await trim(files);
}

async function trim(cache) {
  const keys = await cache.keys();
  // keys() lists entries oldest first.
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_STATIC_ENTRIES)).map((key) => cache.delete(key)));
}
