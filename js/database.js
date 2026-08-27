var DB_NAME = "radarBrDatabase";
var DB_VERSION = 1;
var DB_STORE = "radars";

function databaseOpen(callback) {
  if (!window.indexedDB) {
    callback(new Error("IndexedDB não disponível"));
    return;
  }

  var request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = function(event) {
    var db = event.target.result;

    if (!db.objectStoreNames.contains(DB_STORE)) {
      db.createObjectStore(DB_STORE, { keyPath: "id" });
    }
  };

  request.onsuccess = function(event) {
    callback(null, event.target.result);
  };

  request.onerror = function() {
    callback(new Error("Erro ao abrir IndexedDB"));
  };
}

function databaseSaveRadars(radars, callback) {
  databaseOpen(function(error, db) {
    var tx;
    var store;
    var i;

    if (error) {
      callback(error);
      return;
    }

    tx = db.transaction([DB_STORE], "readwrite");
    store = tx.objectStore(DB_STORE);
    store.clear();

    for (i = 0; i < radars.length; i++) {
      store.put(radars[i]);
    }

    tx.oncomplete = function() {
      db.close();
      callback(null);
    };

    tx.onerror = function() {
      db.close();
      callback(new Error("Erro ao salvar radares"));
    };
  });
}

function databaseLoadRadars(callback) {
  databaseOpen(function(error, db) {
    var tx;
    var store;
    var request;

    if (error) {
      callback(error);
      return;
    }

    tx = db.transaction([DB_STORE], "readonly");
    store = tx.objectStore(DB_STORE);
    request = store.getAll();

    request.onsuccess = function() {
      db.close();
      callback(null, request.result || []);
    };

    request.onerror = function() {
      db.close();
      callback(new Error("Erro ao carregar radares"));
    };
  });
}
