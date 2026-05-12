self.addEventListener("install", (event) => {
  self.skipWaiting();
  console.log("Service Worker instalado");
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {});
