/* No-op service worker — satisfies /sw.js probes (extensions, devtools) without enabling PWA caching. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
