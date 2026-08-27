var CACHE_NAME = "radar-br-v1";

var APP_FILES = [
  "./",
  "index.html",
  "manifest.json",
  "css/style.css",
  "js/helper.js",
  "js/database.js",
  "js/alert.js",
  "js/radar.js",
  "js/gps.js",
  "js/update.js",
  "js/app.js",
  "data/radars.json"
];

self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_FILES);
    })
  );
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", function(event) {
  var url = new URL(event.request.url);

  if (url.pathname.indexOf("/data/radars.json") !== -1) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});
