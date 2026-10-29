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
  "/js/donor-thanks.js",
  "/js/song-editor.js",
  "/favicon.ico",
  "/app logo.png",
  "/app.json",
  "/download.html",
  "/js/abaana.js",
  "/js/all-1.js",
  "/js/all.js",
  "/js/jquery.js",
  "/js/js.js",
  "/js/index-page.js",
  "/js/print.js",
  "/js/serFunction.js",
  "/js/share.js",
  "/js/swipe.js",
  "/js/try.js",
  "/data/children-songs.json",
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
  "/style/stylepay.css",
  "/style/home.css",
  "/style/donor-thanks.css",
  "/style/song-editor.css"
];

// The cache name is the version of the cached files. When it changes, the
// old cache is dropped, so a new version of the site is not served from the
// copy the browser kept from last time.
const CACHE_NAME = 'my-website-cache-v9';
const urlsToCache = ki;

// Files that decide who is signed in. These are fetched from the network
// first, so a new version is picked up straight away, with the cached copy
// only as a fallback when there is no connection.
const NETWORK_FIRST = ['/js/auth.js'];

function isApiRequest(pathname) {
  return pathname === '/api' || pathname.indexOf('/api/') === 0;
}

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.map(function(name) {
        if (name !== CACHE_NAME) {
          return caches.delete(name);
        }
      }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  const requestUrl = new URL(event.request.url);
  const pathname = requestUrl.pathname;

  // API answers, and anything that is not a plain GET, are never cached and
  // never served from the cache. A cached answer can be months out of date,
  // and a page served from the cache can show the wrong person signed in.
  if (event.request.method !== 'GET' || isApiRequest(pathname)) {
    return;
  }

  if (NETWORK_FIRST.indexOf(pathname) !== -1) {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(function() {
          return caches.open(CACHE_NAME).then(function(cache) {
            return cache.match(event.request);
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.match(event.request);
      })
      .then(function(response) {
        if (response) {
          return response;
        }

        // Modify the request URL to handle files in subdirectories
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
