/**
 * Service worker for Web Push + PWA installability (fetch handler).
 * Push handlers show notifications; fetch passes through so the app stays installable.
 */
self.addEventListener("fetch", function (event) {
  event.respondWith(fetch(event.request));
});

self.addEventListener("push", function (event) {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }
  const title = payload.title || "New message";
  const body = payload.body || "";
  const url = payload.url || "/";
  const icon = payload.icon || "/icon-192.png";
  const badge = payload.badge || "/icon-192.png";
  const tag = payload.tag || undefined;
  const renotify = payload.renotify === true;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      renotify,
      // Keep mobile behavior predictable and similar to chat apps.
      requireInteraction: false,
      vibrate: [80, 40, 80],
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  const fullUrl = url.startsWith("/") ? self.location.origin + url : url;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && "focus" in client) {
          if ("navigate" in client) {
            return client.navigate(fullUrl).then(function (c) {
              return c ? c.focus() : client.focus();
            });
          }
          client.focus();
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullUrl);
      }
    })
  );
});
