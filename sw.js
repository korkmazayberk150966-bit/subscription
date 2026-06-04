const CACHE_NAME = "abonelik-takibi-v12";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./data/catalog.json",
  "./assets/fonts/HankenGrotesk-Regular.ttf",
  "./assets/fonts/HankenGrotesk-Bold.ttf",
  "./assets/fonts/SourceSerif4-Regular.ttf",
  "./assets/fonts/SourceSerif4-Bold.ttf",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-192-maskable.png",
  "./assets/icons/icon-512-maskable.png",
  "./assets/icons/apple-touch-icon-180.png",
  "./assets/icons/akce-source-logo.png",
  "./assets/icons/icon.svg",
  "./assets/icons/icon-maskable.svg",
  "./assets/logos/netflix.svg",
  "./assets/logos/spotify.svg",
  "./assets/logos/youtube-premium.svg",
  "./assets/logos/disney-plus.svg",
  "./assets/logos/amazon-prime.svg",
  "./assets/logos/notion.svg",
  "./assets/logos/apple-music.svg",
  "./assets/logos/icloud.svg",
  "./assets/logos/google-one.svg",
  "./assets/logos/gemini.svg",
  "./assets/logos/figma.svg",
  "./assets/logos/canva.svg",
  "./assets/logos/chatgpt.svg",
  "./assets/logos/chatgpt.png",
  "./assets/logos/claude.svg",
  "./assets/logos/adobe.svg",
  "./assets/logos/exxen.svg",
  "./assets/logos/blutv.svg",
  "./assets/logos/mubi.svg",
  "./assets/logos/xbox.svg",
  "./assets/logos/playstation.svg",
  "./assets/logos/github-copilot.svg",
  "./assets/logos/bitwarden.svg",
  "./assets/logos/onepassword.svg",
  "./assets/logos/todoist.svg",
  "./assets/logos/medium.svg",
  "./assets/logos/patreon.svg",
  "./assets/logos/microsoft365.svg",
  "./assets/logos/linkedin.svg",
  "./assets/logos/trendyol.svg",
  "./assets/logos/hepsiburada.svg",
  "./assets/logos/ciceksepeti.svg",
  "./assets/logos/getir.svg",
  "./assets/logos/yemeksepeti.svg",
  "./assets/logos/teknosa.svg",
  "./assets/logos/mediamarkt.svg",
  "./assets/logos/a101.svg",
  "./assets/logos/migros.svg",
  "./assets/logos/pazarama.svg",
  "./assets/logos/boyner.svg",
  "./assets/logos/lcwaikiki.svg",
  "./assets/logos/defacto.svg",
  "./assets/logos/amazon-tr.svg",
  "./assets/logos/n11.svg",
  "./assets/logos/vodafone.svg",
  "./assets/logos/turktelekom.svg",
  "./assets/logos/turkcell.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const focused = clientList.find((client) => "focus" in client);
      if (focused) {
        return focused.focus();
      }
      if (clients.openWindow) {
        return clients.openWindow("./");
      }
      return undefined;
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return cached;
        });
    })
  );
});
