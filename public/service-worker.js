const ki = [
  "/songs.html",
  "https://sql.js.org/dist/sql-wasm.wasm",
  "https://sql.js.org/dist/sql-wasm.js",
  "https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus/acoustic_grand_piano/p67_v95.mp3",
  "https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus/pad_4_choir/p55_v95.mp3",
  "/",
  "/index.html",
  "/src/images/step1.jpg",
  "/src/images/step2.jpg",
  "/src/images/step3.jpg",
  "/src/images/step4.jpg",
  "/src/images/step5.jpg",
  "/js/serv.js",
  "/favicon.ico",
  "/app logo.png",
  "/app.json",
  "/download.html",
  "/js/abaana.js",
  "/js/all-1.js",
  "/js/all.js",
  "/js/jquery.js",
  "/js/js.js",
  "/js/print.js",
  "/js/serFunction.js",
  "/js/share.js",
  "/js/swipe.js",
  "/js/try.js",
  "/midi/min-midi-player.js",
  "/midi/Play all.html",
  "/sidelogo.png",
  "/src/images/app.png",
  "/src/images/icon.jpg",
  "/src/images/mainlogo.png",
  "/src/index.html",
  "/src/menu.html",
  "/src/pages/abaana.html",
  "/src/pages/abaana1.html",
  "/src/pages/agree.html",
  "/src/pages/mpagila.html",
  "/style/style.css",
  "/style/styleAbaana.css",
  "/style/stylem.css",
  "/style/styleorg1.css",
  "/style/stylepay.css"
];

const CACHE_NAME = 'my-website-cache-v1';
const urlsToCache = ki;

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }

        // Modify the request URL to handle files in subdirectories
        const requestUrl = new URL(event.request.url);
        const pathname = requestUrl.pathname;

        // Check if the requested file is in the cache
        return caches.open(CACHE_NAME)
          .then(function(cache) {
            return cache.match(pathname);
          })
          .then(function(cachedResponse) {
            if (cachedResponse) {
              return cachedResponse;
            }

            // If the requested file is not in cache, fetch it from the network
            return fetch(event.request)
              .then(function(networkResponse) {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                  return networkResponse;
                }

                // Cache the fetched file for future use
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then(function(cache) {
                    cache.put(event.request, responseToCache);
                  });

                return networkResponse;
              });
          });
      })
  );
});