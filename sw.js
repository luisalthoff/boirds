var CACHE_NAME = "radar-br-app-v0.5.3";
var CACHE_PREFIX = "radar-br-app";

var APP_FILES = [
  "./",
  "index.html",
  "manifest.json",
  "version.json",
  "data/radars.json",
  "css/style.css",
  "js/helper.js",
  "js/database.js",
  "js/alert.js",
  "js/radar.js",
  "js/gps.js",
  "js/update.js",
  "js/app.js",
  "img/tb-192.png",
  "img/tb-512.png",
  "img/sT.svg",
  "img/s+.svg",
  "img/s-.svg",
  "audio/30.mp3",
  "audio/40.mp3",
  "audio/60.mp3",
  "audio/80.mp3",
  "audio/90.mp3",
  "audio/100.mp3",
  "audio/110.mp3",
  "audio/120.mp3"
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
            if (key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_NAME) {
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

  // App files: network first so a newly deployed GitHub Pages version is
  // picked up automatically. If offline, use the last cached copy.
  event.respondWith(
    fetch(request)
      .then(function(response) {
        if (response && response.status === 200 && response.type !== "opaque") {
          var copy = response.clone();

          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(request, copy);
          });
        }

        return response;
      })
      .catch(function() {
        return caches.match(request).then(function(cached) {
          if (cached) {
            return cached;
          }

          if (request.mode === "navigate") {
            return caches.match("index.html");
          }
        });
      })
  );
});
