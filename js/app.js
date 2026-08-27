function appInit() {
  document.getElementById("btnStart").addEventListener("click", function() {
    if (gpsWatchId === null) {
      gpsStart();
    } else {
      gpsStop();
    }
  });

  document.getElementById("btnUpdate").addEventListener("click", updateRadars);

  databaseLoadRadars(function(error, list) {
    if (error) {
      appSetMessage(error.message);
      return;
    }

    radarSetList(list);
    appUpdateDatabaseStatus(list.length);

    if (list.length === 0) {
      appSetMessage("Base vazia. Toque em ATUALIZAR RADARES.");
    } else {
      appSetMessage("Pronto.");
    }
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function() {
      navigator.serviceWorker.register("sw.js");
    });
  }
}

function appSetMessage(text) {
  document.getElementById("message").textContent = text;
}

function appUpdateDatabaseStatus(count) {
  var updatedAt = localStorage.getItem("radarDatabaseUpdatedAt");
  var text = "Base: " + count + " radares";

  if (updatedAt) {
    text += " • " + helperFormatDateTime(updatedAt);
  }

  document.getElementById("dbStatus").textContent = text;
}

function appGpsStarted() {
  document.getElementById("btnStart").textContent = "PARAR GPS";
  document.getElementById("gpsStatus").textContent = "GPS: ativo";
}

function appGpsStopped() {
  document.getElementById("btnStart").textContent = "INICIAR GPS";
  document.getElementById("gpsStatus").textContent = "GPS: parado";
  document.getElementById("speedValue").textContent = "--";
  appShowRadar(null);
}

function appGpsUpdate(position) {
  var speedText = "--";

  if (typeof position.speed === "number") {
    speedText = Math.round(position.speed);
  }

  document.getElementById("speedValue").textContent = speedText;
  document.getElementById("gpsStatus").textContent =
    "GPS: ±" + Math.round(position.accuracy) + " m";
}

function appShowRadar(result) {
  var panel = document.getElementById("radarPanel");
  var app = document.getElementById("app");

  if (!result) {
    panel.className = "hidden";
    app.className = "";
    return;
  }

  panel.className = "";
  document.getElementById("radarLimit").textContent = result.radar.speed;
  document.getElementById("radarDistance").textContent =
    Math.max(0, Math.round(result.distance)) + " m";
  document.getElementById("radarRoad").textContent =
    (result.radar.road || "") +
    (result.radar.state ? " • " + result.radar.state : "");

  if (typeof result.radar.speed === "number") {
    app.className = "warning";
  }
}

document.addEventListener("DOMContentLoaded", appInit);
