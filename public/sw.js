// Homosocial service worker: push notifications only. Pages stay live from the network.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let n = { title: "Homosocial", body: "", url: "https://homosocial.net/circle" };
  try {
    n = { ...n, ...e.data.json() };
  } catch {}
  e.waitUntil(
    self.registration.showNotification(n.title, {
      body: n.body,
      icon: "/icon-192.png",
      badge: "/badge-96.png",
      tag: n.tag || undefined,
      renotify: !!n.tag,
      data: { url: n.url },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "https://homosocial.net/circle";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
