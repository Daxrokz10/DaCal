/* Service worker — stale-while-revalidate.

   Every request is answered from cache immediately (so the app opens
   instantly and works with no signal), while a fresh copy is fetched in
   the background and stored for next time. A deploy therefore reaches an
   installed phone by itself, at most one launch late, with no version
   number to remember to bump.

   That is the whole reason for this strategy. A cache-first worker is
   faster to write but pins the app to whatever was cached on install,
   which means every deploy needs a manual cache-name bump — and the one
   time you forget, you are debugging a phone running last month's code.

   The sync API is a different origin and is never touched here: it must
   always hit the network, and its responses must never be cached. */

const CACHE = "plate";
const SHELL = ["./", "index.html", "styles.css", "data.js", "sync.js", "app.js",
               "manifest.webmanifest", "icon.svg", "icon-maskable.svg"];

const isFontHost = h => h.endsWith("googleapis.com") || h.endsWith("gstatic.com");

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const mine = url.origin === location.origin;
  if (!mine && !isFontHost(url.hostname)) return;   // the API, and anything else, goes straight to the network

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);

    const fresh = fetch(req).then(res => {
      // only store a real answer — an error page cached is an error page forever
      if (res && res.ok && (res.type === "basic" || res.type === "cors" || res.type === "opaque")) {
        cache.put(req, res.clone()).catch(() => {});
      }
      return res;
    }).catch(() => null);

    if (hit) return hit;                       // instant, and refreshed behind us

    const res = await fresh;
    if (res) return res;

    // offline and never cached: for a page request, the app shell still works
    if (req.mode === "navigate") {
      const shell = await cache.match("index.html");
      if (shell) return shell;
    }
    return new Response("", { status: 504, statusText: "offline" });
  })());
});
