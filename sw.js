const CACHE_NAME = "abonelik-takibi-v14";
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
  "./assets/logos/netflix.png",
  "./assets/logos/spotify.svg",
  "./assets/logos/spotify.png",
  "./assets/logos/youtube-premium.svg",
  "./assets/logos/youtube-premium.png",
  "./assets/logos/disney-plus.svg",
  "./assets/logos/disney-plus.png",
  "./assets/logos/amazon-prime.svg",
  "./assets/logos/amazon-prime.png",
  "./assets/logos/notion.svg",
  "./assets/logos/notion.png",
  "./assets/logos/apple-music.svg",
  "./assets/logos/apple-music.png",
  "./assets/logos/icloud.svg",
  "./assets/logos/icloud.png",
  "./assets/logos/google-one.svg",
  "./assets/logos/google-one.png",
  "./assets/logos/gemini.svg",
  "./assets/logos/gemini.png",
  "./assets/logos/figma.svg",
  "./assets/logos/figma.png",
  "./assets/logos/canva.svg",
  "./assets/logos/canva.png",
  "./assets/logos/chatgpt.svg",
  "./assets/logos/chatgpt.png",
  "./assets/logos/claude.svg",
  "./assets/logos/claude.png",
  "./assets/logos/adobe.svg",
  "./assets/logos/adobe.png",
  "./assets/logos/exxen.svg",
  "./assets/logos/exxen.png",
  "./assets/logos/blutv.svg",
  "./assets/logos/blutv.png",
  "./assets/logos/mubi.svg",
  "./assets/logos/mubi.png",
  "./assets/logos/xbox.svg",
  "./assets/logos/xbox.png",
  "./assets/logos/playstation.svg",
  "./assets/logos/playstation.png",
  "./assets/logos/github-copilot.svg",
  "./assets/logos/github-copilot.png",
  "./assets/logos/bitwarden.svg",
  "./assets/logos/bitwarden.png",
  "./assets/logos/onepassword.svg",
  "./assets/logos/onepassword.png",
  "./assets/logos/todoist.svg",
  "./assets/logos/todoist.png",
  "./assets/logos/medium.svg",
  "./assets/logos/medium.png",
  "./assets/logos/patreon.svg",
  "./assets/logos/patreon.png",
  "./assets/logos/microsoft365.svg",
  "./assets/logos/microsoft365.png",
  "./assets/logos/linkedin.svg",
  "./assets/logos/linkedin.png",
  "./assets/logos/trendyol.svg",
  "./assets/logos/trendyol.png",
  "./assets/logos/hepsiburada.svg",
  "./assets/logos/hepsiburada.png",
  "./assets/logos/ciceksepeti.svg",
  "./assets/logos/ciceksepeti.png",
  "./assets/logos/getir.svg",
  "./assets/logos/getir.png",
  "./assets/logos/yemeksepeti.svg",
  "./assets/logos/yemeksepeti.png",
  "./assets/logos/teknosa.svg",
  "./assets/logos/teknosa.png",
  "./assets/logos/mediamarkt.svg",
  "./assets/logos/mediamarkt.png",
  "./assets/logos/a101.svg",
  "./assets/logos/a101.png",
  "./assets/logos/migros.svg",
  "./assets/logos/migros.png",
  "./assets/logos/pazarama.svg",
  "./assets/logos/pazarama.png",
  "./assets/logos/boyner.svg",
  "./assets/logos/boyner.png",
  "./assets/logos/lcwaikiki.svg",
  "./assets/logos/lcwaikiki.png",
  "./assets/logos/defacto.svg",
  "./assets/logos/defacto.png",
  "./assets/logos/amazon-tr.svg",
  "./assets/logos/amazon-tr.png",
  "./assets/logos/n11.svg",
  "./assets/logos/n11.png",
  "./assets/logos/vodafone.svg",
  "./assets/logos/vodafone.png",
  "./assets/logos/turktelekom.svg",
  "./assets/logos/turktelekom.png",
  "./assets/logos/turkcell.svg",
  "./assets/logos/turkcell.png"
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
