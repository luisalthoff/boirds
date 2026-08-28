var APP_VERSION = "0.2.1";
var CACHE_NAME = "radar-br-app-" + APP_VERSION;

var APP_FILES = [
  "./",
  "index.html",
  "manifest.json",
  "version.json",
  "css/style.css",
  "js/helper.js",
  "js/database.js",
  "js/alert.js",
  "js/radar.js",
  "js/gps.js",
  "js/update.js",
  "js/app.js",
  "img/tb-192.png",
  "img/tb-512.png"
];

self.addEventListener("install", function(event) {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_FILES);
    })
  );
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys()
      .then(function(keys) {
        return Promise.all(
          keys.map(function(key) {
            if (key.indexOf("radar-br-app-") === 0 && key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
      .then(function() {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", function(event) {
  var request = event.request;
  var url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  // Radar database updates must never come from the app cache.
  if (url.pathname.indexOf("/data/radars.json") !== -1) {
    event.respondWith(fetch(request));
    return;
  }

  // HTML navigation: network first, cache fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(function(response) {
          var copy = response.clone();

          caches.open(CACHE_NAME).then(function(cache) {
            cache.put("index.html", copy);
          });

          return response;
        })
        .catch(function() {
          return caches.match("index.html");
        })
    );

    return;
  }

  // Static application files: cache first.
  event.respondWith(
    caches.match(request).then(function(cached) {
      if (cached) {
        return cached;
      }

      return fetch(request).then(function(response) {
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }

        var copy = response.clone();

        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(request, copy);
        });

        return response;
      });
    })
  );
});
