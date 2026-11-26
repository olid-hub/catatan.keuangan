// Nyatet: service worker. Ubah V setiap rilis supaya HP mendeteksi versi baru.
const V = "3.1";
const CORE = "catatan-core-" + V, EXT = "catatan-ext";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CORE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("catatan-core-") && k !== CORE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
const timeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error("timeout")), ms))]);

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // file aplikasi: utamakan versi terbaru dari jaringan, cadangan dari cache (offline)
    e.respondWith((async () => {
      try {
        const res = await timeout(fetch(new Request(req.url, { cache: "no-cache" })), 4000);
        if (res && res.ok) { const c = await caches.open(CORE); c.put(req, res.clone()); }
        return res;
      } catch (_) {
        const hit = await caches.match(req, { ignoreSearch: true });
        if (hit) return hit;
        if (req.mode === "navigate") return (await caches.match("./index.html")) || Response.error();
        return Response.error();
      }
    })());
    return;
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith((async () => {
      const c = await caches.open(EXT), hit = await c.match(req);
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r }).catch(() => hit);
      return hit || net;
    })());
  }
});
