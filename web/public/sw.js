/* Sampacho Conecta — service worker.
 * - Archivos estáticos: primero caché.
 * - Páginas públicas elegidas (teléfonos, agenda, residuos, visitar): primero red, con copia para cuando no hay señal.
 * - Nunca se guardan reclamos, avisos personales, API ni páginas con sesión: solo las rutas de la lista PUBLIC.
 * - Avisos push: se muestran sin datos privados (el servidor ya envía mensajes genéricos para reclamos).
 */
const VERSION = "v2";
const STATIC = `sc-static-${VERSION}`;
const PAGES = `sc-pages-${VERSION}`;
const PUBLIC = ["/utiles", "/agenda", "/residuos", "/visitar", "/transparencia", "/privacidad"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(PAGES).then(async (c) => c.put("/offline", await fetch("/offline", { credentials: "omit" }))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC, PAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (e) => {
  // Al cambiar de usuario o cerrar sesión, se borran las páginas guardadas (equipos compartidos).
  if (e.data && e.data.type === "clear-pages") e.waitUntil(caches.delete(PAGES).then(() => caches.open(PAGES)).then(async (c) => c.put("/offline", await fetch("/offline", { credentials: "omit" }))));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.open(STATIC).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate") {
    const cacheable = PUBLIC.includes(url.pathname);
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (cacheable && res.ok && res.headers.get("X-Sampacho-Offline-Public") === "1") {
            const copy = res.clone();
            e.waitUntil(caches.open(PAGES).then((c) => c.put(req, copy)));
          }
          return res;
        })
        .catch(async () => (cacheable && (await caches.match(req))) || (await caches.match("/offline")) || Response.error()),
    );
  }
});

self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { title: "Sampacho Conecta", body: e.data ? e.data.text() : "" };
  }
  e.waitUntil(
    self.registration.showNotification(d.title || "Sampacho Conecta", {
      body: d.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: d.url || "/notificaciones" },
      requireInteraction: !!d.urgent,
      tag: d.url || undefined,
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/notificaciones";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.navigate(url).then((x) => x && x.focus());
      return self.clients.openWindow(url);
    }),
  );
});
